const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { DatabaseSync } = require("node:sqlite");
let MongoClient = null;
try {
  ({ MongoClient } = require("mongodb"));
} catch {}

const XiangqiCore = require("./public/xiangqi-core.js");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");
const DATABASE_FILE = resolveDatabaseFile();
const MONGODB_URI = String(process.env.MONGODB_URI || process.env.MONGO_URL || "").trim();
const MONGODB_DB_NAME = String(process.env.MONGODB_DB_NAME || inferMongoDatabaseName(MONGODB_URI) || "dmaihxcai").trim() || "dmaihxcai";
const MONGODB_COLLECTION = String(process.env.MONGODB_COLLECTION || "app_state").trim() || "app_state";
const PORT = Number(process.env.PORT || 5174);
const TOKEN_SECRET = process.env.DMAIHXCAI_AUTH_SECRET || "dmaihxcai-dev-secret";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 365 * 5;
const ROOM_REQUEST_LIMIT = 2;
const MAX_HISTORY_ITEMS = 20;
const MAX_CHAT_MESSAGES = 80;
const MAX_ROOM_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const PRESENCE_TTL_MS = 1000 * 30;
const ROOM_START_DELAY_MS = 2000;
const ROOM_HIDDEN_CLOCK_BONUS_MS = 30 * 1000;
const ADMIN_EMAIL = normalizeEmail(process.env.DMAIHXCAI_ADMIN_EMAIL || "admin@dmaihxcai.local");
const ADMIN_USERNAME = normalizeUsername(process.env.DMAIHXCAI_ADMIN_USERNAME || "admin");
const ADMIN_PASSWORD = String(process.env.DMAIHXCAI_ADMIN_PASSWORD || "Admin@123456");
const ADMIN_DISPLAY_NAME = sanitizeDisplayName(process.env.DMAIHXCAI_ADMIN_DISPLAY_NAME || "DmaiHXCAI Admin");
const ALLOWED_INCREMENT_SECONDS = new Set([0, 1, 2, 3, 5]);
const DEVICE_AVATAR_PATHS = new Set([
  "/assets/device-avatars/goku.png",
  "/assets/device-avatars/vegeta.png",
  "/assets/device-avatars/naruto.png",
  "/assets/device-avatars/luffy.png",
  "/assets/device-avatars/ichigo.png",
  "/assets/device-avatars/gojo.png",
  "/assets/device-avatars/sungjinwoo.png"
]);

const DEFAULT_ENGINE_CANDIDATES = [
  process.env.PIKAFISH_ENGINE,
  path.join(ROOT, "src", "pikafish.exe"),
  path.join(ROOT, "src", "pikafish"),
  path.join(ROOT, "pikafish.exe"),
  path.join(ROOT, "pikafish")
].filter(Boolean);
const DEFAULT_ENGINE_THREADS = clampOptionNumber(process.env.PIKAFISH_THREADS, Math.max(1, Math.min(2, cpuCount())), 1, 16);
const DEFAULT_ENGINE_HASH_MB = clampOptionNumber(process.env.PIKAFISH_HASH_MB, 128, 16, 1024);

ensureDataFile(USERS_FILE, { users: [] });
ensureDataFile(ROOMS_FILE, { rooms: [] });

const stateStore = createStateStore();
const mongoStateStore = createMongoStateStore();
let pendingUserPersistence = Promise.resolve();

if (process.env.RENDER && !isPersistentStoragePath(DATABASE_FILE)) {
  console.warn(`Render is using ephemeral storage for SQLite at ${DATABASE_FILE}. Mount a disk and point DMAIHXCAI_DB_PATH to it if you want accounts and rooms to survive redeploys.`);
}

let configuredEnginePath = DEFAULT_ENGINE_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || "";
let buildJob = null;
let downloadJob = null;
let users = loadUsers();
ensureAdminUser();
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

function clampRoomMinutes(value, fallback = 10) {
  return clampOptionNumber(value, fallback, 1, 20);
}

function clampIncrementSeconds(value, fallback = 0) {
  const rounded = clampOptionNumber(value, fallback, 0, 5);
  return ALLOWED_INCREMENT_SECONDS.has(rounded) ? rounded : fallback;
}

function inferMongoDatabaseName(uri) {
  if (!uri) return "";
  try {
    const parsed = new URL(uri);
    return String(parsed.pathname || "").replace(/^\/+/, "").trim();
  } catch {
    return "";
  }
}

function ensureDataFile(filePath, fallback) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
}

function resolveDatabaseFile() {
  const explicit = String(process.env.DMAIHXCAI_DB_PATH || "").trim();
  if (explicit) return path.resolve(explicit);

  const persistentCandidates = [
    process.env.RENDER_DISK_PATH,
    process.env.DMAIHXCAI_PERSIST_DIR,
    process.env.RENDER ? "/var/data" : ""
  ].filter(Boolean);

  for (const directory of persistentCandidates) {
    try {
      if (fs.existsSync(directory)) {
        return path.join(directory, "dmaihxcai.sqlite");
      }
    } catch {}
  }

  return path.join(DATA_DIR, "dmaihxcai.sqlite");
}

