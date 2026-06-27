const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 5174);
const DEFAULT_ENGINE_CANDIDATES = [
  process.env.PIKAFISH_ENGINE,
  path.join(ROOT, "src", "pikafish.exe"),
  path.join(ROOT, "src", "pikafish"),
  path.join(ROOT, "pikafish.exe"),
  path.join(ROOT, "pikafish")
].filter(Boolean);
const DEFAULT_ENGINE_THREADS = clampOptionNumber(process.env.PIKAFISH_THREADS, Math.max(1, Math.min(2, cpuCount())), 1, 16);
const DEFAULT_ENGINE_HASH_MB = clampOptionNumber(process.env.PIKAFISH_HASH_MB, 128, 16, 1024);

let configuredEnginePath = DEFAULT_ENGINE_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || "";
let buildJob = null;
let downloadJob = null;

function cpuCount() {
  try {
    if (typeof os.availableParallelism === "function") return os.availableParallelism();
  } catch {}
  try {
    return os.cpus()?.length || 1;
  } catch {
    return 1;
  }
}

function clampOptionNumber(value, fallback, min, max) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : fallback;
  return Math.max(min, Math.min(max, Math.round(safe)));
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function corsPreflight(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

class UciEngine {
  constructor(enginePath) {
    this.enginePath = enginePath;
    this.proc = null;
    this.buffer = "";
    this.recentOutput = "";
    this.waiters = [];
    this.searching = false;
    this.ready = false;
    this.bootPromise = null;
    this.queue = Promise.resolve();
  }

  async ensureStarted() {
    if (!this.enginePath || !fs.existsSync(this.enginePath)) {
      throw new Error("Chưa tìm thấy engine. Đặt biến PIKAFISH_ENGINE hoặc cấu hình đường dẫn .exe trong giao diện.");
    }
    if (this.proc && !this.proc.killed && this.ready) return;
    if (this.bootPromise) return this.bootPromise;

    this.bootPromise = new Promise((resolve, reject) => {
      const proc = spawn(this.enginePath, [], { cwd: path.dirname(this.enginePath), stdio: "pipe" });
      this.proc = proc;
      this.ready = false;
      this.buffer = "";
      this.recentOutput = "";
      this.waiters = [];

      const failBoot = (message) => {
        this.bootPromise = null;
        reject(new Error(message));
      };

      proc.stdout.setEncoding("utf8");
      proc.stdout.on("data", (chunk) => this.onData(chunk));
      proc.stderr.setEncoding("utf8");
      proc.stderr.on("data", (chunk) => this.onData(chunk));
      proc.on("error", (err) => failBoot(err.message));
      proc.on("exit", (code) => {
        this.ready = false;
        this.proc = null;
        const waiters = this.waiters.splice(0);
        waiters.forEach((waiter) => waiter.reject(new Error(`Engine đã thoát với mã ${code}`)));
      });

      this.waitFor((line) => line === "uciok", 8000)
        .then(() => {
          this.write(`setoption name Threads value ${DEFAULT_ENGINE_THREADS}`);
          this.write(`setoption name Hash value ${DEFAULT_ENGINE_HASH_MB}`);
          return this.command("isready", (line) => line === "readyok", 8000);
        })
        .then(() => {
          this.ready = true;
          this.bootPromise = null;
          resolve();
        })
        .catch((err) => failBoot(err.message));

      this.write("uci");
    });

    return this.bootPromise;
  }

  write(command) {
    if (!this.proc || !this.proc.stdin.writable) {
      throw new Error("Engine chưa sẵn sàng");
    }
    this.proc.stdin.write(`${command}\n`);
  }

  onData(chunk) {
    this.recentOutput = `${this.recentOutput}${chunk}`.slice(-4000);
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const waiters = [...this.waiters];
      for (const waiter of waiters) waiter.onLine(trimmed);
    }
  }

  waitFor(match, timeoutMs = 10000, collect = false) {
    return new Promise((resolve, reject) => {
      const lines = [];
      const waiter = {
        onLine: (line) => {
          if (collect) lines.push(line);
          if (match(line, lines)) {
            clearTimeout(timer);
            this.waiters = this.waiters.filter((item) => item !== waiter);
            resolve(collect ? lines : line);
          }
        },
        reject
      };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((item) => item !== waiter);
        reject(new Error("Engine phản hồi quá lâu"));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  command(command, match, timeoutMs = 10000, collect = false) {
    const promise = this.waitFor(match, timeoutMs, collect);
    this.write(command);
    return promise;
  }

  async analyze(request) {
    const run = () => this.runAnalyze(request);
    const queued = this.queue.then(run, run);
    this.queue = queued.catch(() => {});
    return queued;
  }

  async runAnalyze({ fen = "", moves = [], depth = 12, movetime = 0, multipv = 3 }) {
    await this.ensureStarted();
    if (this.searching) throw new Error("Engine đang phân tích, thử lại sau một nhịp.");
    this.searching = true;
    try {
      const safeMoves = moves.filter((move) => /^[a-i][0-9][a-i][0-9]$/.test(move));
      const safeFen = sanitizeFen(fen);
      const safeDepth = Math.max(1, Math.min(30, Number(depth) || 12));
      const safeTime = Math.max(0, Math.min(60000, Number(movetime) || 0));
      const safeMultiPv = Math.max(1, Math.min(5, Number(multipv) || 3));
      this.write(`setoption name MultiPV value ${safeMultiPv}`);
      await this.command("isready", (line) => line === "readyok", 8000);
      this.write(safeFen ? `position fen ${safeFen}` : `position startpos${safeMoves.length ? ` moves ${safeMoves.join(" ")}` : ""}`);
      const go = safeTime > 0 ? `go movetime ${safeTime}` : `go depth ${safeDepth}`;
      const lines = await this.command(go, (line) => line.startsWith("bestmove "), Math.max(15000, safeTime + 5000), true);
      return parseSearch(lines);
    } finally {
      this.searching = false;
    }
  }

  stop() {
    if (this.proc && !this.proc.killed) {
      this.write("quit");
    }
  }
}

function sanitizeFen(fen) {
  const value = String(fen || "").trim();
  if (!value) return "";
  if (!/^[1-9kabnrcpKABNRCP/]+ [wb](?: [-a-zA-Z0-9]+){4}$/.test(value)) {
    throw new Error("Invalid analysis FEN");
  }
  return value;
}

function parseSearch(lines) {
  const pvByIndex = new Map();
  let bestMove = "";
  let ponder = "";
  for (const line of lines) {
    if (line.startsWith("info ") && line.includes(" pv ")) {
      const multipv = Number(readToken(line, "multipv") || 1);
      pvByIndex.set(multipv, {
        multipv,
        depth: Number(readToken(line, "depth") || 0),
        scoreType: readToken(line, "score") || "",
        score: readScore(line),
        nodes: Number(readToken(line, "nodes") || 0),
        nps: Number(readToken(line, "nps") || 0),
        time: Number(readToken(line, "time") || 0),
        pv: line.slice(line.indexOf(" pv ") + 4).trim().split(/\s+/)
      });
    }
    if (line.startsWith("bestmove ")) {
      const parts = line.split(/\s+/);
      bestMove = parts[1] || "";
      ponder = parts[3] || "";
    }
  }
  return {
    ok: true,
    bestMove,
    ponder,
    lines: [...pvByIndex.values()].sort((a, b) => a.multipv - b.multipv)
  };
}

function readToken(line, token) {
  const parts = line.split(/\s+/);
  const index = parts.indexOf(token);
  return index >= 0 ? parts[index + 1] : "";
}

function readScore(line) {
  const parts = line.split(/\s+/);
  const index = parts.indexOf("score");
  if (index < 0) return "";
  return `${parts[index + 1] || ""} ${parts[index + 2] || ""}`.trim();
}

let engine = new UciEngine(configuredEnginePath);

function refreshEnginePath() {
  if (configuredEnginePath && fs.existsSync(configuredEnginePath)) return configuredEnginePath;
  configuredEnginePath = DEFAULT_ENGINE_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || configuredEnginePath;
  return configuredEnginePath;
}

function syncEngineInstance() {
  const previous = engine.enginePath;
  refreshEnginePath();
  if (configuredEnginePath !== previous) {
    engine.stop();
    engine = new UciEngine(configuredEnginePath);
  }
}

function runLoggedProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const log = [];
    const child = spawn(command, args, { ...options, shell: false });
    const push = (chunk) => {
      const text = chunk.toString();
      log.push(text);
      if (log.join("").length > 20000) log.splice(0, log.length - 20);
    };
    child.stdout.on("data", push);
    child.stderr.on("data", push);
    child.on("error", (err) => resolve({ ok: false, code: -1, log: err.message }));
    child.on("exit", (code) => resolve({ ok: code === 0, code, log: log.join("") }));
  });
}

