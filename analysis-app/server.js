const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const XiangqiCore = require("./public/xiangqi-core.js");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");
const PORT = Number(process.env.PORT || 5174);
const TOKEN_SECRET = process.env.DMAIHXCAI_AUTH_SECRET || "dmaihxcai-dev-secret";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const ROOM_REQUEST_LIMIT = 2;
const MAX_HISTORY_ITEMS = 20;
const MAX_CHAT_MESSAGES = 80;
const MAX_ROOM_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const PRESENCE_TTL_MS = 1000 * 30;

const DEFAULT_ENGINE_CANDIDATES = [
  process.env.PIKAFISH_ENGINE,
  path.join(ROOT, "src", "pikafish.exe"),
  path.join(ROOT, "src", "pikafish"),
  path.join(ROOT, "pikafish.exe"),
  path.join(ROOT, "pikafish")
].filter(Boolean);
const DEFAULT_ENGINE_THREADS = clampOptionNumber(process.env.PIKAFISH_THREADS, Math.max(1, Math.min(2, cpuCount())), 1, 16);
const DEFAULT_ENGINE_HASH_MB = clampOptionNumber(process.env.PIKAFISH_HASH_MB, 128, 16, 1024);

const RANDOM_NAME_PREFIX = ["Kỳ", "Danh", "Long", "Mai", "Chiến", "Phong", "Hổ", "Hưng", "Phi", "Mộc"];
const RANDOM_NAME_SUFFIX = ["Thủ", "Sĩ", "Kỳ", "Tướng", "Vương", "Cục", "Mãnh", "Quân", "Lực", "Minh"];

ensureDataFile(USERS_FILE, { users: [] });
ensureDataFile(ROOMS_FILE, { rooms: [] });

let configuredEnginePath = DEFAULT_ENGINE_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || "";
let buildJob = null;
let downloadJob = null;
let users = loadUsers();
let rooms = loadRooms();

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

function ensureDataFile(filePath, fallback) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function loadUsers() {
  const data = readJsonFile(USERS_FILE, { users: [] });
  return Array.isArray(data.users) ? data.users : [];
}

function loadRooms() {
  const data = readJsonFile(ROOMS_FILE, { rooms: [] });
  const list = Array.isArray(data.rooms) ? data.rooms : [];
  const map = new Map();
  const now = Date.now();
  list.forEach((room) => {
    if (!room || !room.key) return;
    const age = now - Number(room.updatedAt || room.createdAt || now);
    if (age > MAX_ROOM_AGE_MS) return;
    room.pendingRequest = room.pendingRequest || null;
    room.rematchReady = room.rematchReady || { w: false, b: false };
    room.allowances = room.allowances || {
      w: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT },
      b: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT }
    };
    room.moves = Array.isArray(room.moves) ? room.moves : [];
    room.spectators = Array.isArray(room.spectators) ? [...new Set(room.spectators)] : [];
    room.chat = Array.isArray(room.chat) ? room.chat.slice(-MAX_CHAT_MESSAGES) : [];
    room.presence = room.presence && typeof room.presence === "object" ? room.presence : {};
    room.clocks = room.clocks || { w: room.timeControlMs || 0, b: room.timeControlMs || 0 };
    room.boardFen = room.boardFen || XiangqiCore.START_FEN;
    room.sideToMove = room.sideToMove === "b" ? "b" : "w";
    room.status = room.status || "waiting";
    map.set(room.key, room);
  });
  return map;
}

function saveUsers() {
  writeJsonFile(USERS_FILE, { users });
}

function saveRooms() {
  writeJsonFile(ROOMS_FILE, { rooms: [...rooms.values()] });
}

function nowIso() {
  return new Date().toISOString();
}