function isPersistentStoragePath(filePath) {
  const normalized = path.resolve(String(filePath || ""));
  const persistentRoots = [
    process.env.RENDER_DISK_PATH,
    process.env.DMAIHXCAI_PERSIST_DIR,
    process.env.RENDER ? "/var/data" : ""
  ].filter(Boolean).map((item) => path.resolve(item));
  return persistentRoots.some((rootPath) => normalized.startsWith(rootPath));
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

function createStateStore() {
  fs.mkdirSync(path.dirname(DATABASE_FILE), { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DATABASE_FILE);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  const selectStatement = db.prepare("SELECT value FROM app_state WHERE key = ?");
  const upsertStatement = db.prepare(`
    INSERT INTO app_state (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

  return {
    read(key, fallback, legacyFile) {
      const row = selectStatement.get(String(key));
      if (row?.value) {
        try {
          return JSON.parse(row.value);
        } catch {}
      }
      const legacy = readJsonFile(legacyFile, fallback);
      try {
        upsertStatement.run(String(key), JSON.stringify(legacy), Date.now());
      } catch {}
      return legacy;
    },
    write(key, value) {
      upsertStatement.run(String(key), JSON.stringify(value), Date.now());
    }
  };
}

function createMongoStateStore() {
  const state = {
    enabled: Boolean(MONGODB_URI),
    ready: false,
    client: null,
    collection: null,
    lastError: "",
    dbName: MONGODB_DB_NAME,
    collectionName: MONGODB_COLLECTION
  };

  return {
    get enabled() {
      return state.enabled;
    },
    get ready() {
      return state.ready;
    },
    get lastError() {
      return state.lastError;
    },
    get dbName() {
      return state.dbName;
    },
    get collectionName() {
      return state.collectionName;
    },
    noteError(message) {
      state.lastError = String(message || "");
    },
    async init() {
      if (!state.enabled) return false;
      if (state.ready && state.collection) return true;
      if (!MongoClient) {
        state.lastError = "mongodb package is not installed";
        console.warn("MongoDB is configured but the mongodb package is unavailable. Falling back to local persistence.");
        return false;
      }
      try {
        state.client = new MongoClient(MONGODB_URI, {
          maxPoolSize: 8,
          minPoolSize: 0,
          serverSelectionTimeoutMS: 8000
        });
        await state.client.connect();
        const db = state.client.db(state.dbName);
        state.collection = db.collection(state.collectionName);
        await state.collection.createIndex({ key: 1 }, { unique: true });
        state.ready = true;
        state.lastError = "";
        console.log(`MongoDB persistence ready: ${state.dbName}.${state.collectionName}`);
        return true;
      } catch (error) {
        state.ready = false;
        state.collection = null;
        state.lastError = String(error?.message || error);
        console.warn(`MongoDB persistence unavailable. Falling back to local storage. ${state.lastError}`);
        try {
          await state.client?.close();
        } catch {}
        state.client = null;
        return false;
      }
    },
    async read(key) {
      if (!state.ready || !state.collection) return null;
      const doc = await state.collection.findOne({ key: String(key) });
      return doc?.value ?? null;
    },
    async write(key, value) {
      if (!state.ready || !state.collection) return false;
      await state.collection.updateOne(
        { key: String(key) },
        {
          $set: {
            value: cloneJsonValue(value, value),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      return true;
    },
    async close() {
      try {
        await state.client?.close();
      } catch {}
      state.client = null;
      state.collection = null;
      state.ready = false;
    }
  };
}

function loadUsers() {
  const stateData = stateStore.read("users", { users: [] }, USERS_FILE);
  const legacyData = readJsonFile(USERS_FILE, { users: [] });
  const merged = mergeUsers(
    Array.isArray(stateData.users) ? stateData.users : [],
    Array.isArray(legacyData.users) ? legacyData.users : []
  );
  stateStore.write("users", { users: merged });
  writeJsonFile(USERS_FILE, { users: merged });
  return merged;
}

function loadRooms() {
  const stateData = stateStore.read("rooms", { rooms: [] }, ROOMS_FILE);
  const legacyData = readJsonFile(ROOMS_FILE, { rooms: [] });
  const list = mergeRooms(
    Array.isArray(stateData.rooms) ? stateData.rooms : [],
    Array.isArray(legacyData.rooms) ? legacyData.rooms : []
  );
  const map = new Map();
  const now = Date.now();
  list.forEach((room) => {
    if (!room || !room.key) return;
    const age = now - Number(room.updatedAt || room.createdAt || now);
    if (age > MAX_ROOM_AGE_MS) return;
    room.pendingRequest = room.pendingRequest || null;
    room.rematchReady = room.rematchReady || { w: false, b: false };
    room.startReady = room.startReady || { w: false, b: false };
    room.countdownEndsAt = Number(room.countdownEndsAt || 0);
    room.allowances = room.allowances || {
      w: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT },
      b: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT }
    };
    room.moves = Array.isArray(room.moves) ? room.moves : [];
    room.spectators = Array.isArray(room.spectators) ? [...new Set(room.spectators)] : [];
    room.chat = Array.isArray(room.chat) ? room.chat.slice(-MAX_CHAT_MESSAGES) : [];
    room.presence = room.presence && typeof room.presence === "object" ? room.presence : {};
    room.playerTimeMs = room.playerTimeMs && typeof room.playerTimeMs === "object" ? room.playerTimeMs : {};
    room.hiddenClockBonusMs = Math.max(
      0,
      Number(Object.prototype.hasOwnProperty.call(room, "hiddenClockBonusMs") ? room.hiddenClockBonusMs : 0)
    );
    room.incrementSeconds = clampIncrementSeconds(room.incrementSeconds, 0);
    room.incrementMs = room.incrementSeconds * 1000;
    if (room.players?.w && !room.playerTimeMs[room.players.w]) room.playerTimeMs[room.players.w] = room.timeControlMs || 0;
    if (room.players?.b && !room.playerTimeMs[room.players.b]) room.playerTimeMs[room.players.b] = room.timeControlMs || 0;
    room.pendingOpponentTimeMs = Number(room.pendingOpponentTimeMs || room.timeControlMs || 0);
    room.visibleClockSetupMs = room.visibleClockSetupMs && typeof room.visibleClockSetupMs === "object"
      ? {
          w: Number(room.visibleClockSetupMs.w || visibleClockSetupMsForSide(room, "w")),
          b: Number(room.visibleClockSetupMs.b || visibleClockSetupMsForSide(room, "b"))
        }
      : syncVisibleClockSetup(room);
    room.clocks = room.clocks || {
      w: startingClockMsForSide(room, "w"),
      b: startingClockMsForSide(room, "b")
    };
    room.initialClocks = room.initialClocks || { ...room.clocks };
    room.playerProfiles = room.playerProfiles && typeof room.playerProfiles === "object"
      ? {
          w: room.playerProfiles.w || roomPlayerSnapshot(room.players?.w),
          b: room.playerProfiles.b || roomPlayerSnapshot(room.players?.b)
        }
      : {
          w: roomPlayerSnapshot(room.players?.w),
          b: roomPlayerSnapshot(room.players?.b)
        };
    room.boardFen = room.boardFen || XiangqiCore.START_FEN;
    room.sideToMove = room.sideToMove === "b" ? "b" : "w";
    room.status = room.status || "waiting";
    map.set(room.key, room);
  });
  const mergedRooms = [...map.values()];
  stateStore.write("rooms", { rooms: mergedRooms });
  writeJsonFile(ROOMS_FILE, { rooms: mergedRooms });
  return map;
}

function saveUsers() {
  persistUsersLocally();
  const snapshot = cloneJsonValue({ users }, { users: [] });
  if (!mongoStateStore.ready) return Promise.resolve(false);
  pendingUserPersistence = pendingUserPersistence
    .catch(() => false)
    .then(() => mongoStateStore.write("users", snapshot))
    .catch((error) => {
      mongoStateStore.noteError(error?.message || error);
      console.warn(`MongoDB user persistence failed. Local copy is still saved. ${mongoStateStore.lastError}`);
      return false;
    });
  return pendingUserPersistence;
}

function saveRooms() {
  const serialized = [...rooms.values()];
  stateStore.write("rooms", { rooms: serialized });
  writeJsonFile(ROOMS_FILE, { rooms: serialized });
}

function persistUsersLocally() {
  stateStore.write("users", { users });
  writeJsonFile(USERS_FILE, { users });
}

function cloneJsonValue(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

async function flushUserPersistence() {
  try {
    await pendingUserPersistence;
    return true;
  } catch {
    return false;
  }
}

async function hydrateUsersFromMongo() {
  const ready = await mongoStateStore.init();
  if (!ready) return false;
  try {
    const remote = await mongoStateStore.read("users");
    const remoteUsers = Array.isArray(remote?.users) ? remote.users : [];
    if (remoteUsers.length) {
      users = mergeUsers(remoteUsers, users);
    }
    persistUsersLocally();
    await mongoStateStore.write("users", { users: cloneJsonValue(users, []) });
    return true;
  } catch (error) {
    mongoStateStore.noteError(error?.message || error);
    console.warn(`MongoDB bootstrap sync failed. Keeping local users. ${mongoStateStore.lastError}`);
    return false;
  }
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

function normalizeHistoryEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  return entries
    .filter((entry) => entry && typeof entry === "object")
    .filter((entry) => {
      const key = String(entry.id || `${entry.roomKey || ""}:${entry.endedAt || ""}:${entry.sideCode || entry.side || ""}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left.endedAt || left.startedAt || 0) || 0;
      const rightTime = Date.parse(right.endedAt || right.startedAt || 0) || 0;
      return rightTime - leftTime;
    })
    .slice(0, MAX_HISTORY_ITEMS);
}

