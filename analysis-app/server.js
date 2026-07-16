const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { DatabaseSync } = require("node:sqlite");
let PgPool = null;
let MongoClient = null;
try {
  ({ Pool: PgPool } = require("pg"));
} catch {}
try {
  ({ MongoClient } = require("mongodb"));
} catch {}

const XiangqiCore = require("./public/xiangqi-core.js");
const LocalVision = require("./local-vision.js");
const YoloVision = require("./yolo-vision.js");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = resolveDataDir();
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");
const LICENSES_FILE = path.join(DATA_DIR, "licenses.json");
const LICENSE_EXPORT_GLOB_PREFIX = "license-export";
const LICENSE_EXPORT_CURRENT_FILE = path.join(DATA_DIR, "license-export-current.json");
const ACCESS_KEYS_FILE = path.join(__dirname, "access-keys.json");
const DATABASE_FILE = resolveDatabaseFile();
const POSTGRES_URL_CONFIG = resolvePostgresUrlConfig();
const POSTGRES_URL = POSTGRES_URL_CONFIG.value;
const POSTGRES_TABLE = sqlIdentifier(process.env.DMAIHXCAI_POSTGRES_TABLE || "app_state");
const MONGODB_URI = String(process.env.MONGODB_URI || process.env.MONGO_URL || "").trim();
const MONGODB_DB_NAME = String(process.env.MONGODB_DB_NAME || inferMongoDatabaseName(MONGODB_URI) || "dmaihxcai").trim() || "dmaihxcai";
const MONGODB_COLLECTION = String(process.env.MONGODB_COLLECTION || "app_state").trim() || "app_state";
const PORT = Number(process.env.PORT || 5174);
const TOKEN_SECRET = process.env.DMAIHXCAI_AUTH_SECRET || "dmaihxcai-dev-secret";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 365 * 5;
const LICENSE_TOKEN_SECRET = process.env.DMAIHXCAI_LICENSE_SECRET || TOKEN_SECRET;
const LICENSE_TTL_MS = 1000 * 60 * 60 * 24 * 183;
const ROOM_REQUEST_LIMIT = 2;
const MAX_HISTORY_ITEMS = 20;
const MAX_OPENING_BOOKS = 40;
const MAX_OPENING_BOOK_NODES = 600;
const MAX_CHAT_MESSAGES = 80;
const MAX_ROOM_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const PRESENCE_TTL_MS = 1000 * 30;
const ROOM_START_DELAY_MS = 2000;
const ROOM_HIDDEN_CLOCK_BONUS_MS = 30 * 1000;
const ROOM_TURN_LIMIT_MS = 2 * 60 * 1000;
const ROOM_MAX_REPEATED_CHECKS = 6;
const ROOM_MAX_REPEATED_CHASES = 6;
const ROOM_REPETITION_WARNING_COUNT = 5;
const ROOM_REPETITION_DRAW_COUNT = 6;
const ROOM_RULE_NOTICE_MS = 3000;
const BOT_MOVE_DELAY_MS = Math.max(220, Math.min(1600, Number(process.env.DMAIHXCAI_BOT_MOVE_DELAY_MS) || 620));
const ENGINE_SCORE_SENSITIVITY = 2.35;
const ENGINE_SCORE_DISPLAY_LIMIT = 2200;
const VISION_DAILY_LIMIT = 10;
const ACCESS_KEYS_CONFIG = loadAccessKeysConfig();
const ADMIN_ACCESS_KEY = sanitizeAccessKey(process.env.DMAIHXCAI_ADMIN_ACCESS_KEY || ACCESS_KEYS_CONFIG.adminKey || "ADTAYDOC0703DUY");
const ADMIN_EMAIL = normalizeEmail(process.env.DMAIHXCAI_ADMIN_EMAIL || "admin@dmaihxcai.local");
const ADMIN_USERNAME = normalizeUsername(process.env.DMAIHXCAI_ADMIN_USERNAME || "ad");
const ADMIN_PASSWORD = String(process.env.DMAIHXCAI_ADMIN_PASSWORD || ADMIN_ACCESS_KEY || "ADTAYDOC0703DUY");
const ADMIN_ROOM_KEY = String(process.env.DMAIHXCAI_ADMIN_ROOM_KEY || ADMIN_ACCESS_KEY || ADMIN_PASSWORD);
const ADMIN_DISPLAY_NAME = sanitizeAccountName(process.env.DMAIHXCAI_ADMIN_DISPLAY_NAME || ACCESS_KEYS_CONFIG.adminName || "Admin", "Admin");
const ALLOWED_INCREMENT_SECONDS = new Set([0, 1, 2, 3, 5]);
const DEVICE_AVATAR_PATH_LIST = [
  "/assets/device-avatars/tv1.png",
  "/assets/device-avatars/tv2.png",
  "/assets/device-avatars/tv3.png",
  "/assets/device-avatars/tv4.png",
  "/assets/device-avatars/tv5.png",
  "/assets/device-avatars/tv6.png",
  "/assets/device-avatars/tv7.png",
  "/assets/device-avatars/tv8.png"
];
const DEVICE_AVATAR_PATHS = new Set(DEVICE_AVATAR_PATH_LIST);
const BOT_PLAYERS = [
  { level: 1, depth: 1, name: "Trọng Phúc" },
  { level: 2, depth: 2, name: "Văn Phương" },
  { level: 3, depth: 3, name: "Tùng Em" },
  { level: 4, depth: 4, name: "Hà Duy" },
  { level: 5, depth: 5, name: "Jack 97" },
  { level: 6, depth: 6, name: "Minh Trìu" },
  { level: 7, depth: 7, name: "Duy Mai" }
];
const BOT_USER_PREFIX = "bot-level-";
const botMoveJobs = new Map();
const licenseRateMap = new Map();

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