async function buildEngine() {
  if (buildJob) return buildJob;
  buildJob = runLoggedProcess(process.execPath, [path.join(__dirname, "build-engine-win.js")], { cwd: ROOT })
    .then((result) => {
      refreshEnginePath();
      engine.stop();
      engine = new UciEngine(configuredEnginePath);
      return { ...result, enginePath: configuredEnginePath, exists: Boolean(configuredEnginePath && fs.existsSync(configuredEnginePath)) };
    })
    .finally(() => {
      buildJob = null;
    });
  return buildJob;
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlink(destination, () => {});
        downloadFile(response.headers.location, destination).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destination, () => {});
        reject(new Error(`Download failed with HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      file.close();
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("http://") ? http : https;
    client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchText(response.headers.location).then(resolve, reject);
        return;
      }
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
        if (body.length > 1024 * 1024) response.destroy(new Error("Response is too large"));
      });
      response.on("end", () => {
        if (response.statusCode === 200) resolve(body);
        else reject(new Error(`Cloud database returned HTTP ${response.statusCode}`));
      });
    }).on("error", reject);
  });
}

async function queryCloudBook(board) {
  const query = `chessdb.php?action=queryall&learn=1&showall=1&board=${encodeURIComponent(board)}`;
  const endpoints = [
    `https://www.chessdb.cn/${query}`,
    `http://www.chessdb.cn/${query}`,
    `https://chessdb.vn/${query}`,
    `https://www.chessdb.vn/${query}`
  ];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const parsed = parseCloudBook(await fetchText(endpoint));
      if (parsed.moves.length || parsed.status !== "unknown") {
        return { ...parsed, endpoint };
      }
      lastError = new Error("Cloud database returned no moves");
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Cloud database is unavailable");
}

