const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

let ort = null;
let sharp = null;
try {
  ort = require("onnxruntime-node");
} catch {}
try {
  sharp = require("sharp");
} catch {}
if (sharp) {
  sharp.cache(false);
  sharp.concurrency(1);
}

const APP_DIR = __dirname;
const INPUT_SIZE = 640;
const CANONICAL_WIDTH = 960;
const CANONICAL_HEIGHT = 1080;
const DEFAULT_ONNX_MODEL_CANDIDATES = [
  path.join(APP_DIR, "ml", "models", "xiangqi-yolo.onnx")
];
const DEFAULT_MODEL_CANDIDATES = [
  path.join(APP_DIR, "ml", "models", "xiangqi-yolo.pt"),
  path.join(APP_DIR, "ml", "runs", "xiangqi-yolo", "weights", "best.pt"),
  path.join(APP_DIR, "ml", "runs", "train", "weights", "best.pt")
];
const CLASS_TO_PIECE = [
  "K", "A", "B", "N", "R", "C", "P",
  "k", "a", "b", "n", "r", "c", "p"
];
const PIECE_MAX_COUNTS = {
  K: 1, A: 2, B: 2, N: 2, R: 2, C: 2, P: 5,
  k: 1, a: 2, b: 2, n: 2, r: 2, c: 2, p: 5
};

let onnxSessionPromise = null;

function yoloPythonPath() {
  const configured = String(process.env.XIANGQI_YOLO_PYTHON || process.env.YOLO_PYTHON || process.env.PYTHON || "").trim();
  if (configured) return configured;
  const localVenvPython = process.platform === "win32"
    ? path.join(APP_DIR, "ml", ".venv", "Scripts", "python.exe")
    : path.join(APP_DIR, "ml", ".venv", "bin", "python");
  if (fs.existsSync(localVenvPython)) return localVenvPython;
  return "python";
}

function yoloScriptPath() {
  return path.join(APP_DIR, "ml", "yolo_infer.py");
}

function configuredModelCandidates() {
  return [
    process.env.XIANGQI_YOLO_MODEL,
    process.env.YOLO_VISION_MODEL,
    ...DEFAULT_MODEL_CANDIDATES
  ].map((item) => String(item || "").trim()).filter(Boolean);
}

function configuredOnnxModelCandidates() {
  return [
    process.env.XIANGQI_YOLO_ONNX_MODEL,
    process.env.YOLO_ONNX_MODEL,
    ...DEFAULT_ONNX_MODEL_CANDIDATES
  ].map((item) => String(item || "").trim()).filter(Boolean);
}

function yoloModelPath() {
  return configuredModelCandidates().find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || "";
}

function yoloOnnxModelPath() {
  return configuredOnnxModelCandidates().find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || "";
}

function yoloOnnxAvailable() {
  return Boolean(ort && sharp && yoloOnnxModelPath());
}

function yoloPythonAvailable() {
  return Boolean(yoloModelPath() && fs.existsSync(yoloScriptPath()) && yoloRuntimeLikelyAvailable());
}

function yoloVisionAvailable() {
  return yoloOnnxAvailable() || yoloPythonAvailable();
}

function yoloVisionStatus() {
  const modelPath = yoloModelPath();
  const onnxModelPath = yoloOnnxModelPath();
  const python = yoloPythonPath();
  return {
    available: yoloVisionAvailable(),
    engine: yoloOnnxAvailable() ? "onnxruntime-yolo" : "ultralytics-yolo",
    modelPath,
    onnxModelPath,
    modelConfigured: Boolean(process.env.XIANGQI_YOLO_MODEL || process.env.YOLO_VISION_MODEL),
    onnxModelConfigured: Boolean(process.env.XIANGQI_YOLO_ONNX_MODEL || process.env.YOLO_ONNX_MODEL),
    scriptExists: fs.existsSync(yoloScriptPath()),
    python,
    runtimeLikelyAvailable: yoloRuntimeLikelyAvailable(),
    onnxRuntimeAvailable: Boolean(ort),
    sharpAvailable: Boolean(sharp)
  };
}