function mergeHistoryEntries(existingEntries, nextEntries) {
  return normalizeHistoryEntries([
    ...(Array.isArray(nextEntries) ? nextEntries : []),
    ...(Array.isArray(existingEntries) ? existingEntries : [])
  ]);
}

function mergeUsers(primaryUsers, fallbackUsers) {
  const merged = [];
  const byId = new Map();
  const byEmail = new Map();
  const byUsername = new Map();

  function remember(user, index) {
    if (user.id) byId.set(user.id, index);
    if (user.email) byEmail.set(user.email, index);
    if (user.username) byUsername.set(user.username, index);
  }

  function normalizeLoadedUser(user) {
    if (!user || typeof user !== "object") return null;
    const email = normalizeEmail(user.email);
    const username = normalizeUsername(user.username);
    if (!email || !username || !user.passwordSalt || !user.passwordHash) return null;
    return {
      ...user,
      id: String(user.id || randomId(12)),
      email,
      username,
      role: user.role === "admin" ? "admin" : user.role === "guest" ? "guest" : "user",
      deviceId: sanitizeDeviceId(user.deviceId || ""),
      displayName: user.role === "guest"
        ? sanitizeOptionalDisplayName(user.displayName || "")
        : sanitizeDisplayName(user.displayName || "", user.username || ADMIN_DISPLAY_NAME),
      avatarSeed: String(user.avatarSeed || randomBase36(4)),
      avatarUrl: sanitizeAvatarUrl(user.avatarUrl || ""),
      history: normalizeHistoryEntries(user.history),
      createdAt: user.createdAt || nowIso()
    };
  }

  function upsert(sourceUser) {
    const user = normalizeLoadedUser(sourceUser);
    if (!user) return;
    const knownIndex = [byId.get(user.id), byEmail.get(user.email), byUsername.get(user.username)]
      .find((value) => Number.isInteger(value));
    if (!Number.isInteger(knownIndex)) {
      const index = merged.push(user) - 1;
      remember(user, index);
      return;
    }
    const existing = merged[knownIndex];
    const combined = {
      ...existing,
      ...user,
      history: mergeHistoryEntries(existing.history, user.history)
    };
    merged[knownIndex] = combined;
    remember(combined, knownIndex);
  }

  fallbackUsers.forEach(upsert);
  primaryUsers.forEach(upsert);
  return merged;
}

function mergeRooms(primaryRooms, fallbackRooms) {
  const merged = new Map();
  fallbackRooms.forEach((room) => {
    if (room?.key) merged.set(room.key, room);
  });
  primaryRooms.forEach((room) => {
    if (room?.key) merged.set(room.key, room);
  });
  return [...merged.values()];
}

function normalizePersonName(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}

function isValidDisplayName(value) {
  const text = normalizePersonName(value);
  return Boolean(text) && Array.from(text).length <= 15 && /^(?:\p{L}+(?: \p{L}+)*)$/u.test(text);
}

function requireDisplayName(value) {
  const text = normalizePersonName(value);
  if (!isValidDisplayName(text)) throw new Error("INVALID_DISPLAY_NAME");
  return text;
}

function sanitizeDisplayName(value, fallback = "") {
  const cleaned = isValidDisplayName(value) ? normalizePersonName(value) : "";
  const fallbackClean = isValidDisplayName(fallback) ? normalizePersonName(fallback) : "";
  return cleaned || fallbackClean || "";
}

function sanitizeOptionalDisplayName(value) {
  return isValidDisplayName(value) ? normalizePersonName(value) : "";
}

function sanitizeDeviceId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^[a-zA-Z0-9:_-]{8,120}$/.test(text)) return text;
  return "";
}

function sanitizeAvatarUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (DEVICE_AVATAR_PATHS.has(text)) return text;
  if (/^https?:\/\/\S+$/i.test(text)) return text.slice(0, 500);
  return "";
}