function parseCloudBook(text) {
  const clean = trimNull(String(text || "").trim());
  if (!clean || /unknown/i.test(clean)) return { ok: true, status: "unknown", moves: [] };
  if (/invalid/i.test(clean)) return { ok: false, status: "invalid", moves: [] };
  if (/checkmate/i.test(clean)) return { ok: true, status: "checkmate", moves: [] };
  if (/stalemate/i.test(clean)) return { ok: true, status: "stalemate", moves: [] };
  const moves = clean.split("|").map((part) => {
    const entry = {};
    part.split(",").forEach((field) => {
      const index = field.indexOf(":");
      if (index > 0) entry[field.slice(0, index)] = field.slice(index + 1);
    });
    return {
      move: entry.move || "",
      score: Number(entry.score),
      rank: entry.rank || "",
      note: entry.note || entry.winrate || "",
      raw: part
    };
  }).filter((entry) => /^[a-i][0-9][a-i][0-9]$/.test(entry.move) && Number.isFinite(entry.score));
  return { ok: true, status: "ok", moves: isZeroOnlyCloudNoise(moves) ? [] : moves };
}

function isZeroOnlyCloudNoise(moves) {
  if (!moves.length) return false;
  return moves.every((entry) => {
    const rank = Number(String(entry.rank || "").trim());
    const note = String(entry.note || "").trim();
    return entry.score === 0 && (!entry.rank || rank === 0) && (!note || note === "0" || note === "0%");
  });
}