function yoloRuntimeLikelyAvailable() {
  const configured = Boolean(process.env.XIANGQI_YOLO_PYTHON || process.env.YOLO_PYTHON || process.env.PYTHON);
  if (configured) return true;
  const localVenvPython = process.platform === "win32"
    ? path.join(APP_DIR, "ml", ".venv", "Scripts", "python.exe")
    : path.join(APP_DIR, "ml", ".venv", "bin", "python");
  return fs.existsSync(localVenvPython);
}

async function recognizeYoloXiangqiBoard({ image, imageData, side = "w" }) {
  const buffer = dataUrlToBuffer(image || imageData || "");
  if (yoloOnnxAvailable()) {
    return recognizeYoloOnnx(buffer, side);
  }

  const modelPath = yoloModelPath();
  const scriptPath = yoloScriptPath();
  if (!modelPath || !fs.existsSync(modelPath)) throw new Error("VISION_YOLO_UNAVAILABLE");
  if (!fs.existsSync(scriptPath)) throw new Error("VISION_YOLO_SCRIPT_MISSING");
  const tempPath = path.join(os.tmpdir(), `dmaihxcai-yolo-${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`);
  fs.writeFileSync(tempPath, buffer);

  try {
    const stdout = await execPythonJson(yoloPythonPath(), [
      scriptPath,
      "--model", modelPath,
      "--image", tempPath,
      "--side", String(side || "w").toLowerCase() === "b" ? "b" : "w",
      "--conf", String(process.env.XIANGQI_YOLO_CONF || "0.34")
    ], Number(process.env.XIANGQI_YOLO_TIMEOUT_MS || 45000));
    const parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed?.board) || !parsed.pieces?.length) throw new Error("VISION_EMPTY_RESULT");
    return {
      board: parsed.board,
      pieces: parsed.pieces,
      side: parsed.side === "b" ? "b" : "w",
      sideToMove: parsed.sideToMove === "b" ? "b" : "w",
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 8) : [],
      recognizer: "yolo-xiangqi",
      modelPath: path.basename(modelPath)
    };
  } catch (error) {
    if (String(error?.message || "").includes("VISION_EMPTY_RESULT")) throw error;
    const wrapped = new Error("VISION_YOLO_FAILED");
    wrapped.cause = error;
    throw wrapped;
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {}
  }
}

async function recognizeYoloOnnx(buffer, side = "w") {
  if (!ort || !sharp) throw new Error("VISION_YOLO_UNAVAILABLE");
  const modelPath = yoloOnnxModelPath();
  if (!modelPath) throw new Error("VISION_YOLO_UNAVAILABLE");

  const preprocessed = await preprocessForYolo(buffer);
  const session = await getOnnxSession(modelPath);
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const feeds = {
    [inputName]: new ort.Tensor("float32", preprocessed.tensor, [1, 3, INPUT_SIZE, INPUT_SIZE])
  };
  const output = (await session.run(feeds))[outputName];
  const detections = decodeYoloOutput(output, preprocessed);
  const mapped = mapDetectionsToBoard(detections, side, preprocessed);
  if (!mapped.pieces.length) throw new Error("VISION_EMPTY_RESULT");
  return {
    ...mapped,
    recognizer: "yolo-onnx-xiangqi",
    modelPath: path.basename(modelPath)
  };
}

async function getOnnxSession(modelPath) {
  if (!onnxSessionPromise) {
    onnxSessionPromise = ort.InferenceSession.create(modelPath, {
      executionProviders: ["cpu"],
      graphOptimizationLevel: "basic",
      intraOpNumThreads: 1,
      interOpNumThreads: 1,
      enableCpuMemArena: false,
      enableMemPattern: false
    });
  }
  return onnxSessionPromise;
}

async function preprocessForYolo(buffer) {
  const metadata = await sharp(buffer, { limitInputPixels: 32 * 1024 * 1024 }).rotate().metadata();
  const width = metadata.width || CANONICAL_WIDTH;
  const height = metadata.height || CANONICAL_HEIGHT;
  const scaleX = INPUT_SIZE / width;
  const scaleY = INPUT_SIZE / height;
  const raw = await sharp(buffer, { limitInputPixels: 32 * 1024 * 1024 })
    .rotate()
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const tensor = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const plane = INPUT_SIZE * INPUT_SIZE;
  for (let i = 0, pixel = 0; pixel < plane; pixel++, i += 3) {
    tensor[pixel] = raw[i] / 255;
    tensor[plane + pixel] = raw[i + 1] / 255;
    tensor[plane * 2 + pixel] = raw[i + 2] / 255;
  }
  return { tensor, width, height, scaleX, scaleY, padX: 0, padY: 0 };
}