function randomId(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

function randomBase36(size = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < size; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

function hashPassword(password, salt = randomId(12)) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user?.passwordSalt || !user?.passwordHash) return false;
  const { hash } = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function slugSafe(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim();
}

function generateDisplayName() {
  const left = RANDOM_NAME_PREFIX[Math.floor(Math.random() * RANDOM_NAME_PREFIX.length)];
  const right = RANDOM_NAME_SUFFIX[Math.floor(Math.random() * RANDOM_NAME_SUFFIX.length)];
  return `${left} ${right} ${Math.floor(100 + Math.random() * 900)}`;
}

function sanitizeDisplayName(value) {
  const cleaned = slugSafe(value).slice(0, 26);
  return cleaned || generateDisplayName();
}

function sanitizeAvatarUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\/\S+$/i.test(text)) return text.slice(0, 500);
  return "";
}

function createAuthToken(userId) {
  const payload = {
    uid: userId,
    exp: Date.now() + TOKEN_TTL_MS,
    nonce: randomId(8)
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyAuthToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(encoded).digest("base64url");
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload?.uid || Number(payload.exp) < Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

function getAuthToken(req) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

function getAuthenticatedUser(req) {
  const userId = verifyAuthToken(getAuthToken(req));
  if (!userId) return null;
  return users.find((item) => item.id === userId) || null;
}

function requireUser(req) {
  const user = getAuthenticatedUser(req);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarSeed: user.avatarSeed,
    avatarUrl: user.avatarUrl || "",
    history: Array.isArray(user.history) ? user.history.slice(0, MAX_HISTORY_ITEMS) : []
  };
}

function roomPlayerSnapshot(userId) {
  const user = users.find((item) => item.id === userId);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarSeed: user.avatarSeed,
    avatarUrl: user.avatarUrl || ""
  };
}

function oppositeSide(side) {
  return side === "w" ? "b" : "w";
}

function roomByKey(key) {
  return rooms.get(String(key || "").trim().toUpperCase()) || null;
}

function uniqueRoomKey() {
  for (let i = 0; i < 20; i += 1) {
    const key = randomBase36(6);
    if (!rooms.has(key)) return key;
  }
  return randomBase36(8);
}

function currentRoomForUser(userId) {
  for (const room of rooms.values()) {
    if (room.status === "finished") continue;
    if (room.players?.w === userId || room.players?.b === userId) return room;
    sanitizeRoomPresence(room);
    if (Array.isArray(room.spectators) && room.spectators.includes(userId) && room.presence?.[userId]?.role === "spectator") {
      return room;
    }
  }
  return null;
}

function createRoom(user, minutes, side) {
  const color = side === "b" ? "b" : "w";
  const room = {
    key: uniqueRoomKey(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "waiting",
    timeControlMs: minutes * 60 * 1000,
    boardFen: XiangqiCore.START_FEN,
    sideToMove: "w",
    activeSide: null,
    lastTickAt: null,
    players: {
      w: color === "w" ? user.id : null,
      b: color === "b" ? user.id : null
    },
    spectators: [],
    moves: [],
    chat: [],
    presence: {},
    clocks: { w: minutes * 60 * 1000, b: minutes * 60 * 1000 },
    allowances: {
      w: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT },
      b: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT }
    },
    pendingRequest: null,
    result: null,
    rematchReady: { w: false, b: false },
    historySaved: false
  };
  rooms.set(room.key, room);
  saveRooms();
  return room;
}

function userSideInRoom(room, userId) {
  if (room.players?.w === userId) return "w";
  if (room.players?.b === userId) return "b";
  return "";
}

function roomAccessForUser(room, userId) {
  const side = userSideInRoom(room, userId);
  if (side) return { role: "player", side };
  if (Array.isArray(room.spectators) && room.spectators.includes(userId)) {
    return { role: "spectator", side: "" };
  }
  return { role: "", side: "" };
}

function sanitizeRoomPresence(room) {
  const now = Date.now();
  room.presence = room.presence && typeof room.presence === "object" ? room.presence : {};
  Object.keys(room.presence).forEach((userId) => {
    if (now - Number(room.presence[userId]?.lastSeen || 0) > PRESENCE_TTL_MS) {
      delete room.presence[userId];
    }
  });
}