function ensureAdminUser() {
  const existing = users.find((user) => user?.role === "admin" || user?.email === ADMIN_EMAIL || user?.username === ADMIN_USERNAME);
  if (existing) {
    let changed = false;
    if (existing.role !== "admin") {
      existing.role = "admin";
      changed = true;
    }
    if (!existing.displayName) {
      existing.displayName = ADMIN_DISPLAY_NAME;
      changed = true;
    }
    if (!existing.avatarSeed) {
      existing.avatarSeed = randomBase36(4);
      changed = true;
    }
    if (!existing.createdAt) {
      existing.createdAt = nowIso();
      changed = true;
    }
    if (changed) saveUsers();
    return existing;
  }

  const passwordInfo = hashPassword(ADMIN_PASSWORD);
  const adminUser = {
    id: randomId(12),
    email: ADMIN_EMAIL,
    username: ADMIN_USERNAME,
    passwordSalt: passwordInfo.salt,
    passwordHash: passwordInfo.hash,
    role: "admin",
    displayName: ADMIN_DISPLAY_NAME,
    avatarSeed: randomBase36(4),
    avatarUrl: "",
    history: [],
    createdAt: nowIso()
  };
  users.push(adminUser);
  saveUsers();
  return adminUser;
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

function isAdminUser(user) {
  return user?.role === "admin";
}

function requireAdmin(req) {
  const user = requireUser(req);
  if (!isAdminUser(user)) throw new Error("FORBIDDEN_ADMIN");
  return user;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role === "admin" ? "admin" : user.role === "guest" ? "guest" : "user",
    displayName: user.displayName,
    avatarSeed: user.avatarSeed,
    avatarUrl: user.avatarUrl || "",
    history: Array.isArray(user.history) ? user.history.slice(0, MAX_HISTORY_ITEMS) : []
  };
}

function findGuestByDeviceId(deviceId) {
  const safeDeviceId = sanitizeDeviceId(deviceId);
  if (!safeDeviceId) return null;
  return users.find((item) => item?.role === "guest" && item.deviceId === safeDeviceId) || null;
}