function decodeYoloOutput(output, layout) {
  const data = output.data;
  const dims = output.dims || [];
  const confThreshold = Number(process.env.XIANGQI_YOLO_CONF || 0.34);
  const raw = [];
  if (dims.length !== 3 || dims[0] !== 1) return raw;
  const channels = dims[1];
  const boxes = dims[2];
  const classCount = channels - 4;
  for (let index = 0; index < boxes; index++) {
    let bestClass = -1;
    let bestScore = 0;
    for (let cls = 0; cls < classCount; cls++) {
      const score = Number(data[(4 + cls) * boxes + index]);
      if (score > bestScore) {
        bestScore = score;
        bestClass = cls;
      }
    }
    if (bestClass < 0 || bestScore < confThreshold) continue;
    const cx = Number(data[index]);
    const cy = Number(data[boxes + index]);
    const width = Number(data[boxes * 2 + index]);
    const height = Number(data[boxes * 3 + index]);
    const x1 = (cx - width / 2 - layout.padX) / layout.scaleX;
    const y1 = (cy - height / 2 - layout.padY) / layout.scaleY;
    const x2 = (cx + width / 2 - layout.padX) / layout.scaleX;
    const y2 = (cy + height / 2 - layout.padY) / layout.scaleY;
    raw.push({
      classId: bestClass,
      piece: CLASS_TO_PIECE[bestClass] || "",
      confidence: bestScore,
      x1: clampNumber(x1, 0, layout.width),
      y1: clampNumber(y1, 0, layout.height),
      x2: clampNumber(x2, 0, layout.width),
      y2: clampNumber(y2, 0, layout.height)
    });
  }
  return nonMaxSuppression(raw, 0.48).filter((item) => item.piece);
}

function nonMaxSuppression(items, iouThreshold) {
  const sorted = [...items].sort((a, b) => b.confidence - a.confidence);
  const keep = [];
  while (sorted.length) {
    const current = sorted.shift();
    keep.push(current);
    for (let index = sorted.length - 1; index >= 0; index--) {
      if (sorted[index].classId === current.classId && boxIou(current, sorted[index]) > iouThreshold) {
        sorted.splice(index, 1);
      }
    }
  }
  return keep;
}

function boxIou(a, b) {
  const ix1 = Math.max(a.x1, b.x1);
  const iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2);
  const iy2 = Math.min(a.y2, b.y2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const intersection = iw * ih;
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  return intersection / Math.max(1, areaA + areaB - intersection);
}

function mapDetectionsToBoard(detections, side = "w", layout = {}) {
  const board = Array.from({ length: 10 }, () => Array(9).fill(""));
  const bySquare = new Map();
  for (const detection of detections) {
    const centerX = (detection.x1 + detection.x2) / 2;
    const centerY = (detection.y1 + detection.y2) / 2;
    const square = nearestBoardSquare(centerX, centerY, layout);
    if (!square) continue;
    if (!isLegalPieceSquare(detection.piece, square.x, square.y)) continue;
    const key = `${square.x},${square.y}`;
    const score = detection.confidence - square.distance * 0.06;
    const candidate = {
      x: square.x,
      y: square.y,
      piece: detection.piece,
      confidence: roundConfidence(detection.confidence),
      score
    };
    const current = bySquare.get(key) || [];
    current.push(candidate);
    bySquare.set(key, current);
  }
  const bestBySquare = [...bySquare.values()]
    .map((items) => items.sort((a, b) => b.score - a.score)[0])
    .filter(Boolean);
  const pieces = enforcePieceCounts(bestBySquare)
    .sort((a, b) => (9 - a.y) - (9 - b.y) || a.x - b.x)
    .map(({ score, ...item }) => item);
  for (const item of pieces) board[item.y][item.x] = item.piece;
  const normalizedSide = String(side || "w").toLowerCase() === "b" ? "b" : "w";
  const warnings = [];
  if (pieces.length < 4) warnings.push("YOLO thấy rất ít quân; hãy crop sát bàn hơn nếu thiếu quân.");
  if (pieces.length > 32) warnings.push("YOLO thấy nhiều hơn 32 quân; hãy crop lại bàn cờ.");
  return { board, pieces, side: normalizedSide, sideToMove: normalizedSide, warnings };
}