const DEFAULT_ENGINE_CANDIDATES = [
  process.env.PIKAFISH_ENGINE,
  path.join(ROOT, "src", "pikafish.exe"),
  path.join(ROOT, "src", "pikafish"),
  path.join(ROOT, "pikafish.exe"),
  path.join(ROOT, "pikafish")
].filter(Boolean);
const DEFAULT_ENGINE_THREADS = clampOptionNumber(process.env.PIKAFISH_THREADS, Math.max(1, Math.min(2, cpuCount())), 1, 16);
const DEFAULT_ENGINE_HASH_MB = clampOptionNumber(process.env.PIKAFISH_HASH_MB, 128, 16, 1024);
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_VISION_MODEL = String(process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini").trim() || "gpt-4.1-mini";
const OPENAI_VISION_MODEL_FALLBACKS = [...new Set([OPENAI_VISION_MODEL, "gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"].filter(Boolean))];

ensureDataFile(USERS_FILE, { users: [] });
ensureDataFile(ROOMS_FILE, { rooms: [] });
ensureDataFile(LICENSES_FILE, { licenses: [] });

const stateStore = createStateStore();
const postgresStateStore = createPostgresStateStore();
const mongoStateStore = createMongoStateStore();
let pendingUserPersistence = Promise.resolve();
let licenseState = loadLicenseState();

if (process.env.RENDER && !isPersistentStoragePath(DATABASE_FILE)) {
  console.warn(`Render is using ephemeral storage for SQLite at ${DATABASE_FILE}. Mount a disk and point DMAIHXCAI_DB_PATH to it if you want accounts and rooms to survive redeploys.`);
}
if (process.env.RENDER && !isPersistentStoragePath(LICENSES_FILE)) {
  console.warn(`Render is using ephemeral storage for licenses at ${LICENSES_FILE}. Mount a persistent disk and set DMAIHXCAI_DATA_DIR if you want activated keys to survive deploys.`);
}

let configuredEnginePath = DEFAULT_ENGINE_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || "";
let buildJob = null;
let downloadJob = null;
let users = loadUsers();
restoreLicenseStateFromUsers();
pruneLegacyAccessKeyUsers();
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

function resolveDataDir() {
  const explicit = String(process.env.DMAIHXCAI_DATA_DIR || "").trim();
  if (explicit) return path.resolve(explicit);

  const persistentCandidates = [
    process.env.RENDER_DISK_PATH,
    process.env.DMAIHXCAI_PERSIST_DIR,
    process.env.RENDER ? "/var/data" : ""
  ].filter(Boolean);

  for (const directory of persistentCandidates) {
    try {
      if (fs.existsSync(directory)) return path.resolve(directory);
    } catch {}
  }

  return path.join(__dirname, "data");
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

function sqlIdentifier(value) {
  const safe = String(value || "app_state").trim();
  const name = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(safe) ? safe : "app_state";
  return `"${name.replace(/"/g, "\"\"")}"`;
}

function resolvePostgresUrlConfig() {
  const candidates = ["DATABASE_URL", "POSTGRES_URL", "SUPABASE_DB_URL"];
  for (const name of candidates) {
    const value = String(process.env[name] || "").trim();
    if (value) return { name, value };
  }
  return { name: "", value: "" };
}

function maskPostgresUser(username) {
  const value = String(username || "");
  if (!value) return "";
  if (value.length <= 18) return value;
  return `${value.slice(0, 12)}...${value.slice(-4)}`;
}

function describePostgresConnection() {
  const description = {
    source: POSTGRES_URL_CONFIG.name || "",
    configured: Boolean(POSTGRES_URL),
    userPreview: "",
    userHasProjectRef: false,
    host: "",
    port: "",
    database: "",
    passwordSet: false,
    passwordPlaceholder: false,
    kind: "",
    parseError: ""
  };
  if (!POSTGRES_URL) return description;
  description.passwordPlaceholder = /\[YOUR-PASSWORD\]/i.test(POSTGRES_URL);
  try {
    const parsed = new URL(POSTGRES_URL);
    const username = decodeURIComponent(parsed.username || "");
    const host = parsed.hostname || "";
    description.userPreview = maskPostgresUser(username);
    description.userHasProjectRef = /^postgres\./i.test(username);
    description.host = host;
    description.port = parsed.port || (parsed.protocol === "postgresql:" ? "5432" : "");
    description.database = decodeURIComponent((parsed.pathname || "").replace(/^\/+/, ""));
    description.passwordSet = Boolean(parsed.password);
    description.passwordPlaceholder = description.passwordPlaceholder || /\[YOUR-PASSWORD\]/i.test(decodeURIComponent(parsed.password || ""));
    description.kind = host.includes("pooler.supabase.com")
      ? "supabase-pooler"
      : host.includes(".supabase.co")
        ? "supabase-direct"
        : "postgres";
  } catch (error) {
    description.parseError = String(error?.message || error);
  }
  return description;
}

function postgresNeedsSsl(uri) {
  if (!uri) return false;
  const sslMode = String(process.env.PGSSLMODE || "").trim().toLowerCase();
  if (sslMode === "disable") return false;
  if (sslMode === "require") return true;
  try {
    const parsed = new URL(uri);
    const querySslMode = String(parsed.searchParams.get("sslmode") || "").toLowerCase();
    if (querySslMode === "disable") return false;
    if (querySslMode === "require" || querySslMode === "no-verify") return true;
    return !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return true;
  }
}

function createPostgresStateStore() {
  const state = {
    enabled: Boolean(POSTGRES_URL),
    ready: false,
    pool: null,
    lastError: "",
    tableName: POSTGRES_TABLE
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
    get tableName() {
      return state.tableName;
    },
    noteError(message) {
      state.lastError = String(message || "");
    },
    async init() {
      if (!state.enabled) return false;
      if (state.ready && state.pool) return true;
      if (!PgPool) {
        state.lastError = "pg package is not installed";
        console.warn("PostgreSQL is configured but the pg package is unavailable. Falling back to local persistence.");
        return false;
      }
      try {
        state.pool = new PgPool({
          connectionString: POSTGRES_URL,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 8000,
          ...(postgresNeedsSsl(POSTGRES_URL) ? { ssl: { rejectUnauthorized: false } } : {})
        });
        await state.pool.query(`
          CREATE TABLE IF NOT EXISTS ${state.tableName} (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        state.ready = true;
        state.lastError = "";
        console.log(`PostgreSQL persistence ready: ${state.tableName}`);
        return true;
      } catch (error) {
        state.ready = false;
        state.lastError = String(error?.message || error);
        console.warn(`PostgreSQL persistence unavailable. Falling back to local storage. ${state.lastError}`);
        try {
          await state.pool?.end();
        } catch {}
        state.pool = null;
        return false;
      }
    },
    async read(key) {
      if (!state.ready || !state.pool) return null;
      const result = await state.pool.query(`SELECT value FROM ${state.tableName} WHERE key = $1`, [String(key)]);
      return result.rows[0]?.value ?? null;
    },
    async write(key, value) {
      if (!state.ready || !state.pool) return false;
      await state.pool.query(
        `
          INSERT INTO ${state.tableName} (key, value, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = EXCLUDED.updated_at
        `,
        [String(key), JSON.stringify(cloneJsonValue(value, value))]
      );
      return true;
    },
    async close() {
      try {
        await state.pool?.end();
      } catch {}
      state.pool = null;
      state.ready = false;
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
    room.incrementSeconds = clampIncrementSeconds(room.incrementSeconds, 0);
    room.incrementMs = room.incrementSeconds * 1000;
    room.hiddenClockBonusMs = room.incrementSeconds === 0 ? ROOM_HIDDEN_CLOCK_BONUS_MS : 0;
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
    room.turnStartedAt = Number(room.turnStartedAt || (room.status === "active" ? room.lastTickAt || room.updatedAt || now : 0));
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
  const writers = remoteStateWrites("users", snapshot);
  if (!writers.length) return Promise.resolve(false);
  pendingUserPersistence = pendingUserPersistence
    .catch(() => false)
    .then(() => Promise.allSettled(writers))
    .then((results) => results.some((result) => result.status === "fulfilled" && result.value))
    .catch((error) => {
      console.warn(`Remote user persistence failed. Local copy is still saved. ${error?.message || error}`);
      return false;
    });
  return pendingUserPersistence;
}

function saveRooms() {
  const serialized = [...rooms.values()];
  stateStore.write("rooms", { rooms: serialized });
  writeJsonFile(ROOMS_FILE, { rooms: serialized });
  persistStateRemotely("rooms", { rooms: serialized }).catch(() => {});
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

async function hydrateUsersFromPostgres() {
  return hydrateStateFromRemoteStore(postgresStateStore, "PostgreSQL");
}

async function hydrateUsersFromMongo() {
  return hydrateStateFromRemoteStore(mongoStateStore, "MongoDB");
}

async function hydrateStateFromRemoteStore(remoteStore, label) {
  const ready = await remoteStore.init();
  if (!ready) return false;
  try {
    const remote = await remoteStore.read("users");
    const remoteUsers = Array.isArray(remote?.users) ? remote.users : [];
    if (remoteUsers.length) {
      users = mergeUsers(remoteUsers, users);
    }
    persistUsersLocally();
    const remoteLicenses = await remoteStore.read("licenses");
    if (Array.isArray(remoteLicenses?.licenses)) {
      const remoteByHash = new Map();
      remoteLicenses.licenses.forEach((entry) => {
        const normalized = normalizeLicenseRecord(entry);
        if (normalized) remoteByHash.set(normalized.keyHash, normalized);
      });
      licenseState = {
        version: 2,
        updatedAt: nowIso(),
        licenses: ACCESS_KEYS_CONFIG.licenses.map((catalogEntry) => {
          const remoteEntry = remoteByHash.get(catalogEntry.keyHash);
          return normalizeLicenseRecord({ ...catalogEntry, ...(remoteEntry || {}) }, catalogEntry);
        }).filter(Boolean)
      };
    }
    restoreLicenseStateFromUsers();
    await remoteStore.write("users", { users: cloneJsonValue(users, []) });
    await remoteStore.write("licenses", cloneJsonValue(licenseState, { licenses: [] }));
    const serializedRooms = [...rooms.values()];
    if (serializedRooms.length) await remoteStore.write("rooms", { rooms: serializedRooms });
    return true;
  } catch (error) {
    remoteStore.noteError(error?.message || error);
    console.warn(`${label} bootstrap sync failed. Keeping local users. ${remoteStore.lastError}`);
    return false;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function vietnamDateKey(date = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(date));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
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

function normalizeOpeningNode(node, counter) {
  if (!node || typeof node !== "object" || counter.count >= MAX_OPENING_BOOK_NODES) {
    return { move: "", notation: "", children: [] };
  }
  counter.count += 1;
  const move = /^[a-i][0-9][a-i][0-9]$/.test(String(node.move || "")) ? String(node.move) : "";
  const notation = String(node.notation || "").trim().slice(0, 32);
  const children = Array.isArray(node.children)
    ? node.children
        .slice(0, Math.max(0, MAX_OPENING_BOOK_NODES - counter.count))
        .map((child) => normalizeOpeningNode(child, counter))
        .filter((child) => child.move)
    : [];
  return { move, notation, children };
}

function normalizeOpeningBookEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const counter = { count: 0 };
  const tree = normalizeOpeningNode(entry.tree || {}, counter);
  const name = sanitizeAccountName(entry.name || "", "").slice(0, 60);
  if (!name) return null;
  return {
    id: String(entry.id || randomId(10)).slice(0, 40),
    name,
    createdAt: entry.createdAt && !Number.isNaN(Date.parse(entry.createdAt)) ? entry.createdAt : nowIso(),
    updatedAt: entry.updatedAt && !Number.isNaN(Date.parse(entry.updatedAt)) ? entry.updatedAt : nowIso(),
    startFen: String(entry.startFen || XiangqiCore.START_FEN).trim().slice(0, 160) || XiangqiCore.START_FEN,
    nodeCount: counter.count,
    tree
  };
}

function normalizeOpeningBooks(entries) {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  return entries
    .map(normalizeOpeningBookEntry)
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt || left.createdAt || 0) || 0;
      const rightTime = Date.parse(right.updatedAt || right.createdAt || 0) || 0;
      return rightTime - leftTime;
    })
    .slice(0, MAX_OPENING_BOOKS);
}

function saveOpeningBookForUser(user, payload) {
  if (!user) return null;
  const now = nowIso();
  const incoming = normalizeOpeningBookEntry({
    ...payload,
    id: payload?.id || randomId(10),
    createdAt: payload?.createdAt || now,
    updatedAt: now
  });
  if (!incoming) return null;
  const existing = normalizeOpeningBooks(user.openingBooks);
  const index = existing.findIndex((book) => book.id === incoming.id);
  if (index >= 0) {
    incoming.createdAt = existing[index].createdAt || incoming.createdAt;
    existing.splice(index, 1);
  }
  user.openingBooks = normalizeOpeningBooks([incoming, ...existing]);
  return incoming;
}

function deleteOpeningBookForUser(user, bookId) {
  if (!user) return false;
  const id = String(bookId || "").trim();
  const before = normalizeOpeningBooks(user.openingBooks);
  user.openingBooks = before.filter((book) => book.id !== id);
  return user.openingBooks.length !== before.length;
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
    const accessKeyHash = String(user.accessKeyHash || "").trim();
    return {
      ...user,
      id: String(user.id || randomId(12)),
      email,
      username,
      role: user.role === "admin" ? "admin" : user.role === "guest" ? "guest" : "user",
      deviceId: sanitizeDeviceId(user.deviceId || ""),
      displayName: accessKeyHash
        ? sanitizeAccountName(user.displayName || "", user.username || "")
        : user.role === "guest"
        ? sanitizeOptionalDisplayName(user.displayName || "")
        : sanitizeDisplayName(user.displayName || "", user.username || ADMIN_DISPLAY_NAME),
      accessKeyHash,
      accessKeySlot: Math.max(0, Number(user.accessKeySlot || 0) || 0),
      keyActivatedAt: user.keyActivatedAt && !Number.isNaN(Date.parse(user.keyActivatedAt)) ? user.keyActivatedAt : "",
      avatarSeed: String(user.avatarSeed || randomBase36(4)),
      avatarUrl: sanitizeAvatarUrl(user.avatarUrl || ""),
      history: normalizeHistoryEntries(user.history),
      openingBooks: normalizeOpeningBooks(user.openingBooks),
      createdAt: user.createdAt || nowIso(),
      lastSeenAt: user.lastSeenAt || "",
      currentActivity: sanitizeUserActivity(user.currentActivity || {}),
      adminTracked: Boolean(user.adminTracked),
      adminTrackedAt: user.adminTrackedAt && !Number.isNaN(Date.parse(user.adminTrackedAt)) ? user.adminTrackedAt : "",
      activeSessionId: String(user.activeSessionId || ""),
      activeDeviceId: sanitizeDeviceId(user.activeDeviceId || ""),
      activeSessionStartedAt: user.activeSessionStartedAt && !Number.isNaN(Date.parse(user.activeSessionStartedAt)) ? user.activeSessionStartedAt : "",
      activeSessionSeenAt: user.activeSessionSeenAt && !Number.isNaN(Date.parse(user.activeSessionSeenAt)) ? user.activeSessionSeenAt : "",
      rememberedDevices: Array.isArray(user.rememberedDevices)
        ? user.rememberedDevices
            .map((device) => ({
              deviceId: sanitizeDeviceId(device?.deviceId || ""),
              firstSeenAt: device?.firstSeenAt && !Number.isNaN(Date.parse(device.firstSeenAt)) ? device.firstSeenAt : "",
              lastSeenAt: device?.lastSeenAt && !Number.isNaN(Date.parse(device.lastSeenAt)) ? device.lastSeenAt : ""
            }))
            .filter((device) => device.deviceId)
            .slice(0, 12)
        : []
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
      history: mergeHistoryEntries(existing.history, user.history),
      openingBooks: normalizeOpeningBooks([
        ...(Array.isArray(user.openingBooks) ? user.openingBooks : []),
        ...(Array.isArray(existing.openingBooks) ? existing.openingBooks : [])
      ])
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

function sanitizeAccessKey(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
}

function hashAccessKey(value) {
  const normalized = sanitizeAccessKey(value);
  return normalized ? crypto.createHash("sha256").update(`dmaihxcai-access-key:${normalized}`).digest("hex") : "";
}

function remoteStateWrites(key, value) {
  const snapshot = cloneJsonValue(value, value);
  const writes = [];
  if (postgresStateStore.ready) {
    writes.push(postgresStateStore.write(key, snapshot).catch((error) => {
      postgresStateStore.noteError(error?.message || error);
      console.warn(`PostgreSQL ${key} persistence failed. ${postgresStateStore.lastError}`);
      return false;
    }));
  }
  if (mongoStateStore.ready) {
    writes.push(mongoStateStore.write(key, snapshot).catch((error) => {
      mongoStateStore.noteError(error?.message || error);
      console.warn(`MongoDB ${key} persistence failed. ${mongoStateStore.lastError}`);
      return false;
    }));
  }
  return writes;
}

async function persistStateRemotely(key, value) {
  const writes = remoteStateWrites(key, value);
  if (!writes.length) return false;
  const results = await Promise.allSettled(writes);
  return results.some((result) => result.status === "fulfilled" && result.value);
}

function hashLicenseKey(value) {
  const normalized = sanitizeAccessKey(value);
  return normalized ? crypto.createHash("sha256").update(`dmaihxcai-license:${normalized}`).digest("hex") : "";
}

function isAdminLicenseKeyHash(keyHash) {
  const hash = String(keyHash || "").trim().toLowerCase();
  return Boolean(hash) && (
    hash === ACCESS_KEYS_CONFIG.adminKeyHash ||
    hash === hashLicenseKey(ADMIN_ACCESS_KEY)
  );
}

function loadAccessKeysConfig() {
  const fallback = {
    version: 2,
    adminKeyHash: hashLicenseKey("ADTAYDOC0703DUY"),
    adminName: "Admin",
    licenses: []
  };
  const raw = readJsonFile(ACCESS_KEYS_FILE, fallback);
  const seen = new Set();
  const entries = (Array.isArray(raw.licenses) ? raw.licenses : [])
    .map((entry, index) => {
      const keyHash = String(entry?.keyHash || "").trim().toLowerCase();
      const slot = Math.max(1, Number(entry?.slot || index + 1) || index + 1);
      const id = String(entry?.id || `lic-${String(slot).padStart(3, "0")}`).trim();
      return {
        id,
        slot,
        keyHash,
        status: ["unused", "activated", "expired"].includes(entry?.status) ? entry.status : "unused",
        customerName: sanitizeAccountName(entry?.customerName || "", ""),
        activatedAt: entry?.activatedAt && !Number.isNaN(Date.parse(entry.activatedAt)) ? entry.activatedAt : "",
        expiresAt: entry?.expiresAt && !Number.isNaN(Date.parse(entry.expiresAt)) ? entry.expiresAt : ""
      };
    })
    .filter((entry) => {
      if (!/^[a-f0-9]{64}$/.test(entry.keyHash) || seen.has(entry.keyHash)) return false;
      seen.add(entry.keyHash);
      return true;
    })
    .slice(0, 100);
  return {
    adminKeyHash: /^[a-f0-9]{64}$/.test(String(raw.adminKeyHash || "").trim().toLowerCase())
      ? String(raw.adminKeyHash).trim().toLowerCase()
      : fallback.adminKeyHash,
    adminName: sanitizeAccountName(raw.adminName || fallback.adminName, fallback.adminName),
    licenses: entries
  };
}

function normalizeLicenseRecord(entry, fallback = {}) {
  const keyHash = String(entry?.keyHash || fallback.keyHash || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(keyHash)) return null;
  const slot = Math.max(1, Number(entry?.slot || fallback.slot || 1) || 1);
  const id = String(entry?.id || fallback.id || `lic-${String(slot).padStart(3, "0")}`).trim();
  const activatedAt = entry?.activatedAt && !Number.isNaN(Date.parse(entry.activatedAt)) ? entry.activatedAt : "";
  const expiresAt = entry?.expiresAt && !Number.isNaN(Date.parse(entry.expiresAt)) ? entry.expiresAt : "";
  const expired = expiresAt && Date.parse(expiresAt) <= Date.now();
  const status = expired
    ? "expired"
    : ["unused", "activated"].includes(entry?.status)
    ? entry.status
    : activatedAt
    ? "activated"
    : "unused";
  return {
    id,
    slot,
    keyHash,
    status,
    customerName: sanitizeAccountName(entry?.customerName || "", ""),
    activatedAt,
    expiresAt,
    userId: String(entry?.userId || "")
  };
}

function loadLicenseState() {
  const stateData = stateStore.read("licenses", { licenses: [] }, LICENSES_FILE);
  const legacyData = readJsonFile(LICENSES_FILE, { licenses: [] });
  const storedByHash = new Map();
  [
    ...(Array.isArray(stateData.licenses) ? stateData.licenses : []),
    ...(Array.isArray(legacyData.licenses) ? legacyData.licenses : [])
  ].forEach((entry) => {
    const normalized = normalizeLicenseRecord(entry);
    if (normalized) storedByHash.set(normalized.keyHash, normalized);
  });
  const licenses = ACCESS_KEYS_CONFIG.licenses.map((catalogEntry) => {
    const storedEntry = storedByHash.get(catalogEntry.keyHash);
    return normalizeLicenseRecord({ ...catalogEntry, ...(storedEntry || {}) }, catalogEntry);
  }).filter(Boolean);
  const nextState = {
    version: 2,
    updatedAt: nowIso(),
    licenses
  };
  persistLicenseState(nextState);
  return nextState;
}

function saveLicenseState() {
  licenseState.updatedAt = nowIso();
  persistLicenseState(licenseState);
}

function persistLicenseState(state) {
  const snapshot = cloneJsonValue(state, { licenses: [] });
  stateStore.write("licenses", snapshot);
  writeJsonFile(LICENSES_FILE, snapshot);
  persistStateRemotely("licenses", snapshot).catch(() => {});
}

function restoreLicenseStateFromUsers() {
  if (!Array.isArray(users) || !users.length) return false;
  let changed = false;
  users.forEach((user) => {
    if (!user || user.role === "admin" || !user.accessKeyHash) return;
    const license = licenseByHash(user.accessKeyHash);
    if (!license) return;
    if (!user.keyActivatedAt && license.status !== "activated" && !license.activatedAt) {
      if (license.userId !== user.id) {
        license.userId = user.id;
        changed = true;
      }
      if (user.licenseId !== license.id) {
        user.licenseId = license.id;
        changed = true;
      }
      return;
    }
    const activatedAt = user.keyActivatedAt || license.activatedAt || user.createdAt || nowIso();
    const expiresAt = user.licenseExpiresAt || license.expiresAt || licenseExpiryFrom(activatedAt);
    const expired = Date.parse(expiresAt) <= Date.now();
    const nextStatus = expired ? "expired" : "activated";
    if (
      license.status !== nextStatus ||
      license.customerName !== (user.displayName || license.customerName || "") ||
      license.activatedAt !== activatedAt ||
      license.expiresAt !== expiresAt ||
      license.userId !== user.id
    ) {
      license.status = nextStatus;
      license.customerName = user.displayName || license.customerName || "";
      license.activatedAt = activatedAt;
      license.expiresAt = expiresAt;
      license.userId = user.id;
      changed = true;
    }
    if (user.licenseId !== license.id) {
      user.licenseId = license.id;
      changed = true;
    }
    if (user.licenseExpiresAt !== expiresAt) {
      user.licenseExpiresAt = expiresAt;
      changed = true;
    }
  });
  if (changed) {
    saveLicenseState();
    persistUsersLocally();
  }
  return changed;
}

function licenseByHash(keyHash) {
  return licenseState.licenses.find((entry) => entry.keyHash === String(keyHash || "").trim().toLowerCase()) || null;
}

function licenseById(licenseId) {
  return licenseState.licenses.find((entry) => entry.id === String(licenseId || "")) || null;
}

function licenseExpiryFrom(activatedAt) {
  const date = new Date(activatedAt || Date.now());
  date.setMonth(date.getMonth() + 6);
  return date.toISOString();
}

function refreshLicenseExpiry(license) {
  if (!license || license.status !== "activated" || !license.expiresAt) return license;
  if (Date.parse(license.expiresAt) <= Date.now()) {
    license.status = "expired";
    saveLicenseState();
  }
  return license;
}

function licenseTimeRemaining(license) {
  refreshLicenseExpiry(license);
  if (!license?.expiresAt || license.status !== "activated") return { expired: license?.status === "expired", ms: 0, days: 0, hours: 0, label: "" };
  const ms = Math.max(0, Date.parse(license.expiresAt) - Date.now());
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return {
    expired: ms <= 0,
    ms,
    days,
    hours,
    label: `${days} ngay ${String(hours).padStart(2, "0")} gio`
  };
}

function maskedLicenseKey(license) {
  const tail = String(license?.keyHash || "").slice(-4).toUpperCase() || "----";
  return `HXC-****-${tail}`;
}

function loadRawLicenseExport() {
  const exportFile = latestLicenseExportFile();
  if (!exportFile) return { file: "", keys: [] };
  const data = readJsonFile(exportFile, {});
  const keys = Array.isArray(data.keys) ? data.keys : [];
  return { file: exportFile, keys };
}

function rawLicenseKeyMap() {
  const map = new Map();
  const { keys } = loadRawLicenseExport();
  keys.forEach((entry) => {
    const key = sanitizeAccessKey(entry?.key);
    const keyHash = hashLicenseKey(key);
    if (key && keyHash) map.set(keyHash, key);
  });
  return map;
}

function normalizeLicenseExportPayload(payload) {
  let source = payload;
  if (typeof payload?.rawText === "string") {
    try {
      source = JSON.parse(payload.rawText);
    } catch {
      throw new Error("INVALID_LICENSE_EXPORT");
    }
  }
  const keys = Array.isArray(source?.keys)
    ? source.keys
    : Array.isArray(source?.licenses)
    ? source.licenses
    : [];
  const catalogByHash = new Map(licenseState.licenses.map((license) => [license.keyHash, license]));
  const seen = new Set();
  const normalized = [];

  keys.forEach((entry) => {
    const key = sanitizeAccessKey(entry?.key || entry?.licenseKey || "");
    const keyHash = hashLicenseKey(key);
    const license = catalogByHash.get(keyHash);
    if (!key || !license || seen.has(keyHash)) return;
    seen.add(keyHash);
    normalized.push({ slot: license.slot, key });
  });

  if (normalized.length !== licenseState.licenses.length) {
    throw new Error("INVALID_LICENSE_EXPORT");
  }

  normalized.sort((left, right) => left.slot - right.slot);
  return {
    generatedAt: source?.generatedAt || nowIso(),
    importedAt: nowIso(),
    note: "File nay chua key goc de Admin xem va phan phoi. Khong commit cong khai.",
    keys: normalized
  };
}

function importLicenseExport(payload) {
  const exportData = normalizeLicenseExportPayload(payload);
  writeJsonFile(LICENSE_EXPORT_CURRENT_FILE, exportData);
  return exportData;
}

function publicLicense(license) {
  const remaining = licenseTimeRemaining(license);
  return {
    id: license.id,
    slot: license.slot,
    key: maskedLicenseKey(license),
    status: license.status,
    customerName: license.customerName || "",
    activatedAt: license.activatedAt || "",
    expiresAt: license.expiresAt || "",
    remaining
  };
}

function adminLicenseSummary(license, rawKeys = null) {
  const rawKey = rawKeys?.get(license.keyHash) || "";
  return {
    ...publicLicense(license),
    key: rawKey || maskedLicenseKey(license),
    maskedKey: maskedLicenseKey(license),
    hasRawKey: Boolean(rawKey),
    keyId: license.id,
    userId: license.userId || ""
  };
}

function validateCustomerName(value) {
  const name = sanitizeAccountName(value, "");
  if (!name || Array.from(name).length > 24) throw new Error("INVALID_CUSTOMER_NAME");
  return name;
}

function createLicenseUser(license, customerName = "") {
  const passwordInfo = hashPassword(randomId(18));
  const now = nowIso();
  const displayName = sanitizeAccountName(customerName || license.customerName || "", defaultAccessKeyDisplayName(license.slot));
  return {
    id: license.userId || `license-${license.id}-${license.keyHash.slice(0, 12)}`,
    email: `${license.id}@licenses.dmaihxcai.local`,
    username: license.id,
    passwordSalt: passwordInfo.salt,
    passwordHash: passwordInfo.hash,
    role: "user",
    deviceId: "",
    displayName,
    accessKeyHash: license.keyHash,
    accessKeySlot: license.slot,
    licenseId: license.id,
    licenseExpiresAt: license.expiresAt,
    keyActivatedAt: license.activatedAt,
    avatarSeed: randomBase36(4),
    avatarUrl: defaultSystemAvatar(),
    history: [],
    openingBooks: [],
    createdAt: now,
    lastSeenAt: now,
    currentActivity: { route: "home", roomKey: "", action: license.activatedAt ? "Da kich hoat license" : "Chua kich hoat", updatedAt: now },
    adminTracked: false,
    adminTrackedAt: "",
    activeSessionId: "",
    activeDeviceId: "",
    activeSessionStartedAt: "",
    activeSessionSeenAt: "",
    rememberedDevices: []
  };
}

function defaultSystemAvatar() {
  return "/assets/device-avatars/tv1.png";
}

function ensureLicenseUser(license, customerName = "") {
  let user = users.find((item) => item.licenseId === license.id || item.accessKeyHash === license.keyHash);
  if (!user) {
    user = createLicenseUser(license, customerName);
    users.push(user);
  } else {
    user.accessKeyHash = license.keyHash;
    user.accessKeySlot = license.slot;
    user.licenseId = license.id;
    user.licenseExpiresAt = license.expiresAt || user.licenseExpiresAt || "";
    user.keyActivatedAt = license.activatedAt || user.keyActivatedAt || "";
    if (!user.displayName) {
      user.displayName = sanitizeAccountName(customerName || license.customerName || "", defaultAccessKeyDisplayName(license.slot));
    }
    if (!user.avatarUrl) user.avatarUrl = defaultSystemAvatar();
    if (!Array.isArray(user.rememberedDevices)) user.rememberedDevices = [];
  }
  license.userId = user.id;
  return user;
}

function activateLicenseKey(key, customerName = "") {
  const keyHash = hashLicenseKey(key);
  if (!keyHash) return null;
  const license = licenseByHash(keyHash);
  if (!license) return null;
  refreshLicenseExpiry(license);
  if (license.status === "expired") return null;
  const now = nowIso();
  const requestedName = sanitizeAccountName(customerName || "", "");
  if (license.status !== "activated") {
    license.status = "activated";
    license.customerName = requestedName || license.customerName || defaultAccessKeyDisplayName(license.slot);
    license.activatedAt = now;
    license.expiresAt = licenseExpiryFrom(now);
  } else if (!license.customerName && requestedName) {
    license.customerName = requestedName;
  }
  const user = ensureLicenseUser(license, license.customerName || requestedName);
  user.licenseExpiresAt = license.expiresAt;
  user.keyActivatedAt = license.activatedAt;
  if (!user.displayName) user.displayName = license.customerName || defaultAccessKeyDisplayName(license.slot);
  if (!license.customerName) license.customerName = user.displayName;
  license.userId = user.id;
  saveLicenseState();
  saveUsers();
  return user;
}

function checkLicenseKey(value) {
  const keyHash = hashLicenseKey(value);
  if (isAdminLicenseKeyHash(keyHash)) {
    return { ok: true, admin: true, status: "admin" };
  }
  const license = licenseByHash(keyHash);
  if (!license) return { ok: false, error: "KEY_INVALID" };
  refreshLicenseExpiry(license);
  if (license.status === "expired") return { ok: false, error: "KEY_EXPIRED" };
  return { ok: true, admin: false, status: license.status || "unused", key: maskedLicenseKey(license) };
}

function pruneLegacyAccessKeyUsers() {
  const validHashes = new Set(licenseState.licenses.map((entry) => entry.keyHash));
  const before = users.length;
  users = users.filter((user) => {
    if (!user?.accessKeyHash || user.role === "admin") return true;
    return validHashes.has(user.accessKeyHash);
  });
  if (users.length !== before) saveUsers();
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

function isValidAccountName(value) {
  const text = normalizePersonName(value);
  return Boolean(text) && Array.from(text).length <= 24 && /^(?:[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*)$/u.test(text);
}

function sanitizeAccountName(value, fallback = "") {
  const cleaned = isValidAccountName(value) ? normalizePersonName(value) : "";
  const fallbackClean = isValidAccountName(fallback) ? normalizePersonName(fallback) : "";
  return cleaned || fallbackClean || "";
}

function requireAccountName(value) {
  const text = normalizePersonName(value);
  if (!isValidAccountName(text)) throw new Error("INVALID_DISPLAY_NAME");
  return text;
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

function sanitizeActivityRoute(value) {
  const route = String(value || "").trim().toLowerCase();
  return ["home", "match", "library", "admin", "room", "review", "analysis"].includes(route) ? route : "";
}

function sanitizeRoomKey(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

function sanitizeUserActivity(activity = {}) {
  const route = sanitizeActivityRoute(activity.route);
  const roomKey = sanitizeRoomKey(activity.roomKey);
  const action = String(activity.action || activity.label || "").normalize("NFC").replace(/\s+/gu, " ").trim().slice(0, 80);
  const updatedAt = activity.updatedAt && !Number.isNaN(Date.parse(activity.updatedAt)) ? activity.updatedAt : "";
  return {
    route,
    roomKey,
    action,
    updatedAt
  };
}

function touchUserActivity(user, activity = {}) {
  if (!user) return;
  const previousSeen = Date.parse(user.lastSeenAt || 0) || 0;
  const now = nowIso();
  const current = sanitizeUserActivity({
    ...(user.currentActivity || {}),
    ...activity,
    updatedAt: now
  });
  user.lastSeenAt = now;
  user.currentActivity = current;
  if (Date.now() - previousSeen > 8000) saveUsers();
}

function isAdminQuickLoginName(displayName) {
  const safeName = normalizePersonName(displayName).toLowerCase();
  return [ADMIN_USERNAME, normalizePersonName(ADMIN_DISPLAY_NAME).toLowerCase()].includes(safeName);
}

function isAdminRoomKey(value) {
  const submitted = String(value || "");
  const expected = String(ADMIN_ROOM_KEY || "");
  if (!submitted || !expected) return false;
  const left = Buffer.from(submitted);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function accessKeyEntryForHash(hash) {
  return ACCESS_KEYS_CONFIG.licenses.find((entry) => entry.keyHash === hash) || null;
}

function configuredAccessKeyForUser(user) {
  if (!user?.accessKeyHash) return "";
  if (user.role === "admin" && user.accessKeyHash === hashAccessKey(ADMIN_ACCESS_KEY)) return "ADMIN";
  const license = licenseByHash(user.accessKeyHash);
  return license ? maskedLicenseKey(license) : "";
}

function accessKeyUsername(slot) {
  return `key${String(Math.max(1, Number(slot) || 1)).padStart(3, "0")}`;
}

function accessKeyEmail(slot) {
  return `${accessKeyUsername(slot)}@keys.dmaihxcai.local`;
}

function accessKeyUserId(slot, keyHash) {
  const safeSlot = Math.max(0, Number(slot) || 0);
  const hash = String(keyHash || "").replace(/[^a-f0-9]/gi, "").toLowerCase();
  return `key-${String(safeSlot).padStart(3, "0")}-${hash.slice(0, 16) || "local"}`;
}

function defaultAccessKeyAvatar(seed) {
  const source = String(seed || randomBase36(8));
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return DEVICE_AVATAR_PATH_LIST[hash % DEVICE_AVATAR_PATH_LIST.length] || "";
}

function defaultAccessKeyDisplayName(slot) {
  const safeSlot = Math.max(1, Number(slot) || 1);
  return `Tai khoan ${String(safeSlot).padStart(3, "0")}`;
}

function rememberAccessKeyDevice(user, deviceId) {
  const safeDeviceId = sanitizeDeviceId(deviceId);
  if (!user || !safeDeviceId) return false;
  const now = nowIso();
  const devices = Array.isArray(user.rememberedDevices) ? user.rememberedDevices : [];
  const existing = devices.find((device) => device.deviceId === safeDeviceId);
  if (existing) {
    existing.lastSeenAt = now;
  } else {
    devices.unshift({ deviceId: safeDeviceId, firstSeenAt: now, lastSeenAt: now });
  }
  user.rememberedDevices = devices
    .filter((device) => sanitizeDeviceId(device.deviceId))
    .slice(0, 12);
  return true;
}

function claimActiveSession(user, { deviceId = "", action = "" } = {}) {
  if (!user?.accessKeyHash) return user;
  const now = nowIso();
  const sessionId = randomId(12);
  user.activeSessionId = sessionId;
  user.activeDeviceId = sanitizeDeviceId(deviceId);
  user.activeSessionStartedAt = now;
  user.activeSessionSeenAt = now;
  if (!user.keyActivatedAt) user.keyActivatedAt = now;
  if (!user.lastSeenAt) user.lastSeenAt = now;
  rememberAccessKeyDevice(user, user.activeDeviceId);
  touchUserActivity(user, {
    route: user.role === "admin" ? "admin" : user.currentActivity?.route || "home",
    roomKey: user.currentActivity?.roomKey || "",
    action: action || "Dang nhap bang Key"
  });
  return user;
}

function touchActiveSession(user, payload = {}) {
  if (!user?.accessKeyHash) return false;
  const previousSeen = Date.parse(user.activeSessionSeenAt || 0) || 0;
  const now = nowIso();
  let changed = false;
  if (!user.activeSessionId) {
    user.activeSessionId = payload.sid || randomId(12);
    user.activeSessionStartedAt = now;
    changed = true;
  }
  if (!user.activeSessionStartedAt) {
    user.activeSessionStartedAt = now;
    changed = true;
  }
  user.activeSessionSeenAt = now;
  if (payload.deviceId && !user.activeDeviceId) {
    user.activeDeviceId = sanitizeDeviceId(payload.deviceId);
    changed = true;
  }
  rememberAccessKeyDevice(user, user.activeDeviceId);
  if (Date.now() - previousSeen > 8000 || changed) saveUsers();
  return changed;
}

function isSessionReplaced(user, payload = {}) {
  if (!user?.accessKeyHash) return false;
  if (!payload.sid) return false;
  return Boolean(user.activeSessionId && user.activeSessionId !== payload.sid);
}

function ensureAccessKeyUsers() {
  pruneLegacyAccessKeyUsers();
}

function ensureAdminUser() {
  const existing = users.find((user) => user?.role === "admin" || user?.email === ADMIN_EMAIL || user?.username === ADMIN_USERNAME);
  const adminKeyHash = hashAccessKey(ADMIN_ACCESS_KEY);
  if (existing) {
    let changed = false;
    if (existing.role !== "admin") {
      existing.role = "admin";
      changed = true;
    }
    if (existing.username !== ADMIN_USERNAME) {
      existing.username = ADMIN_USERNAME;
      changed = true;
    }
    if (existing.displayName !== ADMIN_DISPLAY_NAME) {
      existing.displayName = ADMIN_DISPLAY_NAME;
      changed = true;
    }
    if (existing.accessKeyHash !== adminKeyHash) {
      existing.accessKeyHash = adminKeyHash;
      changed = true;
    }
    if (existing.accessKeySlot !== 0) {
      existing.accessKeySlot = 0;
      changed = true;
    }
    if (!("keyActivatedAt" in existing)) {
      existing.keyActivatedAt = "";
      changed = true;
    }
    if (!verifyPassword(ADMIN_PASSWORD, existing)) {
      const passwordInfo = hashPassword(ADMIN_PASSWORD);
      existing.passwordSalt = passwordInfo.salt;
      existing.passwordHash = passwordInfo.hash;
      changed = true;
    }
    if (!existing.avatarSeed) {
      existing.avatarSeed = randomBase36(4);
      changed = true;
    }
    if (!existing.avatarUrl) {
      existing.avatarUrl = defaultAccessKeyAvatar(ADMIN_ACCESS_KEY || ADMIN_USERNAME);
      changed = true;
    }
    if (!existing.createdAt) {
      existing.createdAt = nowIso();
      changed = true;
    }
    if (!existing.currentActivity) {
      existing.currentActivity = { route: "admin", roomKey: "", action: "Quản trị", updatedAt: "" };
      changed = true;
    }
    if (changed) saveUsers();
    return existing;
  }

  const passwordInfo = hashPassword(ADMIN_PASSWORD);
  const now = nowIso();
  const adminUser = {
    id: accessKeyUserId(0, hashAccessKey(ADMIN_ACCESS_KEY)),
    email: ADMIN_EMAIL,
    username: ADMIN_USERNAME,
    passwordSalt: passwordInfo.salt,
    passwordHash: passwordInfo.hash,
    role: "admin",
    displayName: ADMIN_DISPLAY_NAME,
    accessKeyHash: hashAccessKey(ADMIN_ACCESS_KEY),
    accessKeySlot: 0,
    keyActivatedAt: "",
    avatarSeed: randomBase36(4),
    avatarUrl: defaultAccessKeyAvatar(ADMIN_ACCESS_KEY || ADMIN_USERNAME),
    history: [],
    openingBooks: [],
    createdAt: now,
    lastSeenAt: "",
    currentActivity: { route: "admin", roomKey: "", action: "Quản trị", updatedAt: "" }
  };
  users.push(adminUser);
  saveUsers();
  return adminUser;
}

function authenticateAccessKey(value, options = {}) {
  const key = sanitizeAccessKey(value);
  if (!key) return null;
  const customerName = typeof options === "string" ? options : options.customerName || options.displayName || "";
  const deviceId = typeof options === "object" ? sanitizeDeviceId(options.deviceId || "") : "";
  const adminKeyHash = hashLicenseKey(key);
  const now = nowIso();

  if (isAdminLicenseKeyHash(adminKeyHash)) {
    const admin = ensureAdminUser();
    if (!admin.keyActivatedAt) admin.keyActivatedAt = now;
    claimActiveSession(admin, { deviceId, action: "Dang nhap quan tri bang key" });
    saveUsers();
    return admin;
  }

  const user = activateLicenseKey(key, customerName);
  if (!user) return null;
  claimActiveSession(user, { deviceId, action: "Dang nhap bang Key" });
  saveUsers();
  return user;
}

function adminRenameUser(userId, displayName) {
  const user = users.find((item) => item.id === String(userId || ""));
  if (!user) return null;
  const nextName = requireAccountName(displayName);
  user.displayName = nextName;
  user.adminTracked = true;
  if (!user.adminTrackedAt) user.adminTrackedAt = nowIso();
  const license = user.role === "admin" ? null : licenseByHash(user.accessKeyHash);
  if (license) {
    license.customerName = nextName;
    saveLicenseState();
  }
  saveUsers();
  return user;
}

function adminSetUserAvatar(userId, avatarUrl) {
  const user = users.find((item) => item.id === String(userId || ""));
  if (!user || user.role === "admin") return null;
  const safeAvatarUrl = sanitizeAvatarUrl(avatarUrl);
  if (!safeAvatarUrl || !DEVICE_AVATAR_PATHS.has(safeAvatarUrl)) {
    throw new Error("INVALID_AVATAR");
  }
  user.avatarUrl = safeAvatarUrl;
  user.adminTracked = true;
  if (!user.adminTrackedAt) user.adminTrackedAt = nowIso();
  syncUserProfileIntoRooms(user);
  saveUsers();
  return user;
}

function adminTrackAccessKey(value) {
  const keyHash = hashLicenseKey(value);
  if (!keyHash || isAdminLicenseKeyHash(keyHash)) return null;
  const license = licenseByHash(keyHash);
  if (!license) return null;
  refreshLicenseExpiry(license);
  const user = ensureLicenseUser(license, license.customerName || defaultAccessKeyDisplayName(license.slot));
  user.adminTracked = true;
  user.adminTrackedAt = user.adminTrackedAt || nowIso();
  if (!user.currentActivity?.action) {
    user.currentActivity = { route: "home", roomKey: "", action: license.status === "activated" ? "Da kich hoat license" : "Chua kich hoat", updatedAt: nowIso() };
  }
  license.userId = user.id;
  saveLicenseState();
  saveUsers();
  return user;
}

function restoreLicenseFromAccessTokenPayload(payload) {
  if (!payload?.akh || payload.role === "admin") return null;
  const license = licenseById(payload.licenseId) || licenseByHash(payload.akh);
  if (!license) return null;
  const activatedAt = payload.activatedAt || payload.act || license.activatedAt || nowIso();
  const expiresAt = payload.expiresAt || license.expiresAt || licenseExpiryFrom(activatedAt);
  if (Date.parse(expiresAt || 0) <= Date.now()) return null;
  const customerName = sanitizeAccountName(
    payload.customerName || payload.name || license.customerName || "",
    license.customerName || "Khach"
  );
  let changed = false;
  if (license.status !== "activated") {
    license.status = "activated";
    changed = true;
  }
  if (license.customerName !== customerName) {
    license.customerName = customerName;
    changed = true;
  }
  if (license.activatedAt !== activatedAt) {
    license.activatedAt = activatedAt;
    changed = true;
  }
  if (license.expiresAt !== expiresAt) {
    license.expiresAt = expiresAt;
    changed = true;
  }
  if (payload.uid && license.userId !== payload.uid) {
    license.userId = payload.uid;
    changed = true;
  }
  if (changed) saveLicenseState();
  return license;
}

function restoreUserFromAccessToken(payload) {
  if (payload?.role === "admin" || payload?.akh === hashAccessKey(ADMIN_ACCESS_KEY)) {
    return ensureAdminUser();
  }
  let license = licenseById(payload?.licenseId) || licenseByHash(payload?.akh);
  if (!license || license.status !== "activated") {
    license = restoreLicenseFromAccessTokenPayload(payload);
  }
  if (!license || license.status !== "activated") return null;
  refreshLicenseExpiry(license);
  if (license.status !== "activated") return null;
  let user = users.find((item) => item.id === license.userId || item.accessKeyHash === license.keyHash) || null;
  if (!user && payload?.uid) {
    license.userId = payload.uid;
    user = createLicenseUser(license, license.customerName || payload.customerName || payload.name || "Khach");
    user.id = payload.uid;
    users.push(user);
    saveLicenseState();
    saveUsers();
  }
  return user;
}

function restoreAccessKeySessionState(user, payload) {
  if (!user?.accessKeyHash || user.role === "admin") return false;
  let license = licenseById(payload?.licenseId) || licenseByHash(user.accessKeyHash);
  if (!license || license.status !== "activated") {
    license = restoreLicenseFromAccessTokenPayload(payload);
  }
  if (!license || license.status !== "activated") return false;
  refreshLicenseExpiry(license);
  if (license.status !== "activated") return false;
  let changed = false;
  const wasUnactivated = !user.keyActivatedAt;
  if (!user.keyActivatedAt) {
    const restoredAt = license.activatedAt || (payload.act && !Number.isNaN(Date.parse(payload.act)) ? payload.act : nowIso());
    user.keyActivatedAt = restoredAt;
    changed = true;
  }
  if (user.licenseId !== license.id) {
    user.licenseId = license.id;
    changed = true;
  }
  if (user.licenseExpiresAt !== license.expiresAt) {
    user.licenseExpiresAt = license.expiresAt;
    changed = true;
  }
  if (!user.lastSeenAt) {
    user.lastSeenAt = nowIso();
    changed = true;
  }
  const tokenName = sanitizeAccountName(license.customerName || user.displayName || "", user.displayName || user.username || ADMIN_DISPLAY_NAME);
  if (wasUnactivated || user.currentActivity?.action === "Chua kich hoat") {
    if (!user.adminTracked && tokenName && tokenName !== user.displayName) {
      user.displayName = tokenName;
      changed = true;
    }
    user.currentActivity = {
      route: "home",
      roomKey: "",
      action: "Da khoi phuc phien kich hoat",
      updatedAt: nowIso()
    };
    changed = true;
  }
  if (!user.avatarUrl) user.avatarUrl = defaultSystemAvatar();
  if (changed) saveUsers();
  return changed;
}

function isLicenseSessionValid(user, payload) {
  if (!user) return false;
  if (user.role === "admin") return true;
  let license = licenseById(payload?.licenseId || user.licenseId) || licenseByHash(user.accessKeyHash);
  if (!license || license.status !== "activated") {
    license = restoreLicenseFromAccessTokenPayload(payload);
  }
  if (!license || license.status !== "activated") return false;
  refreshLicenseExpiry(license);
  if (license.status !== "activated") return false;
  if (license.userId && license.userId !== user.id) return false;
  if (Date.parse(license.expiresAt || 0) <= Date.now()) return false;
  return true;
}

function createAuthToken(userOrId) {
  const user = typeof userOrId === "string"
    ? users.find((item) => item.id === userOrId)
    : userOrId;
  const userId = typeof userOrId === "string" ? userOrId : userOrId?.id;
  const payload = {
    uid: userId,
    exp: Date.now() + TOKEN_TTL_MS,
    nonce: randomId(8)
  };
  if (user?.activeSessionId) payload.sid = user.activeSessionId;
  if (user?.activeDeviceId) payload.deviceId = user.activeDeviceId;
  if (user?.role === "admin") {
    payload.akh = user.accessKeyHash;
    payload.slot = Number(user.accessKeySlot || 0);
    payload.role = "admin";
    payload.name = sanitizeAccountName(user.displayName || "", user.username || ADMIN_DISPLAY_NAME);
    payload.act = user.keyActivatedAt || nowIso();
  } else if (user?.accessKeyHash) {
    const license = licenseById(user.licenseId) || licenseByHash(user.accessKeyHash);
    if (license) {
      payload.exp = Date.parse(license.expiresAt || 0) || Date.now();
      payload.licenseId = license.id;
      payload.customerName = license.customerName || user.displayName || "";
      payload.activatedAt = license.activatedAt || user.keyActivatedAt || "";
      payload.expiresAt = license.expiresAt || "";
    }
    payload.akh = user.accessKeyHash;
    payload.slot = Number(user.accessKeySlot || 0);
    payload.role = "user";
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", LICENSE_TOKEN_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyAuthToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", LICENSE_TOKEN_SECRET).update(encoded).digest("base64url");
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload?.uid || Number(payload.exp) < Date.now()) return null;
    return payload;
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
  req.authErrorCode = "";
  const payload = verifyAuthToken(getAuthToken(req));
  if (!payload?.uid) {
    req.authErrorCode = "UNAUTHORIZED";
    return null;
  }
  let user = users.find((item) => item.id === payload.uid) || null;
  if (!user && payload.akh) {
    user = restoreUserFromAccessToken(payload);
  }
  if (!user?.accessKeyHash) {
    req.authErrorCode = "UNAUTHORIZED";
    return null;
  }
  if (isSessionReplaced(user, payload)) {
    req.authErrorCode = "SESSION_REPLACED";
    return null;
  }
  if (!isLicenseSessionValid(user, payload)) {
    req.authErrorCode = "UNAUTHORIZED";
    return null;
  }
  restoreAccessKeySessionState(user, payload);
  if (!isSessionReplaced(user, payload)) touchActiveSession(user, payload);
  return user;
}

function requireUser(req) {
  const user = getAuthenticatedUser(req);
  if (!user) throw new Error(req.authErrorCode || "UNAUTHORIZED");
  touchUserActivity(user, {
    route: user.currentActivity?.route || "",
    roomKey: user.currentActivity?.roomKey || "",
    action: user.currentActivity?.action || "Đang hoạt động"
  });
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

function visionQuotaStatus(user) {
  if (!user || isAdminUser(user)) {
    return { limit: VISION_DAILY_LIMIT, used: 0, remaining: VISION_DAILY_LIMIT, date: vietnamDateKey() };
  }
  const today = vietnamDateKey();
  const previous = user.visionUsage && typeof user.visionUsage === "object" ? user.visionUsage : {};
  const count = previous.date === today ? Math.max(0, Number(previous.count || 0)) : 0;
  return {
    limit: VISION_DAILY_LIMIT,
    used: Math.min(VISION_DAILY_LIMIT, count),
    remaining: Math.max(0, VISION_DAILY_LIMIT - count),
    date: today
  };
}

function consumeVisionQuota(user) {
  if (!user || isAdminUser(user)) {
    return visionQuotaStatus(user);
  }
  const current = visionQuotaStatus(user);
  if (current.remaining <= 0) throw new Error("VISION_DAILY_LIMIT");
  const usage = { date: current.date, count: current.used };
  usage.count += 1;
  user.visionUsage = usage;
  return {
    limit: VISION_DAILY_LIMIT,
    used: usage.count,
    remaining: Math.max(0, VISION_DAILY_LIMIT - usage.count),
    date: usage.date
  };
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "local";
}

function assertLicenseRateLimit(req) {
  const key = clientIp(req);
  const now = Date.now();
  const windowMs = 1000 * 60;
  const maxAttempts = 20;
  const state = licenseRateMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (state.resetAt <= now) {
    state.count = 0;
    state.resetAt = now + windowMs;
  }
  state.count += 1;
  licenseRateMap.set(key, state);
  if (state.count > maxAttempts) throw new Error("RATE_LIMIT");
}

function licenseErrorMessage(code) {
  return {
    KEY_INVALID: "Key khong dung.",
    KEY_USED: "Key nay da duoc kich hoat.",
    KEY_EXPIRED: "Key nay da het han.",
    INVALID_CUSTOMER_NAME: "Ten khach hang khong duoc de trong va toi da 24 ky tu.",
    RATE_LIMIT: "Ban nhap Key qua nhanh. Hay thu lai sau it phut."
  }[code] || "Khong the xu ly license.";
}

function authErrorPayload(code = "UNAUTHORIZED") {
  if (code === "SESSION_REPLACED") {
    return {
      status: 409,
      payload: {
        ok: false,
        code,
        error: "Tai khoan dang dang nhap o noi khac."
      }
    };
  }
  return {
    status: 401,
    payload: { ok: false, code: "UNAUTHORIZED", error: "UNAUTHORIZED" }
  };
}

function sendAuthError(res, code = "UNAUTHORIZED") {
  const result = authErrorPayload(code);
  json(res, result.status, result.payload);
}

function latestLicenseExportFile() {
  try {
    if (fs.existsSync(LICENSE_EXPORT_CURRENT_FILE)) return LICENSE_EXPORT_CURRENT_FILE;
    const files = fs.readdirSync(DATA_DIR)
      .filter((name) => name.startsWith(LICENSE_EXPORT_GLOB_PREFIX) && name.endsWith(".json"))
      .map((name) => path.join(DATA_DIR, name))
      .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
    return files[0] || "";
  } catch {
    return "";
  }
}

function publicUser(user) {
  const license = user.role === "admin" ? null : licenseById(user.licenseId) || licenseByHash(user.accessKeyHash);
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role === "admin" ? "admin" : user.role === "guest" ? "guest" : "user",
    displayName: user.displayName,
    accessKeySlot: Number(user.accessKeySlot || 0),
    keyActivatedAt: user.keyActivatedAt || "",
    license: license ? publicLicense(license) : null,
    avatarSeed: user.avatarSeed,
    avatarUrl: user.avatarUrl || "",
    visionQuota: visionQuotaStatus(user),
    history: Array.isArray(user.history) ? user.history.slice(0, MAX_HISTORY_ITEMS) : [],
    openingBooks: normalizeOpeningBooks(user.openingBooks)
  };
}

function findGuestByDeviceId(deviceId) {
  const safeDeviceId = sanitizeDeviceId(deviceId);
  if (!safeDeviceId) return null;
  return users.find((item) => item?.role === "guest" && item.deviceId === safeDeviceId) || null;
}

function adminUserSummary(user) {
  const room = currentRoomForUser(user.id);
  const lastSeenMs = Date.parse(user.lastSeenAt || 0) || 0;
  const activeSeenMs = Date.parse(user.activeSessionSeenAt || 0) || 0;
  const onlineSeenMs = Math.max(lastSeenMs, activeSeenMs);
  const online = onlineSeenMs > 0 && Date.now() - onlineSeenMs <= PRESENCE_TTL_MS * 2;
  const license = user.role === "admin" ? null : licenseById(user.licenseId) || licenseByHash(user.accessKeyHash);
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role === "admin" ? "admin" : user.role === "guest" ? "guest" : "user",
    displayName: user.displayName,
    accessKeySlot: Number(user.accessKeySlot || 0),
    accessKey: configuredAccessKeyForUser(user),
    license: license ? adminLicenseSummary(license) : null,
    keyActivatedAt: user.keyActivatedAt || "",
    adminTracked: Boolean(user.adminTracked),
    adminTrackedAt: user.adminTrackedAt || "",
    activeSessionId: user.activeSessionId ? `${String(user.activeSessionId).slice(0, 8)}...` : "",
    activeSessionSeenAt: user.activeSessionSeenAt || "",
    activeDeviceId: user.activeDeviceId || "",
    rememberedDeviceCount: Array.isArray(user.rememberedDevices) ? user.rememberedDevices.length : 0,
    activated: Boolean(license ? license.status === "activated" : user.keyActivatedAt),
    avatarSeed: user.avatarSeed,
    avatarUrl: user.avatarUrl || "",
    createdAt: user.createdAt || nowIso(),
    lastSeenAt: user.lastSeenAt || "",
    online,
    currentActivity: sanitizeUserActivity(user.currentActivity || {}),
    currentRoomKey: room?.key || user.currentActivity?.roomKey || "",
    currentRoomRole: room ? roomAccessForUser(room, user.id).role : "",
    history: normalizeHistoryEntries(user.history),
    historyCount: Array.isArray(user.history) ? user.history.length : 0,
    openingBooks: normalizeOpeningBooks(user.openingBooks),
    openingBookCount: Array.isArray(user.openingBooks) ? user.openingBooks.length : 0
  };
}

function botIdForLevel(level) {
  const safeLevel = Math.max(1, Math.min(BOT_PLAYERS.length, Number(level) || 1));
  return `${BOT_USER_PREFIX}${safeLevel}`;
}

function botDefinition(levelOrId) {
  const level = typeof levelOrId === "string" && levelOrId.startsWith(BOT_USER_PREFIX)
    ? Number(levelOrId.slice(BOT_USER_PREFIX.length))
    : Number(levelOrId);
  return BOT_PLAYERS.find((bot) => bot.level === level) || BOT_PLAYERS[0];
}

function isBotUserId(userId) {
  return typeof userId === "string" && userId.startsWith(BOT_USER_PREFIX);
}

function botSnapshot(levelOrId) {
  const bot = botDefinition(levelOrId);
  return {
    id: botIdForLevel(bot.level),
    username: `bot-${bot.level}`,
    displayName: bot.name,
    avatarSeed: `bot${bot.level}`,
    avatarUrl: "",
    role: "bot",
    botLevel: bot.level,
    botDepth: bot.depth
  };
}

function roomPlayerSnapshot(userId) {
  if (isBotUserId(userId)) return botSnapshot(userId);
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

function syncUserProfileIntoRooms(user) {
  if (!user?.id) return;
  let changed = false;
  rooms.forEach((room) => {
    ["w", "b"].forEach((side) => {
      if (room.players?.[side] === user.id) {
        syncRoomPlayerProfile(room, side, user);
        changed = true;
      }
    });
  });
  if (changed) saveRooms();
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
  const now = nowIso();
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
    openingBooks: [],
    createdAt: now,
    lastSeenAt: now,
    currentActivity: { route: "match", roomKey: "", action: "Khách vừa truy cập", updatedAt: now }
  };
  users.push(guestUser);
  saveUsers();
  return guestUser;
}

function updateUserDisplayName(user, displayName) {
  if (user?.accessKeyHash) return false;
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

function roomPositionKeyFromBoard(board, sideToMove) {
  return XiangqiCore.boardToCompactFen(board, sideToMove === "b" ? "b" : "w");
}

function roomPositionKeyFromFen(fen) {
  const parsed = XiangqiCore.parseFenState(fen || XiangqiCore.START_FEN);
  return roomPositionKeyFromBoard(parsed.board, parsed.side);
}

function initialRoomRuleState(fen = XiangqiCore.START_FEN) {
  const key = roomPositionKeyFromFen(fen);
  return {
    positionCounts: { [key]: 1 },
    checkStreak: { w: 0, b: 0 },
    chaseHistory: { w: [], b: [] }
  };
}

function normalizeRoomRuleState(room) {
  const state = room.ruleState && typeof room.ruleState === "object"
    ? cloneJsonValue(room.ruleState)
    : initialRoomRuleState(room.boardFen || XiangqiCore.START_FEN);
  state.positionCounts = state.positionCounts && typeof state.positionCounts === "object"
    ? state.positionCounts
    : { [roomPositionKeyFromFen(room.boardFen || XiangqiCore.START_FEN)]: 1 };
  state.checkStreak = {
    w: Number(state.checkStreak?.w || 0),
    b: Number(state.checkStreak?.b || 0)
  };
  state.chaseHistory = {
    w: Array.isArray(state.chaseHistory?.w) ? state.chaseHistory.w.slice(-12) : [],
    b: Array.isArray(state.chaseHistory?.b) ? state.chaseHistory.b.slice(-12) : []
  };
  return state;
}

function resetRoomRuleState(room) {
  room.ruleState = initialRoomRuleState(room.boardFen || XiangqiCore.START_FEN);
  room.ruleNotice = null;
}

function setRoomRuleNotice(room, text) {
  room.ruleNotice = {
    text,
    createdAt: Date.now(),
    expiresAt: Date.now() + ROOM_RULE_NOTICE_MS
  };
}

function currentRoomRuleNotice(room) {
  if (!room?.ruleNotice?.text) return null;
  if (Number(room.ruleNotice.expiresAt || 0) <= Date.now()) {
    room.ruleNotice = null;
    return null;
  }
  return {
    text: String(room.ruleNotice.text),
    expiresAt: Number(room.ruleNotice.expiresAt || 0)
  };
}

function isProtectedPiece(board, square, side) {
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      if (x === square.x && y === square.y) continue;
      const piece = board[y]?.[x] || "";
      if (!piece || XiangqiCore.pieceColor(piece) !== side) continue;
      if (XiangqiCore.attacksSquare(board, { x, y }, square)) return true;
    }
  }
  return false;
}

function roomPieceChaseValue(pieceOrType) {
  const type = String(pieceOrType || "").toLowerCase();
  return {
    k: 10000,
    r: 1000,
    c: 520,
    n: 500,
    a: 260,
    b: 260,
    p: 120
  }[type] || 0;
}

function isCounterChaseEvasion(beforeBoard, from, movedPiece, target, targetPiece) {
  const movedType = String(movedPiece || "").toLowerCase();
  const targetType = String(targetPiece || "").toLowerCase();
  if (!movedType || !targetType) return false;
  if (roomPieceChaseValue(targetType) >= roomPieceChaseValue(movedType)) return false;
  const beforeTargetPiece = beforeBoard[target.y]?.[target.x] || "";
  if (beforeTargetPiece !== targetPiece) return false;
  return XiangqiCore.attacksSquare(beforeBoard, target, from);
}

function chaseCandidatesForMove(beforeBoard, nextBoard, side, move) {
  const from = XiangqiCore.uciToSquare(move.slice(0, 2));
  const to = XiangqiCore.uciToSquare(move.slice(2, 4));
  const movedPiece = beforeBoard[from.y]?.[from.x] || "";
  if (!movedPiece || XiangqiCore.pieceColor(movedPiece) !== side) return [];
  const movedType = movedPiece.toLowerCase();
  const opponent = oppositeSide(side);
  const candidates = [];
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const targetPiece = nextBoard[y]?.[x] || "";
      if (!targetPiece || XiangqiCore.pieceColor(targetPiece) !== opponent) continue;
      const targetType = targetPiece.toLowerCase();
      if (targetType === "k" || targetType === "p") continue;
      const target = { x, y };
      if (!XiangqiCore.attacksSquare(nextBoard, to, target)) continue;
      if (isCounterChaseEvasion(beforeBoard, from, movedPiece, target, targetPiece)) continue;
      const rookChasingSmallPiece = movedType === "r" && ["c", "n", "a", "b"].includes(targetType);
      if (!rookChasingSmallPiece && isProtectedPiece(nextBoard, target, opponent)) continue;
      candidates.push({
        signature: `${side}:${movedType}:${targetType}`,
        value: ({ r: 50, c: 40, n: 40, a: 25, b: 25 }[targetType] || 10)
      });
    }
  }
  return candidates.sort((left, right) => right.value - left.value);
}

function assertRoomMoveAllowedByRules(room, side, move, beforeBoard, nextBoard) {
  const state = normalizeRoomRuleState(room);
  const nextState = cloneJsonValue(state);
  const opponent = oppositeSide(side);
  const givesCheck = XiangqiCore.isKingInCheck(nextBoard, opponent);
  nextState.checkStreak[side] = givesCheck ? Number(nextState.checkStreak?.[side] || 0) + 1 : 0;
  if (nextState.checkStreak[side] > ROOM_MAX_REPEATED_CHECKS) {
    throw new Error("REPEATED_CHECK");
  }

  const chaseCandidates = chaseCandidatesForMove(beforeBoard, nextBoard, side, move);
  if (chaseCandidates.length) {
    const signature = chaseCandidates[0].signature;
    const history = Array.isArray(nextState.chaseHistory?.[side]) ? nextState.chaseHistory[side].slice(-12) : [];
    const count = history.filter((item) => item === signature).length + 1;
    if (count > ROOM_MAX_REPEATED_CHASES) throw new Error("REPEATED_CHASE");
    history.push(signature);
    nextState.chaseHistory[side] = history.slice(-12);
  } else {
    nextState.chaseHistory[side] = [];
  }

  const positionKey = roomPositionKeyFromBoard(nextBoard, opponent);
  const nextCount = Number(nextState.positionCounts?.[positionKey] || 0) + 1;
  nextState.positionCounts[positionKey] = nextCount;
  const hasActiveChasePressure = Boolean(
    givesCheck ||
    chaseCandidates.length ||
    nextState.chaseHistory?.w?.length ||
    nextState.chaseHistory?.b?.length
  );
  const canApplyRepetitionDraw = !hasActiveChasePressure;
  const notice = canApplyRepetitionDraw && nextCount >= ROOM_REPETITION_WARNING_COUNT && nextCount < ROOM_REPETITION_DRAW_COUNT
    ? "Nếu lặp lại thêm 1 lần, ván cờ sẽ tự động xử hòa."
    : "";
  return {
    nextRuleState: nextState,
    repetitionCount: nextCount,
    repetitionDraw: canApplyRepetitionDraw && nextCount >= ROOM_REPETITION_DRAW_COUNT,
    notice
  };
}

function legalMovesForSide(board, side) {
  const moves = [];
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const piece = board[y]?.[x] || "";
      if (!piece || XiangqiCore.pieceColor(piece) !== side) continue;
      const from = { x, y };
      const fromText = XiangqiCore.squareToUci(from);
      XiangqiCore.getLegalMovesForSquare(board, side, from).forEach((to) => {
        moves.push(fromText + XiangqiCore.squareToUci(to));
      });
    }
  }
  return moves;
}

function isRoomMoveAllowedByRules(room, side, move, board) {
  try {
    const nextBoard = XiangqiCore.cloneBoard(board);
    XiangqiCore.applyMoveToBoard(nextBoard, move);
    assertRoomMoveAllowedByRules(room, side, move, board, nextBoard);
    return true;
  } catch {
    return false;
  }
}

function createRoom(user, { yourMinutes = 10, opponentMinutes = 10, side = "w", incrementSeconds = 0 } = {}) {
  const color = side === "b" ? "b" : "w";
  const yourTimeMs = clampRoomMinutes(yourMinutes, 10) * 60 * 1000;
  const opponentTimeMs = clampRoomMinutes(opponentMinutes, 10) * 60 * 1000;
  const safeIncrementSeconds = clampIncrementSeconds(incrementSeconds, 0);
  const hiddenBonusMs = safeIncrementSeconds === 0 ? ROOM_HIDDEN_CLOCK_BONUS_MS : 0;
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
    ruleState: initialRoomRuleState(XiangqiCore.START_FEN),
    ruleNotice: null,
    historySaved: false
  };
  rooms.set(room.key, room);
  saveRooms();
  return room;
}

function createBotRoom(user, { minutes = 10, side = "w", incrementSeconds = 0, botLevel = 1 } = {}) {
  const color = side === "b" ? "b" : "w";
  const botSide = oppositeSide(color);
  const bot = botDefinition(botLevel);
  const botId = botIdForLevel(bot.level);
  const safeMinutes = clampRoomMinutes(minutes, 10);
  const room = createRoom(user, {
    yourMinutes: safeMinutes,
    opponentMinutes: safeMinutes,
    side: color,
    incrementSeconds
  });
  room.mode = "bot";
  room.bot = {
    side: botSide,
    userId: botId,
    level: bot.level,
    depth: bot.depth,
    name: bot.name
  };
  room.players[botSide] = botId;
  room.playerTimeMs = room.playerTimeMs && typeof room.playerTimeMs === "object" ? room.playerTimeMs : {};
  room.playerTimeMs[botId] = safeMinutes * 60 * 1000;
  room.pendingOpponentTimeMs = safeMinutes * 60 * 1000;
  syncRoomPlayerProfile(room, botSide, botSnapshot(bot.level));
  syncVisibleClockSetup(room);
  room.clocks = {
    w: startingClockMsForSide(room, "w"),
    b: startingClockMsForSide(room, "b")
  };
  room.initialClocks = { ...room.clocks };
  resetRoomForGame(room);
  touchPresence(room, user.id, "player");
  room.updatedAt = Date.now();
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
      room.turnStartedAt = now;
      room.countdownEndsAt = 0;
      room.updatedAt = now;
      saveRooms();
    }
    return;
  }
  if (room.status !== "active" || !room.activeSide || room.result) return;
  const now = Date.now();
  const elapsed = Math.max(0, now - Number(room.lastTickAt || now));
  const turnElapsed = Math.max(0, now - Number(room.turnStartedAt || room.lastTickAt || now));
  if (!elapsed) return;
  room.clocks[room.activeSide] = Math.max(0, Number(room.clocks[room.activeSide] || 0) - elapsed);
  room.lastTickAt = now;
  if (room.clocks[room.activeSide] <= 0 || turnElapsed >= ROOM_TURN_LIMIT_MS) {
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
  room.turnStartedAt = 0;
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
  resetRoomRuleState(room);
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
  room.turnStartedAt = 0;
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
  const red = room.players?.w && !isBotUserId(room.players.w) ? users.find((item) => item.id === room.players.w) : null;
  const black = room.players?.b && !isBotUserId(room.players.b) ? users.find((item) => item.id === room.players.b) : null;
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
    repetition: "Hòa do lặp cờ",
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
    mode: room.mode === "bot" ? "bot" : "human",
    bot: room.mode === "bot" ? {
      side: botSideInRoom(room),
      level: Number(room.bot?.level || 1),
      depth: Number(room.bot?.depth || room.bot?.level || 1),
      name: room.bot?.name || botDefinition(room.bot?.level || 1).name
    } : null,
    status: room.status,
    timeControlMinutes: Math.round(room.timeControlMs / 60000),
    clockSetupMs: room.visibleClockSetupMs || {
      w: startingClockMsForSide(room, "w", { includeHiddenBonus: false }),
      b: startingClockMsForSide(room, "b", { includeHiddenBonus: false })
    },
    hiddenClockBonusMs: hiddenClockBonusMs(room),
    incrementSeconds: clampIncrementSeconds(room.incrementSeconds, 0),
    turnLimitMs: ROOM_TURN_LIMIT_MS,
    turnStartedAt: Number(room.turnStartedAt || 0),
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
    ruleNotice: currentRoomRuleNotice(room),
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
  const nextBoard = XiangqiCore.cloneBoard(parsed.board);
  XiangqiCore.applyMoveToBoard(nextBoard, move);
  const ruleCheck = assertRoomMoveAllowedByRules(room, side, move, parsed.board, nextBoard);
  room.ruleState = ruleCheck.nextRuleState;
  if (ruleCheck.notice) setRoomRuleNotice(room, ruleCheck.notice);
  else room.ruleNotice = null;
  room.boardFen = XiangqiCore.boardToFen(nextBoard, oppositeSide(side));
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
  room.turnStartedAt = room.lastTickAt;
  room.pendingRequest = null;
  room.rematchReady = { w: false, b: false };
  const gameState = XiangqiCore.determineGameState(nextBoard, room.sideToMove);
  room.updatedAt = Date.now();
  if (ruleCheck.repetitionDraw) {
    finishRoom(room, { winnerSide: null, loserSide: null, reason: "repetition" });
  } else if (gameState.finished) {
    finishRoom(room, gameState);
  } else {
    saveRooms();
  }
}

function botSideInRoom(room) {
  const side = room?.bot?.side;
  return side === "w" || side === "b" ? side : "";
}

function isBotTurn(room) {
  const botSide = botSideInRoom(room);
  return Boolean(room && room.mode === "bot" && botSide && room.status === "active" && !room.result && !room.pendingRequest && room.sideToMove === botSide);
}

function firstLegalMoveForSide(board, side) {
  return legalMovesForSide(board, side)[0] || "";
}

function firstRuleSafeMoveForRoom(room, board, side) {
  return legalMovesForSide(board, side).find((move) => isRoomMoveAllowedByRules(room, side, move, board)) || "";
}

async function maybeRunBotTurn(room) {
  if (!room || room.mode !== "bot") return;
  const key = room.key;
  if (botMoveJobs.has(key)) {
    await botMoveJobs.get(key);
    return;
  }
  const job = runBotTurn(room).finally(() => botMoveJobs.delete(key));
  botMoveJobs.set(key, job);
  await job;
}

async function runBotTurn(room) {
  materializeRoomClock(room);
  if (!isBotTurn(room)) return;
  const side = botSideInRoom(room);
  const parsed = XiangqiCore.parseFenState(room.boardFen);
  const gameState = XiangqiCore.determineGameState(parsed.board, side);
  if (gameState.finished) {
    finishRoom(room, gameState);
    return;
  }

  const bot = room.bot || {};
  const depth = Math.max(1, Math.min(7, Number(bot.depth || bot.level || 1)));
  let move = "";
  try {
    const result = await engine.analyze({
      fen: room.boardFen,
      depth,
      multipv: 1,
      movetime: 0
    });
    move = /^[a-i][0-9][a-i][0-9]$/.test(result?.bestMove || "") ? result.bestMove : "";
  } catch (error) {
    console.warn(`Bot engine failed in room ${room.key}: ${error.message}`);
  }
  if (!move || !XiangqiCore.isLegalMove(parsed.board, move, side) || !isRoomMoveAllowedByRules(room, side, move, parsed.board)) {
    move = firstRuleSafeMoveForRoom(room, parsed.board, side);
  }
  if (!move) {
    finishRoom(room, { winnerSide: oppositeSide(side), loserSide: side, reason: "no-moves" });
    return;
  }
  await sleepMs(BOT_MOVE_DELAY_MS + Math.min(360, depth * 45));
  materializeRoomClock(room);
  if (!isBotTurn(room) || room.result || room.status !== "active") return;
  try {
    applyMoveInRoom(room, side, move);
    room.lastBotMoveAt = Date.now();
    saveRooms();
  } catch (error) {
    console.warn(`Bot move failed in room ${room.key}: ${error.message}`);
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
    room.turnStartedAt = room.lastTickAt;
    resetRoomRuleState(room);
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
  if (room.mode === "bot") {
    if (ready) {
      const nextPlayers = { w: room.players.b, b: room.players.w };
      const nextProfiles = {
        w: cloneJsonValue(room.playerProfiles?.b || roomPlayerSnapshot(room.players?.b)),
        b: cloneJsonValue(room.playerProfiles?.w || roomPlayerSnapshot(room.players?.w))
      };
      room.players = nextPlayers;
      room.playerProfiles = nextProfiles;
      const nextBotSide = botSideInRoom(room) === "w" ? "b" : "w";
      room.bot = {
        ...(room.bot || {}),
        side: nextBotSide,
        userId: room.players[nextBotSide] || room.bot?.userId || botIdForLevel(room.bot?.level || 1)
      };
      resetRoomForGame(room);
    }
    saveRooms();
    return;
  }
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

function scaleEngineScoreForDisplay(score) {
  const value = Number(score || 0);
  if (!Number.isFinite(value) || value === 0) return 0;
  if (Math.abs(value) >= 31999) return value > 0 ? 31999 : -31999;
  const sign = Math.sign(value);
  const scaled = Math.round(Math.abs(value) * ENGINE_SCORE_SENSITIVITY);
  return sign * Math.min(ENGINE_SCORE_DISPLAY_LIMIT, scaled);
}

function reviewGradeForMove(actualMove, bestMove, bestScore, actualScore) {
  if (!actualMove || !bestMove) {
    return { key: "okay", label: "Không hay", delta: 0 };
  }
  const delta = Math.max(0, Number(bestScore || 0) - Number(actualScore || 0));
  if (actualMove === bestMove || delta <= 14) {
    return { key: "brilliant", label: "Ưu việt", delta };
  }
  if (delta <= 70) {
    return { key: "good", label: "Khá ổn", delta };
  }
  if (delta <= 180) {
    return { key: "okay", label: "Không hay", delta };
  }
  return { key: "bad", label: "Rất yếu", delta };
}

async function topCloudBookMovesForReview(fen) {
  try {
    const result = await Promise.race([
      queryCloudBook(fen),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Cloud book timeout")), 1400))
    ]);
    return Array.isArray(result.moves) ? result.moves.slice(0, 2).map((entry) => entry.move) : [];
  } catch {
    return [];
  }
}

async function analyzeHistoryGame({ startFen = XiangqiCore.START_FEN, plies = [], depth = 8, movetime = 180 }) {
  const safePlies = Array.isArray(plies) ? plies.filter((item) => /^[a-i][0-9][a-i][0-9]$/.test(String(item?.move || ""))) : [];
  const safeDepth = Math.max(4, Math.min(16, Number(depth) || 8));
  const safeMoveTime = Math.max(80, Math.min(1200, Number(movetime) || 180));
  let currentFen = sanitizeFen(startFen || XiangqiCore.START_FEN);
  const items = [];
  let cloudBookAvailable = true;

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

    const withinBookWindow = Math.floor(index / 2) < 10;
    const baseGrade = reviewGradeForMove(ply.move, best.bestMove || "", bestScore, actualScore);
    const bookMoves = withinBookWindow && cloudBookAvailable ? await topCloudBookMovesForReview(currentFen) : [];
    if (withinBookWindow && cloudBookAvailable && !bookMoves.length) cloudBookAvailable = false;
    const inBook = withinBookWindow && (
      baseGrade.key === "brilliant" ||
      ply.move === (best.bestMove || "") ||
      bookMoves.includes(ply.move)
    );
    const grade = inBook
      ? { key: "book", label: "Book", delta: 0 }
      : baseGrade;
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
      gradeLabel: grade.label,
      bookMoves,
      inBook,
      redScore: side === "w" ? scaleEngineScoreForDisplay(actualScore) : -scaleEngineScoreForDisplay(actualScore)
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

const VISION_PIECES = new Set(["K", "A", "B", "N", "R", "C", "P", "k", "a", "b", "n", "r", "c", "p"]);
const VISION_PIECE_ALIASES = {
  king: "K",
  general: "K",
  marshal: "K",
  advisor: "A",
  guard: "A",
  elephant: "B",
  bishop: "B",
  horse: "N",
  knight: "N",
  rook: "R",
  chariot: "R",
  cannon: "C",
  pawn: "P",
  soldier: "P",
  redking: "K",
  redgeneral: "K",
  blackking: "k",
  blackgeneral: "k"
};

function sanitizeVisionImageDataUrl(value) {
  const text = String(value || "").trim();
  const match = text.match(/^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) throw new Error("VISION_BAD_IMAGE");
  const compact = match[2].replace(/\s+/g, "");
  if (compact.length < 800 || compact.length > 7 * 1024 * 1024) throw new Error("VISION_BAD_IMAGE");
  return `data:image/${match[1].toLowerCase().replace("jpg", "jpeg")};base64,${compact}`;
}

function extractJsonObjectText(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("VISION_EMPTY_RESULT");
  return cleaned.slice(start, end + 1);
}

function parseOpenAiJsonContent(text) {
  try {
    return JSON.parse(extractJsonObjectText(text));
  } catch {
    throw new Error("VISION_EMPTY_RESULT");
  }
}

function normalizeVisionPiece(raw, colorHint = "") {
  const original = String(raw || "").trim();
  if (!original) return "";
  if (VISION_PIECES.has(original)) return original;
  const hanMap = {
    "帅": "K", "帥": "K", "将": "k", "將": "k",
    "仕": "A", "士": "a", "相": "B", "象": "b",
    "马": "N", "馬": "N", "车": "R", "車": "R",
    "炮": "C", "砲": "c", "兵": "P", "卒": "p"
  };
  if (hanMap[original]) {
    const color = String(colorHint || "").toLowerCase();
    const piece = hanMap[original];
    if (color.includes("black") || color.includes("den") || color.includes("đen")) return piece.toLowerCase();
    if (color.includes("red") || color.includes("do") || color.includes("đỏ")) return piece.toUpperCase();
    return piece;
  }
  const normalized = original.toLowerCase().replace(/[^a-z]/g, "");
  const inferredColor = normalized.startsWith("black") ? "black" : normalized.startsWith("red") ? "red" : colorHint;
  const core = normalized.replace(/^(red|black)/, "");
  let piece = VISION_PIECE_ALIASES[normalized] || VISION_PIECE_ALIASES[core] || "";
  if (!piece && normalized.length === 1) {
    const map = { k: "K", a: "A", b: "B", e: "B", n: "N", h: "N", r: "R", c: "C", p: "P", s: "P" };
    piece = map[normalized] || "";
  }
  if (!piece) return "";
  const color = String(inferredColor || "").toLowerCase();
  if (color.includes("black") || color.includes("den") || color.includes("đen")) return piece.toLowerCase();
  if (color.includes("red") || color.includes("do") || color.includes("đỏ")) return piece.toUpperCase();
  return original === original.toLowerCase() ? piece.toLowerCase() : piece;
}

function emptyVisionBoard() {
  return Array.from({ length: 10 }, () => Array(9).fill(""));
}

function normalizeVisionBoardPayload(payload, fallbackSide = "w") {
  const source = payload && typeof payload === "object" ? payload : {};
  let board = emptyVisionBoard();
  let count = 0;

  if (Array.isArray(source.board) && source.board.length === 10) {
    for (let topY = 0; topY < 10; topY++) {
      const row = source.board[topY];
      const cells = Array.isArray(row) ? row : String(row || "").split("");
      for (let x = 0; x < 9; x++) {
        const piece = normalizeVisionPiece(cells[x]);
        if (!piece) continue;
        board[9 - topY][x] = piece;
        count++;
      }
    }
  }

  if (!count && Array.isArray(source.pieces)) {
    board = emptyVisionBoard();
    for (const item of source.pieces) {
      const x = Number(item?.x);
      const topY = Number(item?.y);
      if (!Number.isInteger(x) || !Number.isInteger(topY) || x < 0 || x > 8 || topY < 0 || topY > 9) continue;
      const piece = normalizeVisionPiece(item?.piece || item?.type || item?.name, item?.color || item?.side);
      if (!piece) continue;
      board[9 - topY][x] = piece;
      count++;
    }
  }

  if (!count) throw new Error("VISION_EMPTY_RESULT");
  const sideRaw = String(source.sideToMove || source.side || fallbackSide || "w").toLowerCase();
  const side = sideRaw === "b" || sideRaw.includes("black") || sideRaw.includes("den") || sideRaw.includes("đen") ? "b" : "w";
  const warnings = Array.isArray(source.warnings) ? source.warnings.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [];
  const pieces = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      if (board[y][x]) pieces.push({ x, y, piece: board[y][x] });
    }
  }
  return { board, pieces, side, sideToMove: side, warnings };
}

async function recognizeXiangqiBoardImage(body) {
  const image = sanitizeVisionImageDataUrl(body?.image || body?.imageData || "");
  const fallbackSide = String(body?.side || "w").toLowerCase() === "b" ? "b" : "w";
  const visionProvider = String(process.env.DMAIHXCAI_VISION_PROVIDER || "").toLowerCase();
  const preferOpenAi = visionProvider === "openai";
  const preferYolo = visionProvider === "yolo";
  const allowOpenAiFallback = Boolean(OPENAI_API_KEY) && String(process.env.DMAIHXCAI_VISION_OPENAI_FALLBACK || "").trim() === "1";
  if (!preferOpenAi) {
    if (preferYolo || YoloVision.yoloVisionAvailable()) {
      try {
        return await YoloVision.recognizeYoloXiangqiBoard({
          image,
          side: fallbackSide
        });
      } catch (error) {
        if (preferYolo && !allowOpenAiFallback) throw new Error(error?.message || "VISION_YOLO_FAILED");
        console.warn(`YOLO vision recognition skipped: ${error.message}`);
      }
    }
    try {
      return await LocalVision.recognizeLocalXiangqiBoard({
        image,
        side: fallbackSide,
        publicDir: PUBLIC_DIR
      });
    } catch (error) {
      if (!allowOpenAiFallback) throw new Error(error?.message || "VISION_AI_FAILED");
      console.warn(`Local vision recognition failed, falling back to OpenAI: ${error.message}`);
    }
  }

  if (!OPENAI_API_KEY) throw new Error("VISION_NOT_CONFIGURED");
  const prompt = [
    "Recognize the Xiangqi board position in this cropped image.",
    "The crop should contain the playable 9-column by 10-row intersection grid. Use intersections, not cell centers.",
    "Coordinates: x=0..8 left to right in the image, y=0..9 top to bottom in the image.",
    "Return ONLY JSON. No markdown.",
    "Use piece codes: red uppercase K,A,B,N,R,C,P and black lowercase k,a,b,n,r,c,p.",
    "K/k=king/general, A/a=advisor, B/b=elephant, N/n=horse, R/r=rook/chariot, C/c=cannon, P/p=pawn/soldier.",
    "If a piece is unclear, leave that intersection empty and add a warning.",
    "JSON shape: {\"sideToMove\":\"w\",\"board\":[[\"r\",\"n\",\"b\",\"a\",\"k\",\"a\",\"b\",\"n\",\"r\"],...10 rows total],\"pieces\":[{\"x\":0,\"y\":0,\"piece\":\"r\",\"confidence\":0.9}],\"warnings\":[]}.",
    "The board array must be top row first, bottom row last, exactly 10 rows and 9 columns."
  ].join("\n");

  let lastFailure = null;
  for (const model of OPENAI_VISION_MODEL_FALLBACKS) {
    try {
      const content = await callOpenAiVisionModel({ model, prompt, image, useJsonFormat: true });
      return normalizeVisionBoardPayload(parseOpenAiJsonContent(content), fallbackSide);
    } catch (error) {
      lastFailure = error;
      if (error?.retryWithoutJsonFormat) {
        try {
          const content = await callOpenAiVisionModel({ model, prompt, image, useJsonFormat: false });
          return normalizeVisionBoardPayload(parseOpenAiJsonContent(content), fallbackSide);
        } catch (fallbackError) {
          lastFailure = fallbackError;
        }
      }
      if (!shouldTryNextVisionModel(lastFailure)) break;
    }
  }
  throw new Error(visionFailureCode(lastFailure));
}

async function callOpenAiVisionModel({ model, prompt, image, useJsonFormat }) {
  const payload = {
    model,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You are a precise Xiangqi image recognition engine. Return strict JSON only."
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: image, detail: "high" } }
        ]
      }
    ]
  };
  if (useJsonFormat) payload.response_format = { type: "json_object" };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let details = "";
    let errorCode = "";
    let errorMessage = "";
    try {
      details = await response.text();
    } catch {}
    try {
      const parsed = JSON.parse(details);
      errorCode = String(parsed?.error?.code || parsed?.error?.type || "");
      errorMessage = String(parsed?.error?.message || "");
    } catch {
      errorMessage = details;
    }
    const failure = new Error(`OPENAI_VISION_HTTP_${response.status}`);
    failure.status = response.status;
    failure.model = model;
    failure.openaiCode = errorCode;
    failure.openaiMessage = errorMessage;
    failure.retryWithoutJsonFormat = useJsonFormat && /response_format|json_object/i.test(errorMessage);
    console.warn(`Vision recognition failed with ${model}: HTTP ${response.status} ${String(errorMessage || details).slice(0, 500)}`);
    throw failure;
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

function shouldTryNextVisionModel(error) {
  const status = Number(error?.status || 0);
  const message = String(error?.openaiMessage || error?.message || "");
  if (status === 401 || status === 403 || status === 429) return false;
  return status === 400 || status === 404 || /model|image|vision|unsupported|does not exist|not found/i.test(message);
}

function visionFailureCode(error) {
  const status = Number(error?.status || 0);
  const message = String(error?.openaiMessage || error?.message || "");
  if (status === 401 || status === 403) return "VISION_BAD_KEY";
  if (status === 429 || /quota|billing|rate limit/i.test(message)) return "VISION_QUOTA";
  if (status === 400 || status === 404 || /model|unsupported|does not exist|not found/i.test(message)) return "VISION_MODEL_FAILED";
  return "VISION_AI_FAILED";
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
      ".svg": "image/svg+xml",
      ".mp3": "audio/mpeg"
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

    if (url.pathname === "/healthz") {
      json(res, 200, { ok: true });
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
        licenseFile: LICENSES_FILE,
        licensePersistentStorage: isPersistentStoragePath(LICENSES_FILE),
        licenseCount: licenseState.licenses.length,
        networkPath: path.join(SRC_DIR(), "pikafish.nnue"),
        networkExists: fs.existsSync(path.join(SRC_DIR(), "pikafish.nnue")),
        buildRunning: Boolean(buildJob),
        downloadRunning: Boolean(downloadJob),
        candidates: DEFAULT_ENGINE_CANDIDATES,
        postgresEnabled: postgresStateStore.enabled,
        postgresReady: postgresStateStore.ready,
        postgresTable: postgresStateStore.tableName,
        postgresError: postgresStateStore.lastError || "",
        postgresConnection: describePostgresConnection(),
        mongoEnabled: mongoStateStore.enabled,
        mongoReady: mongoStateStore.ready,
        mongoDatabase: mongoStateStore.dbName,
        mongoCollection: mongoStateStore.collectionName,
        mongoError: mongoStateStore.lastError || "",
        visionConfigured: YoloVision.yoloVisionAvailable() || LocalVision.localVisionAvailable() || Boolean(OPENAI_API_KEY),
        visionProvider: YoloVision.yoloVisionAvailable() ? "yolo" : (LocalVision.localVisionAvailable() ? "local" : "openai"),
        visionYolo: YoloVision.yoloVisionStatus(),
        visionLocal: LocalVision.localVisionStatus(PUBLIC_DIR),
        visionModel: OPENAI_VISION_MODEL
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
      requireUser(req);
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
      requireUser(req);
      syncEngineInstance();
      const body = await readBody(req);
      const result = await engine.analyze(body);
      json(res, 200, result);
      return;
    }

    if (url.pathname === "/api/vision/xiangqi-board" && req.method === "POST") {
      const user = requireUser(req);
      const body = await readBody(req);
      const visionQuota = consumeVisionQuota(user);
      saveUsers();
      const result = await recognizeXiangqiBoardImage(body);
      json(res, 200, { ok: true, ...result, visionQuota });
      return;
    }

    if (url.pathname === "/api/license/check-key" && req.method === "POST") {
      assertLicenseRateLimit(req);
      const body = await readBody(req);
      const result = checkLicenseKey(body.key || "");
      if (!result.ok) {
        json(res, 401, { ok: false, error: licenseErrorMessage(result.error), code: result.error });
        return;
      }
      json(res, 200, { ok: true, admin: Boolean(result.admin), status: result.status, key: result.key || "" });
      return;
    }

    if (url.pathname === "/api/license/activate" && req.method === "POST") {
      assertLicenseRateLimit(req);
      const body = await readBody(req);
      const user = authenticateAccessKey(body.key || "", {
        customerName: body.customerName || body.displayName || "",
        deviceId: body.deviceId || req.headers["x-dmaihxcai-device"] || ""
      });
      if (!user) {
        json(res, 401, { ok: false, error: "Key khong dung hoac da het han." });
        return;
      }
      await flushUserPersistence();
      json(res, 200, { ok: true, token: createAuthToken(user), user: publicUser(user) });
      return;
    }

    if (url.pathname === "/api/license/verify" && req.method === "POST") {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendAuthError(res, req.authErrorCode);
        return;
      }
      json(res, 200, { ok: true, token: createAuthToken(user), user: publicUser(user) });
      return;
    }

    if (url.pathname === "/api/license/me") {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendAuthError(res, req.authErrorCode);
        return;
      }
      json(res, 200, { ok: true, user: publicUser(user), license: publicUser(user).license });
      return;
    }

    if (url.pathname === "/api/auth/key" && req.method === "POST") {
      const body = await readBody(req);
      const user = authenticateAccessKey(body.key || "", {
        customerName: body.customerName || body.displayName || "",
        deviceId: body.deviceId || req.headers["x-dmaihxcai-device"] || ""
      });
      if (!user) {
        json(res, 401, { ok: false, error: "Key khong dung hoac da het han." });
        return;
      }
      await flushUserPersistence();
      json(res, 200, { ok: true, token: createAuthToken(user), user: publicUser(user) });
      return;
    }

    if (["/api/admin/quick-login", "/api/auth/guest", "/api/auth/register", "/api/auth/login"].includes(url.pathname)) {
      json(res, 410, { ok: false, error: "Hay nhap Key kich hoat de su dung web." });
      return;
    }
    if (url.pathname === "/api/admin/quick-login" && req.method === "POST") {
      const body = await readBody(req);
      const displayName = requireDisplayName(body.displayName || "");
      const key = String(body.key || "");
      if (!isAdminQuickLoginName(displayName) || !isAdminRoomKey(key)) {
        json(res, 401, { ok: false, error: "Sai tên quản trị hoặc mật khẩu quản trị." });
        return;
      }
      const admin = ensureAdminUser();
      touchUserActivity(admin, { route: "admin", roomKey: "", action: "Đăng nhập quản trị nhanh" });
      await flushUserPersistence();
      json(res, 200, { ok: true, token: createAuthToken(admin), user: publicUser(admin) });
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
        json(res, 200, { ok: true, token: createAuthToken(existing), user: publicUser(existing) });
        return;
      }
      const guest = createGuestUser(requestedDisplayName, { deviceId, avatarUrl });
      await flushUserPersistence();
      json(res, 200, { ok: true, token: createAuthToken(guest), user: publicUser(guest) });
      return;
    }

    if (url.pathname === "/api/activity" && req.method === "POST") {
      const user = requireUser(req);
      const body = await readBody(req);
      touchUserActivity(user, {
        route: sanitizeActivityRoute(body.route),
        roomKey: sanitizeRoomKey(body.roomKey),
        action: String(body.action || "").slice(0, 80)
      });
      json(res, 200, { ok: true });
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
      const now = nowIso();
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
        openingBooks: [],
        createdAt: now,
        lastSeenAt: now,
        currentActivity: { route: "home", roomKey: "", action: "Vừa đăng ký", updatedAt: now }
      };
      users.push(user);
      await saveUsers();
      json(res, 200, {
        ok: true,
        token: createAuthToken(user),
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
      touchUserActivity(user, { route: user.role === "admin" ? "admin" : "home", roomKey: "", action: "Vừa đăng nhập" });
      json(res, 200, {
        ok: true,
        token: createAuthToken(user),
        user: publicUser(user)
      });
      return;
    }

    if (url.pathname === "/api/auth/me") {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendAuthError(res, req.authErrorCode);
        return;
      }
      json(res, 200, { ok: true, token: createAuthToken(user), user: publicUser(user) });
      return;
    }

    if (url.pathname === "/api/profile" && req.method === "POST") {
      const user = requireUser(req);
      const body = await readBody(req);
      const requestedDisplayName = body.displayName ? requireDisplayName(body.displayName) : "";
      const fallbackDisplayName = sanitizeDisplayName(user.displayName || "", ADMIN_DISPLAY_NAME);
      user.displayName = user.accessKeyHash
        ? sanitizeAccountName(user.displayName || "", user.username || ADMIN_DISPLAY_NAME)
        : user.role === "guest"
        ? requestedDisplayName || sanitizeOptionalDisplayName(user.displayName || "")
        : sanitizeDisplayName(requestedDisplayName || "", fallbackDisplayName);
      if (user.role === "admin" || !user.accessKeyHash) {
        user.avatarUrl = sanitizeAvatarUrl(body.avatarUrl);
      } else if (!user.avatarUrl) {
        user.avatarUrl = defaultSystemAvatar();
      }
      syncUserProfileIntoRooms(user);
      await saveUsers();
      json(res, 200, { ok: true, user: publicUser(user) });
      return;
    }

    if (url.pathname === "/api/history") {
      const user = requireUser(req);
      json(res, 200, { ok: true, history: Array.isArray(user.history) ? user.history.slice(0, MAX_HISTORY_ITEMS) : [] });
      return;
    }

    if (url.pathname === "/api/opening-books") {
      const user = requireUser(req);
      if (req.method === "GET") {
        json(res, 200, { ok: true, books: normalizeOpeningBooks(user.openingBooks) });
        return;
      }
      if (req.method === "POST") {
        const body = await readBody(req);
        const book = saveOpeningBookForUser(user, body.book || body);
        if (!book) {
          json(res, 400, { ok: false, error: "Ten khai cuoc hoac du lieu book khong hop le." });
          return;
        }
        touchUserActivity(user, { route: "library", roomKey: "", action: `Luu book khai cuoc ${book.name}` });
        await flushUserPersistence();
        json(res, 200, { ok: true, book, books: normalizeOpeningBooks(user.openingBooks), user: publicUser(user) });
        return;
      }
      if (req.method === "DELETE") {
        const body = await readBody(req);
        const deleted = deleteOpeningBookForUser(user, body.id || url.searchParams.get("id"));
        if (!deleted) {
          json(res, 404, { ok: false, error: "Khong tim thay book khai cuoc." });
          return;
        }
        touchUserActivity(user, { route: "library", roomKey: "", action: "Xoa book khai cuoc" });
        await flushUserPersistence();
        json(res, 200, { ok: true, books: normalizeOpeningBooks(user.openingBooks), user: publicUser(user) });
        return;
      }
    }

    if (url.pathname === "/api/admin/users") {
      requireAdmin(req);
      ensureAccessKeyUsers();
      const list = users
        .filter((user) => user.role !== "admin" && user.adminTracked)
        .map((user) => adminUserSummary(user))
        .sort((left, right) => {
          const leftTracked = Date.parse(left.adminTrackedAt || left.createdAt || 0) || 0;
          const rightTracked = Date.parse(right.adminTrackedAt || right.createdAt || 0) || 0;
          return rightTracked - leftTracked;
        });
      json(res, 200, { ok: true, users: list });
      return;
    }

    if (url.pathname === "/api/admin/users/lookup-key" && req.method === "POST") {
      requireAdmin(req);
      const body = await readBody(req);
      const target = adminTrackAccessKey(body.key || "");
      if (!target) {
        json(res, 404, { ok: false, error: "Key khong dung hoac khong thuoc he thong." });
        return;
      }
      await flushUserPersistence();
      json(res, 200, { ok: true, user: adminUserSummary(target) });
      return;
    }

    if (url.pathname === "/api/admin/users/rename" && req.method === "POST") {
      requireAdmin(req);
      const body = await readBody(req);
      const target = adminRenameUser(body.userId, body.displayName);
      if (!target) {
        json(res, 404, { ok: false, error: "Khong tim thay tai khoan." });
        return;
      }
      await flushUserPersistence();
      json(res, 200, { ok: true, user: adminUserSummary(target) });
      return;
    }

    if (url.pathname === "/api/admin/users/avatar" && req.method === "POST") {
      requireAdmin(req);
      const body = await readBody(req);
      let target = null;
      try {
        target = adminSetUserAvatar(body.userId, body.avatarUrl);
      } catch (error) {
        if (error.message === "INVALID_AVATAR") {
          json(res, 400, { ok: false, error: "Anh dai dien khong hop le." });
          return;
        }
        throw error;
      }
      if (!target) {
        json(res, 404, { ok: false, error: "Khong tim thay tai khoan." });
        return;
      }
      await flushUserPersistence();
      json(res, 200, { ok: true, user: adminUserSummary(target) });
      return;
    }

    if (url.pathname === "/api/admin/licenses") {
      requireAdmin(req);
      const statusFilter = String(url.searchParams.get("status") || "").trim();
      const rawKeys = rawLicenseKeyMap();
      const licenses = licenseState.licenses
        .map((license) => {
          refreshLicenseExpiry(license);
          return adminLicenseSummary(license, rawKeys);
        })
        .filter((license) => !statusFilter || license.status === statusFilter);
      json(res, 200, { ok: true, total: licenseState.licenses.length, rawKeyAvailable: rawKeys.size > 0, licenses });
      return;
    }

    if (url.pathname === "/api/admin/licenses/import" && req.method === "POST") {
      requireAdmin(req);
      const body = await readBody(req);
      const exportData = importLicenseExport(body);
      json(res, 200, { ok: true, file: path.basename(LICENSE_EXPORT_CURRENT_FILE), count: exportData.keys.length });
      return;
    }

    if (url.pathname === "/api/admin/licenses/export") {
      requireAdmin(req);
      const exportFile = latestLicenseExportFile();
      if (!exportFile) {
        json(res, 404, { ok: false, error: "Khong tim thay file export key goc tren server." });
        return;
      }
      const exportData = readJsonFile(exportFile, null);
      json(res, 200, { ok: true, file: path.basename(exportFile), ...exportData });
      return;
    }

    if (url.pathname === "/api/admin/watch-room" && req.method === "POST") {
      const admin = requireAdmin(req);
      const body = await readBody(req);
      const targetUserId = String(body.userId || "").trim();
      const roomKey = sanitizeRoomKey(body.roomKey);
      const room = roomKey
        ? roomByKey(roomKey)
        : currentRoomForUser(targetUserId);
      if (!room) {
        json(res, 404, { ok: false, error: "Tài khoản này hiện không ở trong phòng đấu nào." });
        return;
      }
      addSpectator(room, admin.id);
      touchPresence(room, admin.id, "spectator");
      touchUserActivity(admin, { route: "room", roomKey: room.key, action: `Đang xem phòng ${room.key}` });
      room.updatedAt = Date.now();
      saveRooms();
      json(res, 200, { ok: true, room: roomStateForUser(room, admin) });
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
      if (room) await maybeRunBotTurn(room);
      json(res, 200, { ok: true, room: room ? roomStateForUser(room, user) : null });
      return;
    }

    if (url.pathname === "/api/rooms/create" && req.method === "POST") {
      const user = requireUser(req);
      const body = await readBody(req);
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
      touchUserActivity(user, { route: "room", roomKey: room.key, action: `Tạo phòng ${room.key}` });
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/create-bot" && req.method === "POST") {
      const user = requireUser(req);
      const body = await readBody(req);
      const minutes = clampRoomMinutes(body.minutes, 10);
      const side = body.side === "b" ? "b" : "w";
      const incrementSeconds = clampIncrementSeconds(body.incrementSeconds, 0);
      const botLevel = Math.max(1, Math.min(BOT_PLAYERS.length, Number(body.botLevel) || 1));
      const current = currentRoomForUser(user.id);
      if (current && current.status !== "finished") {
        json(res, 400, { ok: false, error: "Bạn đang ở trong một phòng khác." });
        return;
      }
      const room = createBotRoom(user, { minutes, side, incrementSeconds, botLevel });
      touchUserActivity(user, { route: "room", roomKey: room.key, action: `Đánh với máy cấp ${botLevel}` });
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
      const access = roomAccessForUser(room, user.id);
      touchUserActivity(user, {
        route: "room",
        roomKey: room.key,
        action: access.role === "spectator" ? `Đang xem phòng ${room.key}` : `Vào phòng ${room.key}`
      });
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
      await maybeRunBotTurn(room);
      touchUserActivity(user, { route: "room", roomKey: room.key, action: `Đang ở phòng ${room.key}` });
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/move" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      const move = String(body.move || "");
      applyMoveInRoom(room, side, move);
      await maybeRunBotTurn(room);
      touchUserActivity(user, { route: "room", roomKey: room.key, action: `Đi quân ${move}` });
      await flushUserPersistence();
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/request" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      const requestType = String(body.type || "");
      sendRoomRequest(room, side, requestType);
      touchUserActivity(user, {
        route: "room",
        roomKey: room.key,
        action: requestType === "draw" ? "Gửi yêu cầu cầu hòa" : "Gửi yêu cầu đi lại"
      });
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/respond" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      const accepted = Boolean(body.accept);
      answerRoomRequest(room, side, accepted);
      touchUserActivity(user, {
        route: "room",
        roomKey: room.key,
        action: accepted ? "Đồng ý yêu cầu của đối thủ" : "Từ chối yêu cầu của đối thủ"
      });
      await flushUserPersistence();
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/resign" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      resignRoom(room, side);
      touchUserActivity(user, { route: "room", roomKey: room.key, action: "Xin thua" });
      await flushUserPersistence();
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/ready" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      const ready = Boolean(body.ready);
      setStartReady(room, side, ready);
      touchUserActivity(user, { route: "room", roomKey: room.key, action: ready ? "Sẵn sàng bắt đầu" : "Hủy sẵn sàng" });
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/rematch" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room, access, side } = requireRoomAndUser(req, body.key);
      requirePlayerAccess(access);
      const ready = Boolean(body.ready);
      setRematchReady(room, side, ready);
      touchUserActivity(user, { route: "room", roomKey: room.key, action: ready ? "Sẵn sàng ván mới" : "Hủy sẵn sàng ván mới" });
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    if (url.pathname === "/api/rooms/leave" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room } = requireRoomAndUser(req, body.key);
      leaveRoom(room, user.id);
      touchUserActivity(user, { route: "match", roomKey: "", action: `Rời phòng ${room.key}` });
      await flushUserPersistence();
      json(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/rooms/chat" && req.method === "POST") {
      const body = await readBody(req);
      const { user, room } = requireRoomAndUser(req, body.key);
      appendChatMessage(room, user, body.text);
      touchUserActivity(user, { route: "room", roomKey: room.key, action: "Nhắn tin trong phòng" });
      json(res, 200, { ok: true, room: roomStateForUser(room, user) });
      return;
    }

    serveStatic(req, res);
  } catch (err) {
    const message = String(err.message || err);
    const status = {
      UNAUTHORIZED: 401,
      SESSION_REPLACED: 409,
      ROOM_NOT_FOUND: 404,
      ROOM_FULL: 400,
      ROOM_CLOSED: 400,
      FORBIDDEN_ROOM: 403,
      FORBIDDEN_ADMIN: 403,
      INVALID_MOVE: 400,
      REPEATED_CHECK: 400,
      REPEATED_CHASE: 400,
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
      INVALID_CUSTOMER_NAME: 400,
      INVALID_LICENSE_EXPORT: 400,
      VISION_NOT_CONFIGURED: 400,
      VISION_BAD_IMAGE: 400,
      VISION_AI_FAILED: 400,
      VISION_EMPTY_RESULT: 422,
      VISION_BAD_KEY: 400,
      VISION_QUOTA: 400,
      VISION_MODEL_FAILED: 400,
      VISION_LOCAL_UNAVAILABLE: 500,
      VISION_DAILY_LIMIT: 429,
      RATE_LIMIT: 429,
      INVALID_SIDE: 400,
      SPECTATOR_READ_ONLY: 403,
      EMPTY_CHAT: 400
    }[message] || 500;
    json(res, status, { ok: false, error: friendlyErrorVi(message) });
  }
});

function friendlyErrorVi(code) {
  if (code === "VISION_LOCAL_UNAVAILABLE") return "Bo nhan dien anh noi bo chua san sang. Hay kiem tra goi sharp tren server.";
  if (code === "SESSION_REPLACED") return "Tai khoan dang dang nhap o noi khac.";
  if (code === "REPEATED_CHECK") return "Khong duoc chieu lap lien tuc qua 6 lan.";
  if (code === "REPEATED_CHASE") return "Khong duoc duoi bat lap lai cung mot quan qua 6 lan.";
  if (code === "VISION_NOT_CONFIGURED") return "Chưa cấu hình OPENAI_API_KEY trên server nên chưa thể nhận diện ảnh.";
  if (code === "VISION_YOLO_UNAVAILABLE") return "Chưa có model YOLO cờ tướng. Hãy train model rồi đặt XIANGQI_YOLO_MODEL.";
  if (code === "VISION_YOLO_SCRIPT_MISSING") return "Thiếu script nhận diện YOLO trên server.";
  if (code === "VISION_YOLO_FAILED") return "YOLO chưa nhận diện được ảnh này hoặc runtime YOLO chưa sẵn sàng.";
  if (code === "VISION_BAD_IMAGE") return "Ảnh nhận diện không hợp lệ. Hãy chọn ảnh rõ hơn và crop đúng bàn cờ.";
  if (code === "VISION_AI_FAILED") return "AI nhận diện ảnh đang lỗi hoặc quá tải. Hãy thử lại sau.";
  if (code === "VISION_EMPTY_RESULT") return "AI chưa trả được hình cờ hợp lệ. Hãy crop sát bàn cờ hơn rồi thử lại.";
  if (code === "VISION_BAD_KEY") return "OPENAI_API_KEY không hợp lệ hoặc không có quyền gọi OpenAI API.";
  if (code === "VISION_QUOTA") return "OpenAI API key đã hết quota hoặc chưa bật billing.";
  if (code === "VISION_MODEL_FAILED") return "Model nhận diện ảnh đang cấu hình không dùng được. Hãy thử OPENAI_VISION_MODEL=gpt-4o-mini.";
  if (code === "VISION_DAILY_LIMIT") return "Tài khoản này đã dùng hết 10 lượt nhận diện hôm nay. Lượt mới sẽ mở lại lúc 00h.";
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
    INVALID_CUSTOMER_NAME: "Tên khách hàng không được để trống.",
    INVALID_LICENSE_EXPORT: "File key gốc không khớp 100 license hiện tại.",
    RATE_LIMIT: "Bạn nhập Key quá nhanh. Hãy thử lại sau ít phút.",
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
    .then(() => hydrateUsersFromPostgres())
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
  Promise.allSettled([
    postgresStateStore.close(),
    mongoStateStore.close()
  ]).finally(() => process.exit(0));
}

process.on("SIGINT", shutdownServer);
process.on("SIGTERM", shutdownServer);