function touchPresence(room, userId, role) {
  sanitizeRoomPresence(room);
  room.presence[userId] = {
    role,
    lastSeen: Date.now()
  };
}

function activeSpectatorIds(room) {
  sanitizeRoomPresence(room);
  return (room.spectators || []).filter((userId) => room.presence[userId]?.role === "spectator");
}

function addSpectator(room, userId) {
  room.spectators = Array.isArray(room.spectators) ? room.spectators : [];
  if (!room.spectators.includes(userId)) room.spectators.push(userId);
}

function materializeRoomClock(room) {
  if (room.status !== "active" || !room.activeSide || room.result) return;
  const now = Date.now();
  const elapsed = Math.max(0, now - Number(room.lastTickAt || now));
  if (!elapsed) return;
  room.clocks[room.activeSide] = Math.max(0, Number(room.clocks[room.activeSide] || 0) - elapsed);
  room.lastTickAt = now;
  if (room.clocks[room.activeSide] <= 0) {
    finishRoom(room, { winnerSide: oppositeSide(room.activeSide), loserSide: room.activeSide, reason: "timeout" });
  }
}

function resetRoomForGame(room) {
  room.boardFen = XiangqiCore.START_FEN;
  room.sideToMove = "w";
  room.activeSide = "w";
  room.lastTickAt = Date.now();
  room.status = "active";
  room.moves = [];
  room.clocks = { w: room.timeControlMs, b: room.timeControlMs };
  room.allowances = {
    w: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT },
    b: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT }
  };
  room.pendingRequest = null;
  room.result = null;
  room.rematchReady = { w: false, b: false };
  room.historySaved = false;
  room.updatedAt = Date.now();
}

function maybeStartRoom(room) {
  if (room.players?.w && room.players?.b && room.status === "waiting") {
    resetRoomForGame(room);
    saveRooms();
  }
}

function ensureRoomAccess(room, userId) {
  const access = roomAccessForUser(room, userId);
  if (!access.role) throw new Error("FORBIDDEN_ROOM");
  touchPresence(room, userId, access.role);
  return access;
}

function finishRoom(room, { winnerSide = null, loserSide = null, reason = "draw" } = {}) {
  if (room.result) return;
  room.status = "finished";
  room.activeSide = null;
  room.lastTickAt = Date.now();
  room.pendingRequest = null;
  room.result = {
    winnerSide,
    loserSide,
    reason,
    endedAt: nowIso()
  };
  if (!room.historySaved) {
    recordRoomHistory(room);
    room.historySaved = true;
  }
  room.updatedAt = Date.now();
  saveRooms();
}

function recordRoomHistory(room) {
  const red = room.players?.w ? users.find((item) => item.id === room.players.w) : null;
  const black = room.players?.b ? users.find((item) => item.id === room.players.b) : null;
  if (red) appendHistory(red, buildHistoryEntry(room, "w", black));
  if (black) appendHistory(black, buildHistoryEntry(room, "b", red));
  saveUsers();
}

function buildHistoryEntry(room, side, opponent) {
  const winnerSide = room.result?.winnerSide || null;
  let outcome = "Hòa";
  if (winnerSide === side) outcome = "Thắng";
  if (winnerSide && winnerSide !== side) outcome = "Thua";
  return {
    roomKey: room.key,
    endedAt: room.result?.endedAt || nowIso(),
    side: side === "w" ? "Đỏ" : "Đen",
    opponent: opponent?.displayName || opponent?.username || "Đang chờ",
    result: outcome,
    reason: formatResultReason(room.result?.reason || "draw"),
    moves: room.moves.map((move) => move.notation)
  };
}

function appendHistory(user, entry) {
  user.history = Array.isArray(user.history) ? user.history : [];
  user.history.unshift(entry);
  user.history = user.history.slice(0, MAX_HISTORY_ITEMS);
}

function formatResultReason(reason) {
  return {
    checkmate: "Chiếu bí",
    "no-moves": "Hết nước",
    timeout: "Hết giờ",
    resign: "Xin thua",
    draw: "Hòa"
  }[reason] || reason;
}