function adminUserSummary(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role === "admin" ? "admin" : "user",
    displayName: user.displayName,
    avatarSeed: user.avatarSeed,
    avatarUrl: user.avatarUrl || "",
    createdAt: user.createdAt || nowIso(),
    history: normalizeHistoryEntries(user.history),
    historyCount: Array.isArray(user.history) ? user.history.length : 0
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

function syncRoomPlayerProfile(room, side, userOrId = room?.players?.[side]) {
  if (!room || !side) return null;
  room.playerProfiles = room.playerProfiles && typeof room.playerProfiles === "object"
    ? room.playerProfiles
    : { w: null, b: null };
  if (!userOrId) {
    room.playerProfiles[side] = null;
    return null;
  }
  const snapshot = typeof userOrId === "string" ? roomPlayerSnapshot(userOrId) : {
    id: userOrId.id,
    username: userOrId.username,
    displayName: userOrId.displayName,
    avatarSeed: userOrId.avatarSeed,
    avatarUrl: userOrId.avatarUrl || ""
  };
  room.playerProfiles[side] = snapshot || null;
  return room.playerProfiles[side];
}

function roomPlayerState(room, side) {
  if (!room || !side) return null;
  return cloneJsonValue(room.playerProfiles?.[side] || roomPlayerSnapshot(room.players?.[side]));
}

function uniqueGuestIdentity() {
  while (true) {
    const token = randomBase36(8).toLowerCase();
    const username = `guest-${token}`;
    const email = `${username}@guest.dmaihxcai.local`;
    if (!users.some((item) => item.username === username || item.email === email)) {
      return { username, email };
    }
  }
}

function createGuestUser(displayName = "", { deviceId = "", avatarUrl = "" } = {}) {
  const identity = uniqueGuestIdentity();
  const passwordInfo = hashPassword(randomId(18));
  const guestUser = {
    id: randomId(12),
    email: identity.email,
    username: identity.username,
    passwordSalt: passwordInfo.salt,
    passwordHash: passwordInfo.hash,
    role: "guest",
    deviceId: sanitizeDeviceId(deviceId),
    displayName: sanitizeOptionalDisplayName(displayName),
    avatarSeed: randomBase36(4),
    avatarUrl: sanitizeAvatarUrl(avatarUrl),
    history: [],
    createdAt: nowIso()
  };
  users.push(guestUser);
  saveUsers();
  return guestUser;
}

function updateUserDisplayName(user, displayName) {
  const nextName = sanitizeOptionalDisplayName(displayName);
  if (!user || !nextName || user.displayName === nextName) return false;
  user.displayName = nextName;
  saveUsers();
  return true;
}

function updateGuestDeviceProfile(user, { deviceId = "", avatarUrl = "" } = {}) {
  if (!user || user.role !== "guest") return false;
  let changed = false;
  const safeDeviceId = sanitizeDeviceId(deviceId);
  const safeAvatarUrl = sanitizeAvatarUrl(avatarUrl);
  if (safeDeviceId && user.deviceId !== safeDeviceId) {
    user.deviceId = safeDeviceId;
    changed = true;
  }
  if (safeAvatarUrl && user.avatarUrl !== safeAvatarUrl) {
    user.avatarUrl = safeAvatarUrl;
    changed = true;
  }
  if (changed) saveUsers();
  return changed;
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

function visibleClockSetupMsForSide(room, side) {
  const playerId = room.players?.[side];
  if (playerId && room.playerTimeMs?.[playerId]) return Number(room.playerTimeMs[playerId] || 0);
  return Number(room.pendingOpponentTimeMs || room.timeControlMs || 0);
}

function hiddenClockBonusMs(room) {
  return Math.max(0, Number(room?.hiddenClockBonusMs ?? ROOM_HIDDEN_CLOCK_BONUS_MS));
}

function startingClockMsForSide(room, side, { includeHiddenBonus = true } = {}) {
  const visible = visibleClockSetupMsForSide(room, side);
  return visible + (includeHiddenBonus ? hiddenClockBonusMs(room) : 0);
}

function syncVisibleClockSetup(room) {
  room.visibleClockSetupMs = {
    w: visibleClockSetupMsForSide(room, "w"),
    b: visibleClockSetupMsForSide(room, "b")
  };
  return room.visibleClockSetupMs;
}

function createRoom(user, { yourMinutes = 10, opponentMinutes = 10, side = "w", incrementSeconds = 0 } = {}) {
  const color = side === "b" ? "b" : "w";
  const yourTimeMs = clampRoomMinutes(yourMinutes, 10) * 60 * 1000;
  const opponentTimeMs = clampRoomMinutes(opponentMinutes, 10) * 60 * 1000;
  const safeIncrementSeconds = clampIncrementSeconds(incrementSeconds, 0);
  const hiddenBonusMs = ROOM_HIDDEN_CLOCK_BONUS_MS;
  const visibleClockSetupMs = {
    w: color === "w" ? yourTimeMs : opponentTimeMs,
    b: color === "b" ? yourTimeMs : opponentTimeMs
  };
  const room = {
    key: uniqueRoomKey(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "waiting",
    timeControlMs: Math.max(yourTimeMs, opponentTimeMs),
    boardFen: XiangqiCore.START_FEN,
    sideToMove: "w",
    activeSide: null,
    lastTickAt: null,
    players: {
      w: color === "w" ? user.id : null,
      b: color === "b" ? user.id : null
    },
    playerTimeMs: {
      [user.id]: yourTimeMs
    },
    pendingOpponentTimeMs: opponentTimeMs,
    hiddenClockBonusMs: hiddenBonusMs,
    visibleClockSetupMs,
    incrementSeconds: safeIncrementSeconds,
    incrementMs: safeIncrementSeconds * 1000,
    spectators: [],
    moves: [],
    chat: [],
    presence: {},
    clocks: {
      w: visibleClockSetupMs.w + hiddenBonusMs,
      b: visibleClockSetupMs.b + hiddenBonusMs
    },
    initialClocks: {
      w: visibleClockSetupMs.w + hiddenBonusMs,
      b: visibleClockSetupMs.b + hiddenBonusMs
    },
    allowances: {
      w: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT },
      b: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT }
    },
    pendingRequest: null,
    result: null,
    startReady: { w: false, b: false },
    countdownEndsAt: 0,
    playerProfiles: {
      w: color === "w" ? roomPlayerSnapshot(user.id) : null,
      b: color === "b" ? roomPlayerSnapshot(user.id) : null
    },
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
  if (room.status === "starting") {
    const now = Date.now();
    if (Number(room.countdownEndsAt || 0) > 0 && now >= Number(room.countdownEndsAt || 0)) {
      room.status = "active";
      room.activeSide = "w";
      room.sideToMove = "w";
      room.lastTickAt = now;
      room.countdownEndsAt = 0;
      room.updatedAt = now;
      saveRooms();
    }
    return;
  }
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
  syncVisibleClockSetup(room);
  room.boardFen = XiangqiCore.START_FEN;
  room.startFen = XiangqiCore.START_FEN;
  room.gameStartedAt = nowIso();
  room.sideToMove = "w";
  room.activeSide = null;
  room.lastTickAt = null;
  room.status = "starting";
  room.moves = [];
  room.clocks = {
    w: startingClockMsForSide(room, "w"),
    b: startingClockMsForSide(room, "b")
  };
  room.initialClocks = { ...room.clocks };
  room.allowances = {
    w: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT },
    b: { undoRemaining: ROOM_REQUEST_LIMIT, drawRemaining: ROOM_REQUEST_LIMIT }
  };
  room.pendingRequest = null;
  room.result = null;
  room.startReady = { w: false, b: false };
  room.countdownEndsAt = Date.now() + ROOM_START_DELAY_MS;
  room.rematchReady = { w: false, b: false };
  room.historySaved = false;
  room.updatedAt = Date.now();
}

function maybeStartRoom(room) {
  if (room.players?.w && room.players?.b && room.status === "waiting") {
    syncVisibleClockSetup(room);
    room.status = "ready";
    room.startReady = { w: false, b: false };
    room.countdownEndsAt = 0;
    room.pendingRequest = null;
    room.result = null;
    room.clocks = {
      w: startingClockMsForSide(room, "w"),
      b: startingClockMsForSide(room, "b")
    };
    room.initialClocks = { ...room.clocks };
    room.updatedAt = Date.now();
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
  const opponentProfile = room.playerProfiles?.[oppositeSide(side)] || null;
  return {
    id: randomId(10),
    roomKey: room.key,
    startedAt: room.gameStartedAt || nowIso(),
    endedAt: room.result?.endedAt || nowIso(),
    side: side === "w" ? "Đỏ" : "Đen",
    sideCode: side,
    opponent: opponentProfile?.displayName || opponentProfile?.username || opponent?.displayName || opponent?.username || "Đối thủ",
    result: outcome,
    reason: formatResultReason(room.result?.reason || "draw"),
    startFen: room.startFen || XiangqiCore.START_FEN,
    moves: room.moves.map((move) => move.notation),
    plies: room.moves.map((move, index) => ({
      index,
      side: move.side,
      move: move.move,
      notation: move.notation
    }))
  };
}

function appendHistory(user, entry) {
  user.history = Array.isArray(user.history) ? user.history : [];
  user.history.unshift(entry);
  user.history = user.history.slice(0, MAX_HISTORY_ITEMS);
}

function formatResultReason(reason) {
  return {
    checkmate: "Chiếu hết",
    "no-moves": "Hết nước hợp lệ",
    timeout: "Hết thời gian",
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
    if (access.role === "player" && access.side) syncRoomPlayerProfile(room, access.side, user);
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
  room.playerTimeMs = room.playerTimeMs && typeof room.playerTimeMs === "object" ? room.playerTimeMs : {};
  room.playerTimeMs[user.id] = Number(room.pendingOpponentTimeMs || room.timeControlMs || 0);
  syncRoomPlayerProfile(room, room.players.w === user.id ? "w" : "b", user);
  syncVisibleClockSetup(room);
  room.clocks = {
    w: startingClockMsForSide(room, "w"),
    b: startingClockMsForSide(room, "b")
  };
  room.initialClocks = { ...room.clocks };
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
  const bothPlayersJoined = Boolean(room.players?.w && room.players?.b);
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
    clockSetupMs: room.visibleClockSetupMs || {
      w: startingClockMsForSide(room, "w", { includeHiddenBonus: false }),
      b: startingClockMsForSide(room, "b", { includeHiddenBonus: false })
    },
    hiddenClockBonusMs: hiddenClockBonusMs(room),
    incrementSeconds: clampIncrementSeconds(room.incrementSeconds, 0),
    boardFen: room.boardFen,
    sideToMove: room.sideToMove,
    role: access.role,
    yourSide,
    viewSide: access.role === "player" ? yourSide : "w",
    bothPlayersJoined,
    waitingForOpponent,
    yourTurn: access.role === "player" && room.status === "active" && room.sideToMove === yourSide,
    players: {
      w: roomPlayerState(room, "w"),
      b: roomPlayerState(room, "b")
    },
    spectators,
    viewerCount: spectators.length,
    clocks: room.clocks,
    allowances: access.role === "player"
      ? room.allowances[yourSide] || { undoRemaining: 0, drawRemaining: 0 }
      : { undoRemaining: 0, drawRemaining: 0 },
    pendingRequest: viewerRequest,
    startReady: {
      you: access.role === "player" ? Boolean(room.startReady?.[yourSide]) : false,
      opponent: access.role === "player" ? Boolean(room.startReady?.[oppositeSide(yourSide)]) : false
    },
    countdownEndsAt: Number(room.countdownEndsAt || 0),
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
  materializeRoomClock(room);
  if (room.status !== "active") throw new Error("ROOM_NOT_ACTIVE");
  if (room.result) throw new Error("ROOM_FINISHED");
  if (room.pendingRequest) throw new Error("REQUEST_PENDING");
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
  room.clocks[side] = Number(room.clocks?.[side] || 0) + Number(room.incrementMs || 0);
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
  materializeRoomClock(room);
  if (room.status !== "active") throw new Error("ROOM_NOT_ACTIVE");
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
  materializeRoomClock(room);
  if (room.status !== "active") throw new Error("ROOM_NOT_ACTIVE");
  finishRoom(room, { winnerSide: oppositeSide(side), loserSide: side, reason: "resign" });
}

function setRematchReady(room, side, ready) {
  if (room.status !== "finished") throw new Error("ROOM_NOT_FINISHED");
  room.rematchReady[side] = Boolean(ready);
  room.updatedAt = Date.now();
  if (room.rematchReady.w && room.rematchReady.b) {
    const nextPlayers = { w: room.players.b, b: room.players.w };
    const nextProfiles = {
      w: cloneJsonValue(room.playerProfiles?.b || roomPlayerSnapshot(room.players?.b)),
      b: cloneJsonValue(room.playerProfiles?.w || roomPlayerSnapshot(room.players?.w))
    };
    room.players = nextPlayers;
    room.playerProfiles = nextProfiles;
    resetRoomForGame(room);
  }
  saveRooms();
}

function setStartReady(room, side, ready) {
  if (room.status !== "ready") throw new Error("ROOM_NOT_READY");
  if (!room.players?.w || !room.players?.b) throw new Error("ROOM_NOT_FULL");
  room.startReady = room.startReady || { w: false, b: false };
  room.startReady[side] = Boolean(ready);
  room.updatedAt = Date.now();
  if (room.startReady.w && room.startReady.b) {
    resetRoomForGame(room);
  }
  saveRooms();
}

function leaveRoom(room, userId) {
  const access = roomAccessForUser(room, userId);
  if (!access.role) return;

  delete room.presence?.[userId];

  if (access.role === "spectator") {
    room.spectators = Array.isArray(room.spectators) ? room.spectators.filter((id) => id !== userId) : [];
    room.updatedAt = Date.now();
    saveRooms();
    return;
  }

  const side = access.side;
  if (!side) return;

  if (room.status === "active") {
    finishRoom(room, { winnerSide: oppositeSide(side), loserSide: side, reason: "resign" });
    return;
  }

  if (room.status === "finished") {
    room.updatedAt = Date.now();
    saveRooms();
    return;
  }

  room.players[side] = null;
  syncRoomPlayerProfile(room, side, null);
  if (room.playerTimeMs && typeof room.playerTimeMs === "object") delete room.playerTimeMs[userId];
  room.startReady = { w: false, b: false };
  room.rematchReady = { w: false, b: false };
  room.countdownEndsAt = 0;
  room.pendingRequest = null;
  room.result = null;
  room.activeSide = null;
  room.lastTickAt = null;
  room.sideToMove = "w";
  room.boardFen = XiangqiCore.START_FEN;
  room.clocks = {
    w: startingClockMsForSide(room, "w"),
    b: startingClockMsForSide(room, "b")
  };
  room.initialClocks = { ...room.clocks };

  if (!room.players?.w && !room.players?.b) {
    rooms.delete(room.key);
  } else {
    room.status = room.players?.w && room.players?.b ? "ready" : "waiting";
    room.updatedAt = Date.now();
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

  async runAnalyze({ fen = "", moves = [], depth = 12, movetime = 0, multipv = 3, searchMoves = [] }) {
    await this.ensureStarted();
    if (this.searching) throw new Error("Engine đang phân tích, thử lại sau một nhịp.");
    this.searching = true;
    try {
      const safeMoves = moves.filter((move) => /^[a-i][0-9][a-i][0-9]$/.test(move));
      const safeSearchMoves = searchMoves.filter((move) => /^[a-i][0-9][a-i][0-9]$/.test(move));
      const safeFen = sanitizeFen(fen);
      const safeDepth = Math.max(1, Math.min(30, Number(depth) || 12));
      const safeTime = Math.max(0, Math.min(60000, Number(movetime) || 0));
      const safeMultiPv = Math.max(1, Math.min(5, Number(multipv) || 3));
      this.write(`setoption name MultiPV value ${safeMultiPv}`);
      await this.command("isready", (line) => line === "readyok", 8000);
      this.write(safeFen ? `position fen ${safeFen}` : `position startpos${safeMoves.length ? ` moves ${safeMoves.join(" ")}` : ""}`);
      const searchClause = safeSearchMoves.length ? ` searchmoves ${safeSearchMoves.join(" ")}` : "";
      const go = safeTime > 0 ? `go movetime ${safeTime}${searchClause}` : `go depth ${safeDepth}${searchClause}`;
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

function parseEngineScore(score) {
  const [kind, valueText] = String(score || "").trim().split(/\s+/);
  const value = Number(valueText || 0);
  if (kind === "mate") return { kind, value: Number.isFinite(value) ? value : 0 };
  return { kind: "cp", value: Number.isFinite(value) ? value : 0 };
}

function normalizedReviewScore(line) {
  const raw = parseEngineScore(line?.score || "");
  if (raw.kind === "mate") return Math.sign(raw.value || 1) * 31999;
  return raw.value;
}

function reviewGradeForMove(actualMove, bestMove, bestScore, actualScore) {
  if (!actualMove || !bestMove) {
    return { key: "okay", label: "Tạm", delta: 0 };
  }
  const delta = Math.max(0, Number(bestScore || 0) - Number(actualScore || 0));
  if (actualMove === bestMove || delta <= 14) {
    return { key: "brilliant", label: "Ưu việt", delta };
  }
  if (delta <= 70) {
    return { key: "good", label: "Tốt", delta };
  }
  if (delta <= 180) {
    return { key: "okay", label: "Tạm", delta };
  }
  return { key: "bad", label: "Tệ", delta };
}

async function analyzeHistoryGame({ startFen = XiangqiCore.START_FEN, plies = [], depth = 8, movetime = 180 }) {
  const safePlies = Array.isArray(plies) ? plies.filter((item) => /^[a-i][0-9][a-i][0-9]$/.test(String(item?.move || ""))) : [];
  const safeDepth = Math.max(4, Math.min(16, Number(depth) || 8));
  const safeMoveTime = Math.max(80, Math.min(1200, Number(movetime) || 180));
  let currentFen = sanitizeFen(startFen || XiangqiCore.START_FEN);
  const items = [];

  for (let index = 0; index < safePlies.length; index += 1) {
    const ply = safePlies[index];
    const parsed = XiangqiCore.parseFenState(currentFen);
    const side = ply.side === "b" ? "b" : parsed.side;
    const boardBefore = parsed.board;

    const best = await engine.analyze({
      fen: currentFen,
      moves: [],
      depth: safeDepth,
      movetime: safeMoveTime,
      multipv: 3
    });
    const rankedLines = Array.isArray(best.lines) ? best.lines : [];
    const matchedLine = rankedLines.find((line) => line?.pv?.[0] === ply.move);
    const bestScore = rankedLines.length ? normalizedReviewScore(rankedLines[0]) : 0;

    let actualScore = matchedLine ? normalizedReviewScore(matchedLine) : null;
    if (actualScore === null) {
      const actual = await engine.analyze({
        fen: currentFen,
        moves: [],
        depth: Math.max(4, safeDepth - 1),
        movetime: Math.max(80, Math.round(safeMoveTime * 0.7)),
        multipv: 1,
        searchMoves: [ply.move]
      });
      actualScore = actual.lines?.length ? normalizedReviewScore(actual.lines[0]) : bestScore;
    }

    let bestNotation = "";
    if (best.bestMove && /^[a-i][0-9][a-i][0-9]$/.test(best.bestMove)) {
      try {
        bestNotation = XiangqiCore.formatMoveNotation(best.bestMove, boardBefore, side);
      } catch {}
    }

    const grade = reviewGradeForMove(ply.move, best.bestMove || "", bestScore, actualScore);
    items.push({
      index,
      side,
      move: ply.move,
      notation: ply.notation || "",
      bestMove: best.bestMove || "",
      bestNotation,
      bestScore,
      actualScore,
      delta: grade.delta,
      grade: grade.key,
      gradeLabel: grade.label
    });

    if (!XiangqiCore.isLegalMove(boardBefore, ply.move, side)) {
      break;
    }
    XiangqiCore.applyMoveToBoard(boardBefore, ply.move);
    currentFen = XiangqiCore.boardToFen(boardBefore, side === "w" ? "b" : "w");
  }

  return { ok: true, items, depth: safeDepth, movetime: safeMoveTime };
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
        databaseFile: DATABASE_FILE,
        persistentStorage: isPersistentStoragePath(DATABASE_FILE),
        networkPath: path.join(SRC_DIR(), "pikafish.nnue"),
        networkExists: fs.existsSync(path.join(SRC_DIR(), "pikafish.nnue")),
        buildRunning: Boolean(buildJob),
        downloadRunning: Boolean(downloadJob),
        candidates: DEFAULT_ENGINE_CANDIDATES,
        mongoEnabled: mongoStateStore.enabled,
        mongoReady: mongoStateStore.ready,
        mongoDatabase: mongoStateStore.dbName,
        mongoCollection: mongoStateStore.collectionName,
        mongoError: mongoStateStore.lastError || ""
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

    if (url.pathname === "/api/auth/guest" && req.method === "POST") {
      const body = await readBody(req);
      const deviceId = sanitizeDeviceId(body.deviceId);
      const avatarUrl = sanitizeAvatarUrl(body.avatarUrl);
      const requestedDisplayName = body.displayName ? requireDisplayName(body.displayName) : "";
      let existing = getAuthenticatedUser(req);
      if (!existing && deviceId) {
        existing = findGuestByDeviceId(deviceId);
      }
      if (existing) {
        updateGuestDeviceProfile(existing, { deviceId, avatarUrl });
        if (requestedDisplayName) {
          updateUserDisplayName(existing, requestedDisplayName);
          await flushUserPersistence();
        }
        json(res, 200, { ok: true, token: createAuthToken(existing.id), user: publicUser(existing) });
        return;
      }
      const guest = createGuestUser(requestedDisplayName, { deviceId, avatarUrl });
      await flushUserPersistence();
      json(res, 200, { ok: true, token: createAuthToken(guest.id), user: publicUser(guest) });
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
        role: "user",
        displayName: sanitizeDisplayName("", username),
        avatarSeed: randomBase36(4),
        avatarUrl: "",
        history: [],
        createdAt: nowIso()
      };
      users.push(user);
      await saveUsers();
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
      json(res, 200, { ok: true, token: createAuthToken(user.id), user: publicUser(user) });
      return;
    }

    if (url.pathname === "/api/profile" && req.method === "POST") {
      const user = requireUser(req);
      const body = await readBody(req);
      const requestedDisplayName = body.displayName ? requireDisplayName(body.displayName) : "";
      const fallbackDisplayName = sanitizeDisplayName(user.displayName || "", ADMIN_DISPLAY_NAME);
      user.displayName = user.role === "guest"
        ? requestedDisplayName || sanitizeOptionalDisplayName(user.displayName || "")
        : sanitizeDisplayName(requestedDisplayName || "", fallbackDisplayName);
      user.avatarUrl = sanitizeAvatarUrl(body.avatarUrl);
      await saveUsers();
      json(res, 200, { ok: true, user: publicUser(user) });
      return;
    }

    if (url.pathname === "/api/history") {
      const user = requireUser(req);
      json(res, 200, { ok: true, history: Array.isArray(user.history) ? user.history.slice(0, MAX_HISTORY_ITEMS) : [] });
      return;
    }

    if (url.pathname === "/api/admin/users") {
      requireAdmin(req);
      const list = users
        .map((user) => adminUserSummary(user))
        .sort((left, right) => {
          const adminScore = (right.role === "admin") - (left.role === "admin");
          if (adminScore) return adminScore;
          return (Date.parse(right.createdAt || 0) || 0) - (Date.parse(left.createdAt || 0) || 0);
        });
      json(res, 200, { ok: true, users: list });
      return;
    }

    if (url.pathname === "/api/history/analyze" && req.method === "POST") {
      requireUser(req);
      syncEngineInstance();
      const body = await readBody(req);
      const result = await analyzeHistoryGame({
        startFen: body.startFen || XiangqiCore.START_FEN,
        plies: Array.isArray(body.plies) ? body.plies : [],
        depth: Number(body.depth) || 8,
        movetime: Number(body.movetime) || 180
      });
      json(res, 200, result);
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
      const requestedDisplayName = body.displayName ? requireDisplayName(body.displayName) : "";
      if (requestedDisplayName) {
        updateUserDisplayName(user, requestedDisplayName);
        await flushUserPersistence();
      }
      const yourMinutes = clampRoomMinutes(body.yourMinutes, 10);
      const opponentMinutes = clampRoomMinutes(body.opponentMinutes, 10);
      const side = body.side === "b" ? "b" : "w";
      const incrementSeconds = clampIncrementSeconds(body.incrementSeconds, 0);
      const current = currentRoomForUser(user.id);
      if (current && current.status !== "finished") {
        json(res, 400, { ok: false, error: "Bạn đang ở trong một phòng khác." });
        return;
      }
      const room = createRoom(user, { yourMinutes, opponentMinutes, side, incrementSeconds });
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/join" && req.method === "POST") {
      const user = requireUser(req);
      const body = await readBody(req);
      const requestedDisplayName = body.displayName ? requireDisplayName(body.displayName) : "";
      if (requestedDisplayName) {
        updateUserDisplayName(user, requestedDisplayName);
        await flushUserPersistence();
      }
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
      await flushUserPersistence();
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
      await flushUserPersistence();
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/resign" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      resignRoom(room, side);
      await flushUserPersistence();
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/ready" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      setStartReady(room, side, Boolean(body.ready));
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

    if (url.pathname === "/api/rooms/leave" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room } = requireRoomAndUser(req, body.key);
      leaveRoom(room, user.id);
      await flushUserPersistence();
      json(res, 200, { ok: true });
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
      FORBIDDEN_ADMIN: 403,
      INVALID_MOVE: 400,
      NOT_YOUR_TURN: 400,
      REQUEST_LIMIT_REACHED: 400,
      REQUEST_PENDING: 400,
      ROOM_NOT_ACTIVE: 400,
      ROOM_FINISHED: 400,
      ROOM_NOT_FINISHED: 400,
      ROOM_NOT_READY: 400,
      ROOM_NOT_FULL: 400,
      NO_PENDING_REQUEST: 400,
      NO_MOVE_TO_UNDO: 400,
      SELF_REQUEST: 400,
      INVALID_REQUEST: 400,
      INVALID_DISPLAY_NAME: 400,
      INVALID_SIDE: 400,
      SPECTATOR_READ_ONLY: 403,
      EMPTY_CHAT: 400
    }[message] || 500;
    json(res, status, { ok: false, error: friendlyErrorVi(message) });
  }
});

function friendlyErrorVi(code) {
  return {
    UNAUTHORIZED: "Bạn cần đăng nhập.",
    ROOM_NOT_FOUND: "Không tìm thấy phòng đấu.",
    ROOM_FULL: "Phòng đấu đã đủ người.",
    ROOM_CLOSED: "Phòng này không thể tham gia nữa.",
    FORBIDDEN_ROOM: "Bạn không thuộc phòng đấu này.",
    FORBIDDEN_ADMIN: "Bạn không có quyền quản trị.",
    INVALID_MOVE: "Nước đi không hợp lệ.",
    NOT_YOUR_TURN: "Chưa tới lượt bạn.",
    REQUEST_LIMIT_REACHED: "Bạn đã dùng hết lượt yêu cầu.",
    REQUEST_PENDING: "Đang có yêu cầu chờ đối thủ xác nhận.",
    ROOM_NOT_ACTIVE: "Phòng chưa sẵn sàng thi đấu.",
    ROOM_FINISHED: "Ván cờ đã kết thúc.",
    ROOM_NOT_FINISHED: "Ván cờ chưa kết thúc.",
    ROOM_NOT_READY: "Hai bên chưa ở trạng thái sẵn sàng bắt đầu.",
    ROOM_NOT_FULL: "Phòng chưa đủ hai người chơi.",
    NO_PENDING_REQUEST: "Không có yêu cầu đang chờ.",
    NO_MOVE_TO_UNDO: "Chưa có nước nào để đi lại.",
    SELF_REQUEST: "Bạn không thể tự xác nhận yêu cầu của mình.",
    INVALID_REQUEST: "Yêu cầu không hợp lệ.",
    INVALID_DISPLAY_NAME: "Tên người dùng chỉ được gồm chữ cái tiếng Việt và dấu cách, tối đa 15 ký tự.",
    INVALID_SIDE: "Phòng đấu đang lỗi về bên cầm quân.",
    SPECTATOR_READ_ONLY: "Người xem chỉ có thể quan sát và chat.",
    EMPTY_CHAT: "Nội dung chat không được để trống."
  }[code] || code;
}

async function startServer() {
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      console.log(`Pikafish analysis app: http://localhost:${PORT}`);
      if (!configuredEnginePath) {
        console.log("No engine binary found. Set PIKAFISH_ENGINE or configure it in the UI.");
      }
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(PORT);
  });

  Promise.resolve()
    .then(() => hydrateUsersFromMongo())
    .then(() => flushUserPersistence())
    .catch((error) => {
      console.warn(`Background persistence bootstrap failed. Continuing with local storage. ${error?.stack || error}`);
    });
}

startServer().catch((error) => {
  console.error(`Server bootstrap failed: ${error?.stack || error}`);
  process.exit(1);
});

function shutdownServer() {
  engine.stop();
  Promise.resolve(mongoStateStore.close()).finally(() => process.exit(0));
}

process.on("SIGINT", shutdownServer);
process.on("SIGTERM", shutdownServer);