function trimNull(text) {
  const index = text.indexOf("\0");
  return index >= 0 ? text.slice(0, index) : text;
}

async function downloadNetwork() {
  if (downloadJob) return downloadJob;
  const target = path.join(SRC_DIR(), "pikafish.nnue");
  if (fs.existsSync(target)) return { ok: true, networkPath: target, exists: true };
  const url = "https://github.com/official-pikafish/Networks/releases/download/master-net/pikafish.nnue";
  downloadJob = downloadFile(url, target)
    .then(() => ({ ok: true, networkPath: target, exists: fs.existsSync(target) }))
    .catch((err) => ({ ok: false, error: err.message, networkPath: target, exists: false }))
    .finally(() => {
      downloadJob = null;
    });
  return downloadJob;
}

function SRC_DIR() {
  return path.join(ROOT, "src");
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const type = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".webmanifest": "application/manifest+json; charset=utf-8",
      ".png": "image/png"
    }[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "OPTIONS") {
      corsPreflight(res);
      return;
    }
    if (url.pathname === "/api/status") {
      syncEngineInstance();
      json(res, 200, {
        ok: true,
        enginePath: configuredEnginePath,
        exists: Boolean(configuredEnginePath && fs.existsSync(configuredEnginePath)),
        networkPath: path.join(SRC_DIR(), "pikafish.nnue"),
        networkExists: fs.existsSync(path.join(SRC_DIR(), "pikafish.nnue")),
        buildRunning: Boolean(buildJob),
        downloadRunning: Boolean(downloadJob),
        candidates: DEFAULT_ENGINE_CANDIDATES
      });
      return;
    }
    if (url.pathname === "/api/build-engine" && req.method === "POST") {
      const result = await buildEngine();
      json(res, result.ok ? 200 : 500, result);
      return;
    }
    if (url.pathname === "/api/download-network" && req.method === "POST") {
      const result = await downloadNetwork();
      json(res, result.ok ? 200 : 500, result);
      return;
    }
    if (url.pathname === "/api/cloud") {
      const board = url.searchParams.get("board") || "";
      if (!/^[1-9kabnrcpKABNRCP/]+ [wb]$/.test(board)) {
        json(res, 400, { ok: false, error: "Invalid cloud FEN" });
        return;
      }
      const result = await queryCloudBook(board);
      json(res, 200, { ...result, source: "chessdb.vn/chessdb.cn", fen: board });
      return;
    }
    if (url.pathname === "/api/config" && req.method === "POST") {
      const body = await readBody(req);
      configuredEnginePath = path.resolve(String(body.enginePath || ""));
      engine.stop();
      engine = new UciEngine(configuredEnginePath);
      json(res, 200, { ok: true, enginePath: configuredEnginePath, exists: fs.existsSync(configuredEnginePath) });
      return;
    }
    if (url.pathname === "/api/analyze" && req.method === "POST") {
      syncEngineInstance();
      const body = await readBody(req);
      const result = await engine.analyze(body);
      json(res, 200, result);
      return;
    }
    serveStatic(req, res);
  } catch (err) {
    json(res, 500, { ok: false, error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Pikafish analysis app: http://localhost:${PORT}`);
  if (!configuredEnginePath) {
    console.log("No engine binary found. Set PIKAFISH_ENGINE or configure it in the UI.");
  }
});

process.on("SIGINT", () => {
  engine.stop();
  process.exit(0);
});