function joinRoom(user, key) {
  const room = roomByKey(key);
  if (!room) throw new Error("ROOM_NOT_FOUND");
  const access = roomAccessForUser(room, user.id);
  if (access.role) {
    touchPresence(room, user.id, access.role);
    saveRooms();
    return room;
  }
  if (room.status === "finished" && (!room.players.w || !room.players.b)) {
    throw new Error("ROOM_CLOSED");
  }
  if (room.players.w && room.players.b) {
    addSpectator(room, user.id);
    touchPresence(room, user.id, "spectator");
    room.updatedAt = Date.now();
    saveRooms();
    return room;
  }
  if (!room.players.w) room.players.w = user.id;
  else room.players.b = user.id;
  touchPresence(room, user.id, "player");
  room.updatedAt = Date.now();
  maybeStartRoom(room);
  saveRooms();
  return room;
}

function roomStateForUser(room, user) {
  materializeRoomClock(room);
  const access = ensureRoomAccess(room, user.id);
  const yourSide = access.side;
  const waitingForOpponent = room.status === "waiting";
  const viewerRequest = room.pendingRequest
    ? {
        type: room.pendingRequest.type,
        fromSide: room.pendingRequest.fromSide,
        fromYou: access.role === "player" && room.pendingRequest.fromSide === yourSide,
        toYou: access.role === "player" && room.pendingRequest.fromSide !== yourSide
      }
    : null;
  const spectators = activeSpectatorIds(room).map(roomPlayerSnapshot).filter(Boolean);
  return {
    key: room.key,
    status: room.status,
    timeControlMinutes: Math.round(room.timeControlMs / 60000),
    boardFen: room.boardFen,
    sideToMove: room.sideToMove,
    role: access.role,
    yourSide,
    viewSide: access.role === "player" ? yourSide : "w",
    waitingForOpponent,
    yourTurn: access.role === "player" && room.status === "active" && room.sideToMove === yourSide,
    players: {
      w: roomPlayerSnapshot(room.players.w),
      b: roomPlayerSnapshot(room.players.b)
    },
    spectators,
    viewerCount: spectators.length,
    clocks: room.clocks,
    allowances: access.role === "player"
      ? room.allowances[yourSide] || { undoRemaining: 0, drawRemaining: 0 }
      : { undoRemaining: 0, drawRemaining: 0 },
    pendingRequest: viewerRequest,
    rematchReady: {
      you: access.role === "player" ? Boolean(room.rematchReady?.[yourSide]) : false,
      opponent: access.role === "player" ? Boolean(room.rematchReady?.[oppositeSide(yourSide)]) : false
    },
    result: room.result,
    chat: (room.chat || []).slice(-MAX_CHAT_MESSAGES).map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      displayName: entry.displayName,
      username: entry.username,
      avatarSeed: entry.avatarSeed,
      avatarUrl: entry.avatarUrl || "",
      text: entry.text,
      createdAt: entry.createdAt
    })),
    moves: room.moves.map((move) => ({
      side: move.side,
      move: move.move,
      notation: move.notation
    }))
  };
}

function requireRoomAndUser(req, key) {
  const user = requireUser(req);
  const room = roomByKey(key);
  if (!room) throw new Error("ROOM_NOT_FOUND");
  const access = ensureRoomAccess(room, user.id);
  return { user, room, access, side: access.side };
}

function requirePlayerAccess(access) {
  if (access.role !== "player" || !access.side) throw new Error("SPECTATOR_READ_ONLY");
  return access.side;
}