function enforcePieceCounts(pieces) {
  const grouped = new Map();
  for (const item of pieces) {
    const list = grouped.get(item.piece) || [];
    list.push(item);
    grouped.set(item.piece, list);
  }
  const kept = [];
  for (const [piece, list] of grouped) {
    const limit = PIECE_MAX_COUNTS[piece] || list.length;
    list.sort((a, b) => b.score - a.score);
    kept.push(...list.slice(0, limit));
  }
  return kept;
}

function isLegalPieceSquare(piece, x, y) {
  if (!piece) return false;
  if (piece === "K") return x >= 3 && x <= 5 && y >= 0 && y <= 2;
  if (piece === "k") return x >= 3 && x <= 5 && y >= 7 && y <= 9;
  if (piece === "A") return isAdvisorSquare(x, y, false);
  if (piece === "a") return isAdvisorSquare(x, y, true);
  if (piece === "B") return isElephantSquare(x, y, false);
  if (piece === "b") return isElephantSquare(x, y, true);
  if (piece === "P") return y >= 3 && (y >= 5 || x % 2 === 0);
  if (piece === "p") return y <= 6 && (y <= 4 || x % 2 === 0);
  return x >= 0 && x <= 8 && y >= 0 && y <= 9;
}

function isAdvisorSquare(x, y, black) {
  const allowed = black
    ? [[3, 9], [5, 9], [4, 8], [3, 7], [5, 7]]
    : [[3, 0], [5, 0], [4, 1], [3, 2], [5, 2]];
  return allowed.some(([sx, sy]) => sx === x && sy === y);
}

function isElephantSquare(x, y, black) {
  const allowed = black
    ? [[2, 9], [6, 9], [0, 7], [4, 7], [8, 7], [2, 5], [6, 5]]
    : [[2, 0], [6, 0], [0, 2], [4, 2], [8, 2], [2, 4], [6, 4]];
  return allowed.some(([sx, sy]) => sx === x && sy === y);
}

function nearestBoardSquare(cx, cy, layout = {}) {
  const boardWidth = Number(layout.width || CANONICAL_WIDTH);
  const boardHeight = Number(layout.height || CANONICAL_HEIGHT);
  const insetX = Number(process.env.XIANGQI_YOLO_GRID_INSET_X || 0.075);
  const insetY = Number(process.env.XIANGQI_YOLO_GRID_INSET_Y || 0.0666667);
  const gridLeft = boardWidth * insetX;
  const gridTop = boardHeight * insetY;
  const gridWidth = boardWidth * (1 - insetX * 2);
  const gridHeight = boardHeight * (1 - insetY * 2);
  const cellX = gridWidth / 8;
  const cellY = gridHeight / 9;
  const topX = Math.round((cx - gridLeft) / cellX);
  const topY = Math.round((cy - gridTop) / cellY);
  if (topX < 0 || topX > 8 || topY < 0 || topY > 9) return null;
  const snappedX = gridLeft + topX * cellX;
  const snappedY = gridTop + topY * cellY;
  const distance = Math.hypot((cx - snappedX) / Math.max(1, cellX), (cy - snappedY) / Math.max(1, cellY));
  if (distance > 0.68) return null;
  return { x: topX, y: 9 - topY, distance };
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function roundConfidence(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

function execPythonJson(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        error.message = `${error.message}${stderr ? `\n${stderr}` : ""}`;
        reject(error);
        return;
      }
      const clean = String(stdout || "").trim();
      if (!clean) {
        reject(new Error(`YOLO returned empty output${stderr ? `: ${stderr}` : ""}`));
        return;
      }
      resolve(clean);
    });
  });
}

function dataUrlToBuffer(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) throw new Error("VISION_BAD_IMAGE");
  return Buffer.from(match[1].replace(/\s+/g, ""), "base64");
}

module.exports = {
  recognizeYoloXiangqiBoard,
  yoloVisionAvailable,
  yoloVisionStatus,
  yoloModelPath
};