function applyMoveInRoom(room, side, move) {
  if (room.status !== "active") throw new Error("ROOM_NOT_ACTIVE");
  materializeRoomClock(room);
  if (room.result) throw new Error("ROOM_FINISHED");
  if (room.sideToMove !== side) throw new Error("NOT_YOUR_TURN");
  const parsed = XiangqiCore.parseFenState(room.boardFen);
  if (!XiangqiCore.isLegalMove(parsed.board, move, side)) throw new Error("INVALID_MOVE");
  const beforeFen = room.boardFen;
  const beforeClocks = { ...room.clocks };
  const notation = XiangqiCore.formatMoveNotation(move, parsed.board, side);
  XiangqiCore.applyMoveToBoard(parsed.board, move);
  room.boardFen = XiangqiCore.boardToFen(parsed.board, oppositeSide(side));
  room.moves.push({
    side,
    move,
    notation,
    beforeFen,
    beforeSide: side,
    beforeClocks
  });
  room.sideToMove = oppositeSide(side);
  room.activeSide = room.sideToMove;
  room.lastTickAt = Date.now();
  room.pendingRequest = null;
  room.rematchReady = { w: false, b: false };
  const gameState = XiangqiCore.determineGameState(parsed.board, room.sideToMove);
  room.updatedAt = Date.now();
  if (gameState.finished) {
    finishRoom(room, gameState);
  } else {
    saveRooms();
  }
}

function sendRoomRequest(room, side, type) {
  if (room.status !== "active") throw new Error("ROOM_NOT_ACTIVE");
  materializeRoomClock(room);
  if (room.result) throw new Error("ROOM_FINISHED");
  if (room.pendingRequest) throw new Error("REQUEST_PENDING");
  if (!["undo", "draw"].includes(type)) throw new Error("INVALID_REQUEST");
  if (type === "undo" && room.moves.length === 0) throw new Error("NO_MOVE_TO_UNDO");
  const allowance = room.allowances?.[side];
  if (!allowance) throw new Error("INVALID_SIDE");
  const field = type === "undo" ? "undoRemaining" : "drawRemaining";
  if (Number(allowance[field] || 0) <= 0) throw new Error("REQUEST_LIMIT_REACHED");
  allowance[field] -= 1;
  room.pendingRequest = {
    type,
    fromSide: side,
    createdAt: Date.now()
  };
  room.updatedAt = Date.now();
  saveRooms();
}

function answerRoomRequest(room, side, accept) {
  if (!room.pendingRequest) throw new Error("NO_PENDING_REQUEST");
  if (room.pendingRequest.fromSide === side) throw new Error("SELF_REQUEST");
  const request = room.pendingRequest;
  room.pendingRequest = null;

  if (!accept) {
    room.updatedAt = Date.now();
    saveRooms();
    return;
  }

  if (request.type === "undo") {
    const lastMove = room.moves.pop();
    if (!lastMove) {
      room.updatedAt = Date.now();
      saveRooms();
      return;
    }
    room.boardFen = lastMove.beforeFen;
    room.sideToMove = lastMove.beforeSide;
    room.activeSide = room.sideToMove;
    room.clocks = lastMove.beforeClocks;
    room.lastTickAt = Date.now();
    room.updatedAt = Date.now();
    saveRooms();
    return;
  }

  if (request.type === "draw") {
    finishRoom(room, { winnerSide: null, loserSide: null, reason: "draw" });
  }
}

function resignRoom(room, side) {
  if (room.status !== "active") throw new Error("ROOM_NOT_ACTIVE");
  materializeRoomClock(room);
  finishRoom(room, { winnerSide: oppositeSide(side), loserSide: side, reason: "resign" });
}

function setRematchReady(room, side, ready) {
  if (room.status !== "finished") throw new Error("ROOM_NOT_FINISHED");
  room.rematchReady[side] = Boolean(ready);
  room.updatedAt = Date.now();
  if (room.rematchReady.w && room.rematchReady.b) {
    const nextPlayers = { w: room.players.b, b: room.players.w };
    room.players = nextPlayers;
    resetRoomForGame(room);
  }
  saveRooms();
}

function appendChatMessage(room, user, text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim().slice(0, 280);
  if (!clean) throw new Error("EMPTY_CHAT");
  room.chat = Array.isArray(room.chat) ? room.chat : [];
  room.chat.push({
    id: randomId(8),
    userId: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarSeed: user.avatarSeed,
    avatarUrl: user.avatarUrl || "",
    text: clean,
    createdAt: nowIso()
  });
  room.chat = room.chat.slice(-MAX_CHAT_MESSAGES);
  room.updatedAt = Date.now();
  saveRooms();
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

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function corsPreflight(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let requested = url.pathname === "/" ? "/index.html" : url.pathname;
  if (requested === "/analysis") requested = "/analysis.html";
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
    const ext = path.extname(filePath).toLowerCase();
    const type = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".webmanifest": "application/manifest+json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".svg": "image/svg+xml"
    }[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600"
    });
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

    if (url.pathname === "/api/auth/register" && req.method === "POST") {
      const body = await readBody(req);
      const email = normalizeEmail(body.email);
      const username = normalizeUsername(body.username);
      const password = String(body.password || "");
      if (!email || !username || password.length < 6) {
        json(res, 400, { ok: false, error: "Cần email, tên đăng nhập và mật khẩu từ 6 ký tự." });
        return;
      }
      if (users.some((item) => item.email === email)) {
        json(res, 400, { ok: false, error: "Email đã được sử dụng." });
        return;
      }
      if (users.some((item) => item.username === username)) {
        json(res, 400, { ok: false, error: "Tên đăng nhập đã tồn tại." });
        return;
      }
      const passwordInfo = hashPassword(password);
      const user = {
        id: randomId(12),
        email,
        username,
        passwordSalt: passwordInfo.salt,
        passwordHash: passwordInfo.hash,
        displayName: generateDisplayName(),
        avatarSeed: randomBase36(4),
        avatarUrl: "",
        history: [],
        createdAt: nowIso()
      };
      users.push(user);
      saveUsers();
      json(res, 200, {
        ok: true,
        token: createAuthToken(user.id),
        user: publicUser(user)
      });
      return;
    }

    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      const body = await readBody(req);
      const account = String(body.account || "").trim();
      const password = String(body.password || "");
      const user = users.find((item) => item.email === normalizeEmail(account) || item.username === normalizeUsername(account));
      if (!user || !verifyPassword(password, user)) {
        json(res, 401, { ok: false, error: "Sai thông tin đăng nhập." });
        return;
      }
      json(res, 200, {
        ok: true,
        token: createAuthToken(user.id),
        user: publicUser(user)
      });
      return;
    }

    if (url.pathname === "/api/auth/me") {
      const user = getAuthenticatedUser(req);
      if (!user) {
        json(res, 401, { ok: false, error: "UNAUTHORIZED" });
        return;
      }
      json(res, 200, { ok: true, user: publicUser(user) });
      return;
    }

    if (url.pathname === "/api/profile" && req.method === "POST") {
      const user = requireUser(req);
      const body = await readBody(req);
      user.displayName = sanitizeDisplayName(body.displayName);
      user.avatarUrl = sanitizeAvatarUrl(body.avatarUrl);
      saveUsers();
      json(res, 200, { ok: true, user: publicUser(user) });
      return;
    }

    if (url.pathname === "/api/history") {
      const user = requireUser(req);
      json(res, 200, { ok: true, history: Array.isArray(user.history) ? user.history.slice(0, MAX_HISTORY_ITEMS) : [] });
      return;
    }

    if (url.pathname === "/api/rooms/current") {
      const user = requireUser(req);
      const room = currentRoomForUser(user.id);
      json(res, 200, { ok: true, room: room ? roomStateForUser(room, user) : null });
      return;
    }

    if (url.pathname === "/api/rooms/create" && req.method === "POST") {
      const user = requireUser(req);
      const body = await readBody(req);
      const minutes = Math.max(1, Math.min(20, Number(body.minutes) || 10));
      const side = body.side === "b" ? "b" : "w";
      const current = currentRoomForUser(user.id);
      if (current && current.status !== "finished") {
        json(res, 400, { ok: false, error: "Bạn đang ở trong một phòng khác." });
        return;
      }
      const room = createRoom(user, minutes, side);
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/join" && req.method === "POST") {
      const user = requireUser(req);
      const body = await readBody(req);
      const key = String(body.key || "").trim().toUpperCase();
      if (!key) {
        json(res, 400, { ok: false, error: "Cần nhập mã phòng." });
        return;
      }
      const current = currentRoomForUser(user.id);
      if (current && current.key !== key && current.status !== "finished") {
        json(res, 400, { ok: false, error: "Bạn đang ở trong một phòng khác." });
        return;
      }
      const room = joinRoom(user, key);
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/state") {
      const user = requireUser(req);
      const key = String(url.searchParams.get("key") || "").trim().toUpperCase();
      const room = roomByKey(key);
      if (!room) {
        json(res, 404, { ok: false, error: "ROOM_NOT_FOUND" });
        return;
      }
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/move" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      applyMoveInRoom(room, side, String(body.move || ""));
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/request" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      sendRoomRequest(room, side, String(body.type || ""));
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/respond" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      answerRoomRequest(room, side, Boolean(body.accept));
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/resign" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      resignRoom(room, side);
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/rematch" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      setRematchReady(room, side, Boolean(body.ready));
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/chat" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room } = requireRoomAndUser(req, body.key);
      appendChatMessage(room, user, body.text);
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    serveStatic(req, res);
  } catch (err) {
    const message = String(err.message || err);
    const status = {
      UNAUTHORIZED: 401,
      ROOM_NOT_FOUND: 404,
      ROOM_FULL: 400,
      ROOM_CLOSED: 400,
      FORBIDDEN_ROOM: 403,
      INVALID_MOVE: 400,
      NOT_YOUR_TURN: 400,
      REQUEST_LIMIT_REACHED: 400,
      REQUEST_PENDING: 400,
      ROOM_NOT_ACTIVE: 400,
      ROOM_FINISHED: 400,
      ROOM_NOT_FINISHED: 400,
      NO_PENDING_REQUEST: 400,
      NO_MOVE_TO_UNDO: 400,
      SELF_REQUEST: 400,
      INVALID_REQUEST: 400,
      INVALID_SIDE: 400,
      SPECTATOR_READ_ONLY: 403,
      EMPTY_CHAT: 400
    }[message] || 500;
    json(res, status, { ok: false, error: friendlyErrorVi(message) });
  }
});

function friendlyErrorVi(code) {
  return {
    UNAUTHORIZED: "B?n c?n ??ng nh?p.",
    ROOM_NOT_FOUND: "Kh?ng t?m th?y ph?ng ??u.",
    ROOM_FULL: "Ph?ng ?? ?? ng??i.",
    ROOM_CLOSED: "Ph?ng n?y kh?ng th? tham gia n?a.",
    FORBIDDEN_ROOM: "B?n kh?ng thu?c ph?ng ??u n?y.",
    INVALID_MOVE: "N??c ?i kh?ng h?p l?.",
    NOT_YOUR_TURN: "Ch?a t?i l??t b?n.",
    REQUEST_LIMIT_REACHED: "B?n ?? d?ng h?t l??t y?u c?u.",
    REQUEST_PENDING: "?ang c? y?u c?u ch? ??i th? x?c nh?n.",
    ROOM_NOT_ACTIVE: "Ph?ng ch?a s?n s?ng thi ??u.",
    ROOM_FINISHED: "V?n c? ?? k?t th?c.",
    ROOM_NOT_FINISHED: "V?n c? ch?a k?t th?c.",
    NO_PENDING_REQUEST: "Kh?ng c? y?u c?u ?ang ch?.",
    NO_MOVE_TO_UNDO: "Ch?a c? n??c n?o ?? ?i l?i.",
    SELF_REQUEST: "B?n kh?ng th? t? x?c nh?n y?u c?u c?a m?nh.",
    INVALID_REQUEST: "Yeu cau khong hop le.",
    INVALID_SIDE: "Phong dau dang loi ve ben cam quan.",
    SPECTATOR_READ_ONLY: "Nguoi xem chi co the quan sat va chat.",
    EMPTY_CHAT: "Noi dung chat khong duoc de trong."
  }[code] || code;
}

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
