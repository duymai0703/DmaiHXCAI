const START_FEN = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1";
const FILES = "abcdefghi";
const PIECE_NAMES = {
  R: "\u8eca", N: "\u99ac", B: "\u76f8", A: "\u4ed5", K: "\u5e25", C: "\u70ae", P: "\u5175",
  r: "\u8eca", n: "\u99ac", b: "\u8c61", a: "\u58eb", k: "\u5c07", c: "\u7832", p: "\u5352"
};
const PIECE_IMAGES = {
  R: "assets/pieces/red-rook.png",
  N: "assets/pieces/red-knight.png",
  B: "assets/pieces/red-elephant.png",
  A: "assets/pieces/red-advisor.png",
  K: "assets/pieces/red-king.png",
  C: "assets/pieces/red-cannon.png",
  P: "assets/pieces/red-pawn.png",
  r: "assets/pieces/black-rook.png",
  n: "assets/pieces/black-knight.png",
  b: "assets/pieces/black-elephant.png",
  a: "assets/pieces/black-advisor.png",
  k: "assets/pieces/black-king.png",
  c: "assets/pieces/black-cannon.png",
  p: "assets/pieces/black-pawn.png"
};
const MOBILE_RED_PIECE_IMAGES = {
  R: "assets/pieces/mobile-red-rook.png",
  N: "assets/pieces/mobile-red-knight.png",
  B: "assets/pieces/mobile-red-elephant.png",
  A: "assets/pieces/mobile-red-advisor.png",
  K: "assets/pieces/mobile-red-king.png",
  C: "assets/pieces/mobile-red-cannon.png",
  P: "assets/pieces/mobile-red-pawn.png"
};
const CUSTOM_PIECE_SET_KEYS = ["boquan1", "boquan2", "boquan3", "boquan4"];
const CUSTOM_PIECE_FILE_NAMES = {
  R: "red-rook.png",
  N: "red-knight.png",
  B: "red-elephant.png",
  A: "red-advisor.png",
  K: "red-king.png",
  C: "red-cannon.png",
  P: "red-pawn.png",
  r: "black-rook.png",
  n: "black-knight.png",
  b: "black-elephant.png",
  a: "black-advisor.png",
  k: "black-king.png",
  c: "black-cannon.png",
  p: "black-pawn.png"
};
const CUSTOM_PIECE_IMAGES_BY_SET = Object.fromEntries(
  CUSTOM_PIECE_SET_KEYS.map((set) => [
    set,
    Object.fromEntries(
      Object.entries(CUSTOM_PIECE_FILE_NAMES).map(([piece, file]) => [
        piece,
        `assets/pieces/sets/${set}/${file}`
      ])
    )
  ])
);
const PIECE_CODES = { k: "Tg", a: "S", b: "T", r: "X", c: "P", n: "M", p: "B" };
const EDITOR_PIECES = ["K", "A", "B", "N", "R", "C", "P", "k", "a", "b", "n", "r", "c", "p", ""];
const API_RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MANUAL_ANALYSIS_STAGES = [240, 420, 700, 1100, 1700, 2400, 3200];
const AUTO_ANALYSIS_STAGES = [220, 380, 650];
const ANALYSIS_MAX_MS = 10000;
const CLOUD_MOVE_LIMIT = 10;
const SOUND_ASSET_VERSION = "20260713-audio-v4";
const MOVE_SOUND_SOURCES = {
  move: `/assets/sounds/diquan.mp3?v=${SOUND_ASSET_VERSION}`,
  capture: `/assets/sounds/an.mp3?v=${SOUND_ASSET_VERSION}`,
  checkmate: `/assets/sounds/satcuc.mp3?v=${SOUND_ASSET_VERSION}`
};
const THEME_STORAGE_KEY = "dmaihxcai-theme";
const BOARD_SKIN_STORAGE_KEY = "dmaihxcai-board-skin";
const PIECE_SKIN_STORAGE_KEY = "dmaihxcai-piece-skin";
const AUTH_TOKEN_STORAGE_KEY = "license_token";
const LEGACY_AUTH_TOKEN_STORAGE_KEY = "dmaihxcai-auth-token";
const AUTH_USER_STORAGE_KEY = "dmaihxcai-auth-user";
const AUTH_ACCESS_KEY_STORAGE_KEY = "dmaihxcai-access-key";
const AUTH_DEVICE_ID_STORAGE_KEY = "dmaihxcai-device-id";
const authDeviceId = readOrCreateAuthDeviceId();
const ANALYSIS_ASSET_WARMUP_KEY = "dmaihxcai-analysis-assets-version";
const ANALYSIS_ASSET_WARMUP_VERSION = "20260713-audio-v4";
const ANALYSIS_ASSET_BLOCK_MS = 1800;
const ANALYSIS_ASSET_TIMEOUT_MS = 2400;
const ANALYSIS_MOVE_ANIMATION_MS = 228;
const ANALYSIS_MOVE_EASING = "cubic-bezier(0.16, 0.84, 0.22, 1)";
const ANALYSIS_NAVIGATION_ANALYSIS_DELAY_MS = 1000;
const ANALYSIS_MANUAL_MOVE_ANALYSIS_DELAY_MS = ANALYSIS_MOVE_ANIMATION_MS + 180;
const ANALYSIS_DISPLAY_DEPTH_BOOST = 10;
const ENGINE_SCORE_SENSITIVITY = 2.35;
const ENGINE_SCORE_DISPLAY_LIMIT = 2200;
const MOBILE_ROOM_ENTRY_URL = "/?mobileRoom=1#match";
const ANALYSIS_PRELOAD_TEXT = {
  prepare: "\u0110ang chu\u1ea9n b\u1ecb t\u00e0i nguy\u00ean...",
  cache: "\u0110ang l\u01b0u t\u00e0i nguy\u00ean v\u00e0o tr\u00ecnh duy\u1ec7t...",
  decode: "\u0110ang t\u1ed1i \u01b0u hi\u1ec3n th\u1ecb qu\u00e2n c\u1edd...",
  done: "\u0110\u00e3 ho\u00e0n t\u1ea5t."
};
const ANALYSIS_BLOCKING_ASSETS = [
  "/assets/board/board-skin-dark.svg?v=20260713-lines-v1",
  "/assets/board/board-skin-light.svg?v=20260713-lines-v1",
  "/assets/board/board-skin-mobile.svg?v=20260713-lines-v1",
  "/assets/board/board-skin-gold.svg?v=20260713-lines-v1",
  "/assets/board/board-skin-stone.svg?v=20260713-lines-v1",
  "/assets/board/board-skin-emerald.svg?v=20260713-lines-v1",
  "/assets/board/board-skin-wine.svg?v=20260713-lines-v1",
  ...Object.values(PIECE_IMAGES),
  ...Object.values(MOBILE_RED_PIECE_IMAGES),
  ...Object.values(CUSTOM_PIECE_IMAGES_BY_SET).flatMap((set) => Object.values(set))
];
const ANALYSIS_BACKGROUND_ASSETS = [
  MOVE_SOUND_SOURCES.move,
  MOVE_SOUND_SOURCES.capture,
  MOVE_SOUND_SOURCES.checkmate,
  "/assets/icons/backgr.png",
  "/assets/icons/header-logo.png",
  "/assets/icons/logow-header.png",
  "/assets/icons/logob-header.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/mb1-light.png",
  "/assets/icons/mb2-light.png",
  "/assets/icons/mb3-light.png",
  "/assets/icons/mb4-light.png",
  "/assets/icons/mb5-light.png",
  "/assets/icons/cole-light.png",
  "/assets/icons/guom-light.png",
  "/assets/icons/mb1-dark.png",
  "/assets/icons/mb2-dark.png",
  "/assets/icons/mb3-dark.png",
  "/assets/icons/mb4-dark.png",
  "/assets/icons/mb5-dark.png",
  "/assets/icons/cole-dark.png",
  "/assets/icons/guom-dark.png",
  "/assets/icons/sosach-light.png",
  "/assets/icons/sosach-dark.png",
  "/assets/icons/logow.png",
  "/assets/icons/logob.png",
  "/assets/effects/sat-cutout.png"
];
let wakePromise = null;

const state = {
  board: parseFen(START_FEN),
  side: "w",
  moves: [],
  cursor: 0,
  selected: null,
  hints: [],
  flipped: false,
  bestMove: "",
  suggestions: [],
  suggestionOptions: [],
  analysisMode: false,
  analysisRequest: 0,
  cloudRequest: 0,
  lastAnalysis: null,
  scoreAnimation: null,
  shownScore: null,
  auto: false,
  autoTimer: null,
  gameOver: false,
  checkmatedSide: null,
  editMode: false,
  mobileSetupMode: false,
  editorPiece: "R",
  resizeTimer: null,
  lastBoardSizeKey: "",
  lastBoardFrame: "",
  lastPieceFrame: "",
  lastArrowFrame: "",
  lastHistoryFrame: "",
  pieceSlots: null,
  hintSlots: null,
  slotLayoutKey: "",
  mobilePanel: "analysis",
  drawFrame: 0,
  queuedCursorTarget: null,
  queuedCursorFrame: 0,
  analysisRefreshTimer: 0,
  assetWarmupPending: false,
  assetWarmupProgress: 0,
  assetWarmupText: ANALYSIS_PRELOAD_TEXT.prepare,
  moveAnimation: null,
  moveAnimationTimer: 0,
  moveAnimationRunning: false,
  lastAnimatedMoveKey: "",
  activeMoveSlotEl: null,
  manualMoveFrame: 0,
  lastCheckmateEffectKey: "",
  checkmateEffectTimer: 0,
  analysisClockStartedAt: 0,
  analysisClockTimer: 0,
  analysisClockRequest: 0,
  analysisClockElapsedSec: 0,
  mobileAnalysisDepth: 0,
  mobileAnalysisScore: null,
  audioContext: null,
  moveSoundElements: null,
  moveSoundBuffers: null,
  moveSoundBufferJobs: null,
  moveSoundSegments: null,
  lastMoveSoundAt: 0,
  moveAudioUnlocked: false
};

const boardEl = document.getElementById("board");
const boardCanvas = document.getElementById("boardCanvas");
const arrowCanvas = document.getElementById("arrowCanvas");
const piecesEl = document.getElementById("pieces");
const motionLayerEl = document.getElementById("motionLayer");
const capturePieceEl = document.getElementById("capturePiece");
const movingPieceEl = document.getElementById("movingPiece");
const checkmateBurstEl = document.getElementById("checkmateBurst");
const analysisEl = document.getElementById("analysis");
const analyzeBtn = document.getElementById("analyzeBtn");
const cloudBookEl = document.getElementById("cloudBook");
const mobileScoreStripEl = document.getElementById("mobileScoreStrip");
const historyEl = document.getElementById("history");
const engineStatusEl = document.getElementById("engineStatus");
const networkStatusEl = document.getElementById("networkStatus");
const enginePathEl = document.getElementById("enginePath");
const delayEl = document.getElementById("delay");
const delayOut = document.getElementById("delayOut");
const piecePaletteEl = document.getElementById("piecePalette");
const loadFenBtn = document.getElementById("loadFenBtn");
const copyFenBtn = document.getElementById("copyFenBtn");
const editBoardBtn = document.getElementById("editBoardBtn");
const clearBoardBtn = document.getElementById("clearBoardBtn");
const sideToMoveEl = document.getElementById("sideToMove");
const mobileSetupPanelEl = document.getElementById("mobileSetupPanel");
const mobileSetupPaletteEl = document.getElementById("mobileSetupPalette");
const mobileSetupSideEl = document.getElementById("mobileSetupSide");
const mobileSetupSaveBtn = document.getElementById("mobileSetupSaveBtn");
const mobileSetupClearBtn = document.getElementById("mobileSetupClearBtn");
const mobileSetupCancelBtn = document.getElementById("mobileSetupCancelBtn");
const assetPreloadOverlayEl = document.getElementById("assetPreloadOverlay");
const assetPreloadTextEl = document.getElementById("assetPreloadText");
const assetPreloadPercentEl = document.getElementById("assetPreloadPercent");
const assetPreloadBarEl = document.getElementById("assetPreloadBar");
const mobileActionButtons = [...document.querySelectorAll("[data-mobile-action]")];
const mobilePanels = [...document.querySelectorAll("[data-mobile-panel]")];
const mobileThemeButtons = [...document.querySelectorAll("[data-theme-toggle]")];
const boardSkinMenuEl = document.getElementById("boardSkinMenu");
const boardSkinChoiceButtons = [...document.querySelectorAll("[data-board-skin-choice]")];
const pieceSkinChoiceButtons = [...document.querySelectorAll("[data-piece-skin-choice]")];
const accessGateEl = document.getElementById("accessGate");
const accessKeyFormEl = document.getElementById("accessKeyForm");
const accessKeyInputEl = document.getElementById("accessKeyInput");
const accessNameInputEl = document.getElementById("accessNameInput");
const accessKeyMessageEl = document.getElementById("accessKeyMessage");
let pendingAnalysisAccessKey = "";

setupThemeControls();
setupBoardSkinControls();
setupPieceSkinControls();
if (accessKeyFormEl) accessKeyFormEl.addEventListener("submit", onAnalysisAccessKeySubmit);
window.addEventListener("resize", onViewportResize, { passive: true });
boardEl.addEventListener("pointerdown", onBoardClick);
document.addEventListener("pointerdown", unlockMoveSound, { passive: true });
document.addEventListener("keydown", unlockMoveSound);
document.getElementById("flipBtn").addEventListener("click", toggleFlipBoard);
bindClick("saveEngineBtn", saveEnginePath);
bindClick("buildEngineBtn", buildEngine);
bindClick("downloadNetBtn", downloadNetwork);
analyzeBtn.addEventListener("click", () => toggleManualAnalysis().catch(() => {}));
bindClick("bestMoveBtn", playBestMove);
document.getElementById("undoBtn").addEventListener("click", undo);
document.getElementById("redoBtn").addEventListener("click", redo);
document.getElementById("resetBtn").addEventListener("click", reset);
document.getElementById("autoBtn").addEventListener("click", toggleAuto);
if (delayEl && delayOut) delayEl.addEventListener("input", () => delayOut.value = `${delayEl.value}ms`);
if (loadFenBtn) loadFenBtn.addEventListener("click", loadFenFromPrompt);
if (copyFenBtn) copyFenBtn.addEventListener("click", copyFenToClipboard);
if (editBoardBtn) editBoardBtn.addEventListener("click", toggleEditMode);
if (clearBoardBtn) clearBoardBtn.addEventListener("click", clearBoard);
if (sideToMoveEl) sideToMoveEl.addEventListener("change", setSideToMove);
if (mobileSetupSideEl) mobileSetupSideEl.addEventListener("change", setMobileSetupSide);
if (mobileSetupSaveBtn) mobileSetupSaveBtn.addEventListener("click", saveMobileSetupPosition);
if (mobileSetupClearBtn) mobileSetupClearBtn.addEventListener("click", clearMobileSetupBoard);
if (mobileSetupCancelBtn) mobileSetupCancelBtn.addEventListener("click", cancelMobileSetup);
preventDoubleTapZoom();
const assetWarmupPromise = warmAnalysisAssets();
startAnalysisActivityHeartbeat();
init();

function bindClick(id, handler) {
  const element = document.getElementById(id);
  if (element) element.addEventListener("click", handler);
}

function ensureMoveAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!state.audioContext) state.audioContext = new AudioCtor();
  if (state.audioContext.state === "suspended") {
    const resumed = state.audioContext.resume();
    if (resumed && typeof resumed.catch === "function") resumed.catch(() => {});
  }
  return state.audioContext;
}

function getMoveSoundElement(kind) {
  const source = MOVE_SOUND_SOURCES[kind];
  if (!source || typeof Audio === "undefined") return null;
  if (!state.moveSoundElements) state.moveSoundElements = Object.create(null);
  if (!state.moveSoundElements[kind]) {
    const audio = new Audio(source);
    audio.preload = "auto";
    audio.volume = kind === "checkmate" ? 0.96 : 0.78;
    audio.playsInline = true;
    state.moveSoundElements[kind] = audio;
  }
  return state.moveSoundElements[kind];
}

function unlockMediaSoundElements() {
  Object.keys(MOVE_SOUND_SOURCES).forEach((kind) => {
    const audio = getMoveSoundElement(kind);
    if (!audio) return;
    const wasMuted = audio.muted;
    audio.muted = true;
    audio.currentTime = 0;
    const played = audio.play();
    const reset = () => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = wasMuted;
    };
    if (played && typeof played.then === "function") {
      played.then(reset).catch(() => {
        audio.muted = wasMuted;
      });
    } else {
      reset();
    }
  });
}

function loadMoveSoundBuffer(kind) {
  const source = MOVE_SOUND_SOURCES[kind];
  const ctx = ensureMoveAudioContext();
  if (!source || !ctx || typeof fetch !== "function") return null;
  if (!state.moveSoundBuffers) state.moveSoundBuffers = Object.create(null);
  if (state.moveSoundBuffers[kind]) return Promise.resolve(state.moveSoundBuffers[kind]);
  if (!state.moveSoundBufferJobs) state.moveSoundBufferJobs = Object.create(null);
  if (state.moveSoundBufferJobs[kind]) return state.moveSoundBufferJobs[kind];
  state.moveSoundBufferJobs[kind] = fetch(source, { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("sound fetch failed");
      return response.arrayBuffer();
    })
    .then((buffer) => ctx.decodeAudioData(buffer.slice(0)))
    .then((audioBuffer) => {
      state.moveSoundBuffers[kind] = audioBuffer;
      return audioBuffer;
    })
    .catch(() => null);
  return state.moveSoundBufferJobs[kind];
}

function warmMoveSoundBuffers() {
  Object.keys(MOVE_SOUND_SOURCES).forEach((kind) => loadMoveSoundBuffer(kind));
}

function unlockMoveSound() {
  if (state.moveAudioUnlocked) return;
  state.moveAudioUnlocked = true;
  unlockMediaSoundElements();
  warmMoveSoundBuffers();
  const ctx = ensureMoveAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.02);
  gain.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(240, now);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.025);
}

function mediaSoundWindowMs(kind, durationMs = 0) {
  const fallback = kind === "checkmate" ? 520 : 220;
  const value = Number(durationMs) > 0 ? Number(durationMs) : fallback;
  return Math.max(80, value);
}

function mediaSoundStartTime(audio, kind, durationMs = 0) {
  const duration = Number(audio.duration);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const windowSeconds = Math.min(
    Math.max(0.08, mediaSoundWindowMs(kind, durationMs) / 1000),
    Math.max(0.08, duration - 0.02)
  );
  return Math.max(0, duration - windowSeconds);
}

function bestMoveSoundOffset(buffer, kind, durationMs = 0) {
  if (!state.moveSoundSegments) state.moveSoundSegments = Object.create(null);
  const clipMs = mediaSoundWindowMs(kind, durationMs);
  const key = `${kind}:${clipMs}`;
  if (Number.isFinite(state.moveSoundSegments[key])) return state.moveSoundSegments[key];
  const sampleRate = buffer.sampleRate || 44100;
  const windowSize = Math.max(1, Math.min(buffer.length, Math.floor(sampleRate * clipMs / 1000)));
  const stride = Math.max(64, Math.floor(windowSize / 8));
  const sampleStride = Math.max(1, Math.floor(windowSize / 520));
  const channelCount = Math.max(1, Math.min(2, buffer.numberOfChannels || 1));
  const channels = [];
  for (let channel = 0; channel < channelCount; channel += 1) {
    channels.push(buffer.getChannelData(channel));
  }
  let bestStart = 0;
  let bestEnergy = -1;
  const lastStart = Math.max(0, buffer.length - windowSize);
  for (let start = 0; start <= lastStart; start += stride) {
    let energy = 0;
    for (let index = start; index < start + windowSize; index += sampleStride) {
      let mixed = 0;
      for (let channel = 0; channel < channelCount; channel += 1) {
        mixed += Math.abs(channels[channel][index] || 0);
      }
      mixed /= channelCount;
      energy += mixed * mixed;
    }
    if (energy > bestEnergy) {
      bestEnergy = energy;
      bestStart = start;
    }
  }
  const offset = bestStart / sampleRate;
  state.moveSoundSegments[key] = offset;
  return offset;
}

function playDecodedMoveSound(kind, durationMs = 0) {
  const ctx = ensureMoveAudioContext();
  const buffer = state.moveSoundBuffers?.[kind];
  if (!ctx || !buffer || ctx.state !== "running") {
    loadMoveSoundBuffer(kind);
    return false;
  }
  const clipSeconds = Math.min(buffer.duration || 0, mediaSoundWindowMs(kind, durationMs) / 1000);
  if (!clipSeconds) return false;
  try {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(kind === "checkmate" ? 0.96 : kind === "capture" ? 0.9 : 0.78, ctx.currentTime);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime, bestMoveSoundOffset(buffer, kind, durationMs), clipSeconds);
    return true;
  } catch (error) {
    return false;
  }
}

function playMediaMoveSound(kind, durationMs = 0) {
  const audio = getMoveSoundElement(kind);
  if (!audio) return false;
  try {
    const targetMs = mediaSoundWindowMs(kind, durationMs);
    const startAt = mediaSoundStartTime(audio, kind, targetMs);
    if (startAt === null) {
      audio.load();
      return false;
    }
    const token = `${Date.now()}:${Math.random()}`;
    audio.pause();
    audio.currentTime = startAt;
    audio.volume = kind === "checkmate" ? 0.96 : kind === "capture" ? 0.9 : 0.78;
    audio._dmaihxcaiPlayToken = token;
    const played = audio.play();
    if (played && typeof played.catch === "function") {
      played.catch(() => {
        if (audio._dmaihxcaiPlayToken === token) playFallbackMoveSound(kind, durationMs);
      });
    }
    window.setTimeout(() => {
      if (audio._dmaihxcaiPlayToken !== token) return;
      audio.pause();
      audio.currentTime = 0;
    }, targetMs + 90);
    return true;
  } catch (error) {
    return false;
  }
}

function createMoveNoise(ctx, seconds, power = 2.4) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    const t = index / length;
    const decay = Math.pow(1 - t, power);
    data[index] = (Math.random() * 2 - 1) * decay;
  }
  return buffer;
}

function playNoiseSweep(ctx, destination, now, options) {
  const {
    delay = 0,
    duration = 0.18,
    peak = 0.24,
    from = 2800,
    to = 540,
    q = 1.8,
    type = "bandpass"
  } = options || {};
  const start = now + delay;
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = createMoveNoise(ctx, duration, 2.1);
  filter.type = type;
  filter.Q.setValueAtTime(q, start);
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(80, to), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.014);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function playTone(ctx, destination, now, options) {
  const {
    delay = 0,
    duration = 0.18,
    type = "sine",
    gainPeak = 0.12,
    from = 880,
    to = 360,
    attack = 0.006
  } = options || {};
  const start = now + delay;
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playMetalClash(ctx, destination, now, delay = 0) {
  [980, 1470, 2180].forEach((frequency, index) => {
    playTone(ctx, destination, now, {
      delay: delay + index * 0.012,
      duration: 0.24 + index * 0.03,
      type: index === 1 ? "triangle" : "sine",
      gainPeak: 0.13 / (index + 1),
      from: frequency,
      to: frequency * 0.72,
      attack: 0.003
    });
  });
}

function playFallbackMoveSound(kind = "move", durationMs = 0, nowMs = performance.now()) {
  const ctx = ensureMoveAudioContext();
  if (!ctx) return;
  if (ctx.state !== "running") {
    const resumed = ctx.resume();
    if (resumed && typeof resumed.then === "function") {
      resumed.then(() => playFallbackMoveSound(kind, durationMs)).catch(() => {});
    }
    return;
  }
  state.lastMoveSoundAt = nowMs;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(kind === "checkmate" ? 0.92 : 0.82, now);
  master.connect(ctx.destination);
  if (kind === "checkmate") {
    playNoiseSweep(ctx, master, now, { duration: 0.5, peak: 0.28, from: 520, to: 2600, q: 0.8, type: "bandpass" });
    playNoiseSweep(ctx, master, now, { delay: 0.06, duration: 0.34, peak: 0.24, from: 3600, to: 980, q: 1.7, type: "highpass" });
    playTone(ctx, master, now, { duration: 0.46, type: "sawtooth", gainPeak: 0.24, from: 150, to: 58, attack: 0.012 });
    playMetalClash(ctx, master, now, 0.1);
    return;
  }
  if (kind === "capture") {
    playNoiseSweep(ctx, master, now, { duration: 0.2, peak: 0.36, from: 4200, to: 760, q: 2.2, type: "highpass" });
    playNoiseSweep(ctx, master, now, { delay: 0.025, duration: 0.11, peak: 0.2, from: 2500, to: 1350, q: 3.4, type: "bandpass" });
    playMetalClash(ctx, master, now, 0.018);
    return;
  }
  playNoiseSweep(ctx, master, now, { duration: 0.2, peak: 0.28, from: 3200, to: 520, q: 1.45, type: "bandpass" });
  playTone(ctx, master, now, { duration: 0.18, type: "sine", gainPeak: 0.075, from: 940, to: 360, attack: 0.014 });
}

function playMoveSound(kind = "move", durationMs = 0) {
  const nowMs = performance.now();
  if (kind !== "checkmate" && nowMs - Number(state.lastMoveSoundAt || 0) < 45) return;
  if (MOVE_SOUND_SOURCES[kind]) {
    state.lastMoveSoundAt = nowMs;
    if (playDecodedMoveSound(kind, durationMs)) return;
    if (playMediaMoveSound(kind, durationMs)) return;
  }
  playFallbackMoveSound(kind, durationMs, nowMs);
}

function setupThemeControls() {
  applyTheme(readTheme());
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.themeChoice, { persist: true });
    });
  });
  mobileThemeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(currentTheme() === "light" ? "dark" : "light", { persist: true });
    });
  });
}

function readTheme() {
  return normalizeTheme(readStorage(THEME_STORAGE_KEY) || document.documentElement.dataset.theme || "dark");
}

function normalizeTheme(theme) {
  return theme === "light" ? "light" : "dark";
}

function setupBoardSkinControls() {
  applyBoardSkin(readBoardSkin());
  boardSkinChoiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyBoardSkin(button.dataset.boardSkinChoice, { persist: true });
      hideBoardSkinMenu();
    });
  });
}

function readBoardSkin() {
  return normalizeBoardSkin(readStorage(BOARD_SKIN_STORAGE_KEY) || document.documentElement.dataset.boardSkin || "ice");
}

function normalizeBoardSkin(skin) {
  return skin === "gold" || skin === "stone" || skin === "pink" || skin === "emerald" || skin === "dark" ? skin : "ice";
}

function applyBoardSkin(skin, { persist = false } = {}) {
  const normalized = normalizeBoardSkin(skin);
  document.documentElement.dataset.boardSkin = normalized;
  if (persist) writeStorage(BOARD_SKIN_STORAGE_KEY, normalized);
  boardSkinChoiceButtons.forEach((button) => {
    const active = normalizeBoardSkin(button.dataset.boardSkinChoice) === normalized;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function toggleBoardSkinMenu() {
  if (!boardSkinMenuEl) return;
  boardSkinMenuEl.classList.toggle("hidden");
}

function hideBoardSkinMenu() {
  if (boardSkinMenuEl) boardSkinMenuEl.classList.add("hidden");
}

function setupPieceSkinControls() {
  applyPieceSkin(readPieceSkin());
  pieceSkinChoiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyPieceSkin(button.dataset.pieceSkinChoice, { persist: true });
      hideBoardSkinMenu();
    });
  });
}

function readPieceSkin() {
  return normalizePieceSkin(readStorage(PIECE_SKIN_STORAGE_KEY) || document.documentElement.dataset.pieceSkin || "default");
}

function normalizePieceSkin(skin) {
  return CUSTOM_PIECE_SET_KEYS.includes(skin) ? skin : "default";
}

function currentPieceSkin() {
  return normalizePieceSkin(document.documentElement.dataset.pieceSkin || readPieceSkin());
}

function applyPieceSkin(skin, { persist = false } = {}) {
  const normalized = normalizePieceSkin(skin);
  document.documentElement.dataset.pieceSkin = normalized;
  if (persist) writeStorage(PIECE_SKIN_STORAGE_KEY, normalized);
  pieceSkinChoiceButtons.forEach((button) => {
    const active = normalizePieceSkin(button.dataset.pieceSkinChoice) === normalized;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  state.lastPieceFrame = "";
  state.lastArrowFrame = "";
  state.slotLayoutKey = "";
  renderPiecePalette();
  renderMobileSetupPalette();
  draw(true);
}

function applyTheme(theme, { persist = false } = {}) {
  const normalized = normalizeTheme(theme);
  document.documentElement.dataset.theme = normalized;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", normalized === "light" ? "#eaf6ff" : "#050914");
  updateBrandLogo(normalized);
  if (persist) writeStorage(THEME_STORAGE_KEY, normalized);
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    const active = button.dataset.themeChoice === normalized;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  state.lastArrowFrame = "";
  drawArrowLayer();
}

function updateBrandLogo(theme) {
  const logo = theme === "light" ? "/assets/icons/logow-header.png" : "/assets/icons/logob-header.png";
  document.querySelectorAll(".brand-mark").forEach((image) => {
    if (image instanceof HTMLImageElement && !image.src.endsWith(logo)) {
      image.src = logo;
    }
  });
  const mobileLogo = theme === "light" ? "/assets/icons/logow.png" : "/assets/icons/logob.png";
  mobileThemeButtons.forEach((button) => {
    const image = button.querySelector("img");
    if (image instanceof HTMLImageElement && !image.src.endsWith(mobileLogo)) {
      image.src = mobileLogo;
    }
    button.setAttribute("aria-label", theme === "light" ? "Đổi sang giao diện bóng đêm" : "Đổi sang giao diện ánh sáng");
  });
  updateMobileActionIcons(theme);
}

function updateMobileActionIcons(theme) {
  const suffix = theme === "light" ? "light" : "dark";
  document.querySelectorAll("[data-mobile-icon]").forEach((button) => {
    const key = button.getAttribute("data-mobile-icon");
    const image = button.querySelector("img");
    if (!key || !(image instanceof HTMLImageElement)) return;
    const nextSrc = `/assets/icons/${key}-${suffix}.png`;
    if (!image.src.endsWith(nextSrc)) image.src = nextSrc;
  });
}

function currentTheme() {
  return normalizeTheme(document.documentElement.dataset.theme || "dark");
}

function preventDoubleTapZoom() {
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (event) => {
    const now = Date.now();
    if (now - lastTouchEnd < 320) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
}

function startAnalysisActivityHeartbeat() {
  reportAnalysisActivity("Đang dùng phần mềm phân tích");
  window.setInterval(() => {
    reportAnalysisActivity("Đang dùng phần mềm phân tích");
  }, 12000);
}

function reportAnalysisActivity(action = "Đang dùng phần mềm phân tích") {
  const token = readStorage(AUTH_TOKEN_STORAGE_KEY);
  if (!token) return;
  fetch("/api/activity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      route: "analysis",
      roomKey: "",
      action
    }),
    cache: "no-store"
  }).catch(() => {});
}

function scheduleBoardDraw() {
  if (state.resizeTimer) clearTimeout(state.resizeTimer);
  state.resizeTimer = window.setTimeout(() => {
    state.resizeTimer = null;
    const rect = boardEl.getBoundingClientRect();
    const sizeKey = `${Math.round(rect.width)}`;
    if (sizeKey === state.lastBoardSizeKey) return;
    state.lastBoardSizeKey = sizeKey;
    state.lastBoardFrame = "";
    state.lastPieceFrame = "";
    state.lastArrowFrame = "";
    state.slotLayoutKey = "";
    draw(true);
  }, 120);
}

async function warmAnalysisAssets() {
  const existingVersion = readStorage(ANALYSIS_ASSET_WARMUP_KEY);
  if (existingVersion === ANALYSIS_ASSET_WARMUP_VERSION) {
    state.assetWarmupPending = false;
    state.assetWarmupProgress = 100;
    state.assetWarmupText = ANALYSIS_PRELOAD_TEXT.done;
    renderAssetPreloadOverlay();
    return;
  }

  const blockingAssets = [...new Set(ANALYSIS_BLOCKING_ASSETS)];
  const backgroundAssets = [...new Set(ANALYSIS_BACKGROUND_ASSETS)];
  const totalSteps = Math.max(
    1,
    ("caches" in window ? blockingAssets.length : 0) +
    countImageAssets(blockingAssets)
  );
  const tracker = createAssetWarmupTracker(totalSteps);

  state.assetWarmupPending = true;
  state.assetWarmupProgress = 0;
  state.assetWarmupText = ANALYSIS_PRELOAD_TEXT.prepare;
  renderAssetPreloadOverlay();

  void Promise.allSettled([
    cacheAnalysisAssets(backgroundAssets),
    decodeAnalysisAssets(backgroundAssets)
  ]).catch(() => {});

  const finishBlocking = Promise.allSettled([
    cacheAnalysisAssets(blockingAssets, tracker),
    decodeAnalysisAssets(blockingAssets, tracker)
  ]).then(() => {
    writeStorage(ANALYSIS_ASSET_WARMUP_KEY, ANALYSIS_ASSET_WARMUP_VERSION);
    tracker.finish(ANALYSIS_PRELOAD_TEXT.done);
    void tryPersistBrowserStorage();
  }).catch(() => {});

  try {
    await Promise.race([
      finishBlocking,
      delay(ANALYSIS_ASSET_BLOCK_MS)
    ]);
  } finally {
    state.assetWarmupPending = false;
    renderAssetPreloadOverlay();
  }

  return finishBlocking;
}

function renderAssetPreloadOverlay() {
  if (!assetPreloadOverlayEl) return;
  const visible = Boolean(state.assetWarmupPending);
  assetPreloadOverlayEl.classList.toggle("hidden", !visible);
  document.body.classList.toggle("asset-preload-active", visible);
  const progress = Math.max(0, Math.min(100, Math.round(state.assetWarmupProgress || 0)));
  if (assetPreloadPercentEl) assetPreloadPercentEl.textContent = `${progress}%`;
  if (assetPreloadBarEl) assetPreloadBarEl.style.width = `${progress}%`;
  if (assetPreloadTextEl && state.assetWarmupText) assetPreloadTextEl.textContent = state.assetWarmupText;
  if (visible && assetPreloadTextEl && !state.assetWarmupText) {
    assetPreloadTextEl.textContent = "Đang tải tài nguyên lần đầu để bàn cờ hiển thị mượt hơn...";
  }
}

async function cacheAnalysisAssets(assets, tracker) {
  if (!("caches" in window)) return;
  const cache = await caches.open(`dmaihxcai-analysis-runtime-${ANALYSIS_ASSET_WARMUP_VERSION}`);
  await Promise.all(assets.map(async (asset) => {
    try {
      const existing = await cache.match(asset);
      if (existing) return;
      const response = await fetchWithTimeout(asset, { cache: "force-cache" }, ANALYSIS_ASSET_TIMEOUT_MS);
      if (response && response.ok) await cache.put(asset, response.clone());
    } catch {
    } finally {
      tracker?.step(ANALYSIS_PRELOAD_TEXT.cache);
    }
  }));
}

async function decodeAnalysisAssets(assets, tracker) {
  const imageAssets = assets.filter((asset) => /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(asset));
  await Promise.all(imageAssets.map(async (asset) => {
    try {
      await decodeAnalysisAsset(asset);
    } finally {
      tracker?.step(ANALYSIS_PRELOAD_TEXT.decode);
    }
  }));
}

function decodeAnalysisAsset(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    image.src = src;
    let done = false;
    const timer = window.setTimeout(finish, ANALYSIS_ASSET_TIMEOUT_MS);
    function finish() {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve();
    }
    if (typeof image.decode === "function") {
      image.decode().then(finish).catch(() => {
        if (image.complete) finish();
        else {
          image.onload = finish;
          image.onerror = finish;
        }
      });
      return;
    }
    image.onload = finish;
    image.onerror = finish;
  });
}

async function waitForWarmup(tasks, timeoutMs) {
  await Promise.race([
    Promise.allSettled(tasks),
    delay(timeoutMs)
  ]);
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

async function fetchWithTimeout(resource, options = {}, timeoutMs = ANALYSIS_ASSET_TIMEOUT_MS) {
  if (typeof AbortController === "undefined") {
    return fetch(resource, options);
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, {
      ...options,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function tryPersistBrowserStorage() {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

function countImageAssets(assets) {
  return assets.reduce((count, asset) => count + (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(asset) ? 1 : 0), 0);
}

function createAssetWarmupTracker(totalSteps) {
  let completedSteps = 0;
  return {
    step(text) {
      completedSteps = Math.min(totalSteps, completedSteps + 1);
      state.assetWarmupProgress = Math.round((completedSteps / totalSteps) * 100);
      if (text) state.assetWarmupText = text;
      renderAssetPreloadOverlay();
    },
    finish(text) {
      completedSteps = totalSteps;
      state.assetWarmupProgress = 100;
      if (text) state.assetWarmupText = text;
      renderAssetPreloadOverlay();
    }
  };
}

function autoDelay() {
  return delayEl ? Number(delayEl.value) : 700;
}

async function init() {
  syncViewportHeight();
  setupMobileActionStrip();
  renderPiecePalette();
  renderMobileSetupPalette();
  renderMobilePanelState();
  updateEditorUi();
  wakeBackend();
  void assetWarmupPromise.catch(() => {});
  draw();
  const allowed = await ensureAnalysisAccess();
  if (!allowed) return;
  startAnalysisAfterAccess();
}
function startAnalysisAfterAccess() {
  hideAccessGate();
  reportAnalysisActivity("Đang dùng phần mềm phân tích");
  refreshCloudBook();
  void refreshStatus().catch(() => {});
}

async function ensureAnalysisAccess() {
  const token = readStorage(AUTH_TOKEN_STORAGE_KEY) || readStorage(LEGACY_AUTH_TOKEN_STORAGE_KEY);
  if (!token) {
    if (await restoreAnalysisSessionFromStoredKey()) return true;
    showAccessGate();
    return false;
  }
  writeStorage(AUTH_TOKEN_STORAGE_KEY, token);
  try {
    const payload = await api("/api/auth/me");
    if (payload.token) writeStorage(AUTH_TOKEN_STORAGE_KEY, payload.token);
    if (payload.user) writeStorage(AUTH_USER_STORAGE_KEY, JSON.stringify(payload.user));
    hideAccessGate();
    return true;
  } catch (error) {
    if (isSessionReplacedError(error) && await restoreAnalysisSessionFromStoredKey()) return true;
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    showAccessGate("Phiên Key đã hết hạn. Hãy nhập lại Key.");
    return false;
  }
}

async function restoreAnalysisSessionFromStoredKey() {
  const key = readStorage(AUTH_ACCESS_KEY_STORAGE_KEY);
  if (!key) return false;
  try {
    const payload = await api("/api/license/activate", { key, deviceId: authDeviceId }, { suppressSessionReplaced: true });
    writeStorage(AUTH_TOKEN_STORAGE_KEY, payload.token || "");
    if (payload.user) writeStorage(AUTH_USER_STORAGE_KEY, JSON.stringify(payload.user));
    hideAccessGate();
    return true;
  } catch {
    return false;
  }
}

function showAccessGate(message = "") {
  if (!accessGateEl) return;
  accessGateEl.classList.remove("hidden");
  document.body.classList.add("access-locked");
  updateAnalysisAccessGateMode(false);
  if (accessKeyMessageEl) accessKeyMessageEl.textContent = message;
  window.setTimeout(() => accessKeyInputEl?.focus({ preventScroll: true }), 60);
}

function hideAccessGate() {
  accessGateEl?.classList.add("hidden");
  document.body.classList.remove("access-locked");
  if (accessKeyMessageEl) accessKeyMessageEl.textContent = "";
  pendingAnalysisAccessKey = "";
  updateAnalysisAccessGateMode(false);
}

function updateAnalysisAccessGateMode(hasPendingKey) {
  accessNameInputEl?.classList.add("hidden");
  if (accessNameInputEl) accessNameInputEl.required = false;
  if (accessKeyInputEl) accessKeyInputEl.readOnly = false;
  const submitButton = accessKeyFormEl?.querySelector("button[type='submit']");
  if (submitButton) submitButton.textContent = "Kich hoat";
  return;
  if (submitButton) submitButton.textContent = hasPendingKey ? "Xác nhận tên" : "Kích hoạt";
}

async function onAnalysisAccessKeySubmit(event) {
  event.preventDefault();
  const key = String(accessKeyInputEl?.value || readStorage(AUTH_ACCESS_KEY_STORAGE_KEY) || "").trim();
  if (!key) {
    showAccessGate("Hãy nhập Key kích hoạt.");
    return;
  }
  if (accessKeyMessageEl) accessKeyMessageEl.textContent = "Dang kich hoat Key...";
  try {
    const payload = await api("/api/license/activate", { key, deviceId: authDeviceId });
    writeStorage(AUTH_TOKEN_STORAGE_KEY, payload.token || "");
    writeStorage(AUTH_ACCESS_KEY_STORAGE_KEY, key);
    if (payload.user) writeStorage(AUTH_USER_STORAGE_KEY, JSON.stringify(payload.user));
    if (accessKeyInputEl) accessKeyInputEl.value = "";
    if (accessNameInputEl) accessNameInputEl.value = "";
    startAnalysisAfterAccess();
    showToast(payload.user?.role === "admin" ? "Da mo trang quan tri." : "Da kich hoat Key.");
    if (payload.user?.role === "admin") window.location.href = "/?mobileRoom=1#admin";
  } catch (error) {
    pendingAnalysisAccessKey = "";
    updateAnalysisAccessGateMode(false);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    if (key !== readStorage(AUTH_ACCESS_KEY_STORAGE_KEY)) localStorage.removeItem(AUTH_ACCESS_KEY_STORAGE_KEY);
    showAccessGate(error.message || "Key khong dung.");
  }
  return;
  if (!pendingAnalysisAccessKey) {
    if (accessKeyMessageEl) accessKeyMessageEl.textContent = "Đang kiểm tra Key...";
    try {
      const checked = await api("/api/license/check-key", { key });
      if (checked.admin) {
        const payload = await api("/api/license/activate", { key });
        writeStorage(AUTH_TOKEN_STORAGE_KEY, payload.token || "");
        if (payload.user) writeStorage(AUTH_USER_STORAGE_KEY, JSON.stringify(payload.user));
        if (accessKeyInputEl) accessKeyInputEl.value = "";
        hideAccessGate();
        showToast("Đã mở trang quản trị.");
        window.location.href = "/?mobileRoom=1#admin";
        return;
      }
      pendingAnalysisAccessKey = key;
      updateAnalysisAccessGateMode(true);
      if (accessKeyMessageEl) accessKeyMessageEl.textContent = "Key hợp lệ. Hãy nhập tên khách hàng.";
      window.setTimeout(() => accessNameInputEl?.focus({ preventScroll: true }), 40);
      return;
    } catch (error) {
      pendingAnalysisAccessKey = "";
      updateAnalysisAccessGateMode(false);
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      showAccessGate(error.message || "Key không đúng.");
      return;
    }
  }
  const customerName = String(accessNameInputEl?.value || "").trim();
  if (!customerName) {
    showAccessGate("Hãy nhập tên khách hàng.");
    return;
  }
  if (accessKeyMessageEl) accessKeyMessageEl.textContent = "Đang kích hoạt license...";
  try {
    const payload = await api("/api/license/activate", { key, customerName });
    writeStorage(AUTH_TOKEN_STORAGE_KEY, payload.token || "");
    if (payload.user) writeStorage(AUTH_USER_STORAGE_KEY, JSON.stringify(payload.user));
    if (accessKeyInputEl) accessKeyInputEl.value = "";
    if (accessNameInputEl) accessNameInputEl.value = "";
    startAnalysisAfterAccess();
    showToast("Đã kích hoạt license.");
  } catch (error) {
    pendingAnalysisAccessKey = "";
    updateAnalysisAccessGateMode(false);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    showAccessGate(error.message || "Key không đúng.");
  }
}

function onViewportResize() {
  syncViewportHeight();
  renderMobilePanelState();
  scheduleBoardDraw();
}

function syncViewportHeight() {
  document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
}

function isCompactMobile() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function analysisMoveDurationMs() {
  return ANALYSIS_MOVE_ANIMATION_MS;
}

function pieceRestTransform() {
  return isCompactMobile() ? "translate3d(-50%, -50%, 0)" : "translate(-50%, -50%)";
}

function pieceImageFor(piece) {
  const selectedSet = currentPieceSkin();
  if (selectedSet !== "default") {
    return CUSTOM_PIECE_IMAGES_BY_SET[selectedSet]?.[piece] || PIECE_IMAGES[piece];
  }
  return (isCompactMobile() && MOBILE_RED_PIECE_IMAGES[piece]) || PIECE_IMAGES[piece];
}

function setupMobileActionStrip() {
  mobileActionButtons.forEach((button) => {
    button.addEventListener("click", () => handleMobileAction(button.dataset.mobileAction || ""));
  });
  setupMobileRoomConfirm();
}

function handleMobileAction(action) {
  if (action !== "cole") hideBoardSkinMenu();
  switch (action) {
    case "analysis":
      setMobilePanel("analysis");
      toggleManualAnalysis().catch(() => {});
      break;
    case "cloud":
      setMobilePanel("cloud");
      break;
    case "history":
      setMobilePanel("history");
      break;
    case "tools":
      setMobilePanel("tools");
      break;
    case "ai":
      setMobilePanel("ai");
      break;
    case "undo":
      undo();
      break;
    case "redo":
      redo();
      break;
    case "reset":
      if (state.mobileSetupMode) clearMobileSetupBoard();
      else reset();
      break;
    case "setup":
      startMobileSetup();
      break;
    case "flip":
      toggleFlipBoard();
      break;
    case "cole":
      toggleBoardSkinMenu();
      break;
    case "guom":
      showMobileRoomConfirm();
      break;
    default:
      break;
  }
}

function setupMobileRoomConfirm() {
  if (document.getElementById("mobileRoomConfirm")) return;
  const overlay = document.createElement("div");
  overlay.id = "mobileRoomConfirm";
  overlay.className = "mobile-room-confirm hidden";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "mobileRoomConfirmTitle");

  const card = document.createElement("div");
  card.className = "mobile-room-confirm-card";

  const title = document.createElement("strong");
  title.id = "mobileRoomConfirmTitle";
  title.textContent = "xác nhận chuyển qua chế độ phòng đấu?";

  const actions = document.createElement("div");
  actions.className = "mobile-room-confirm-actions";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "mobile-room-confirm-cancel";
  cancel.textContent = "Không";
  cancel.addEventListener("click", hideMobileRoomConfirm);

  const accept = document.createElement("button");
  accept.type = "button";
  accept.className = "mobile-room-confirm-accept";
  accept.textContent = "Đồng ý";
  accept.addEventListener("click", () => {
    hideMobileRoomConfirm();
    window.location.href = MOBILE_ROOM_ENTRY_URL;
  });

  actions.append(cancel, accept);
  card.append(title, actions);
  overlay.appendChild(card);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) hideMobileRoomConfirm();
  });
  document.body.appendChild(overlay);
}

function showMobileRoomConfirm() {
  const overlay = document.getElementById("mobileRoomConfirm");
  if (!overlay) return;
  overlay.classList.remove("hidden");
  document.body.classList.add("mobile-room-confirm-open");
}

function hideMobileRoomConfirm() {
  const overlay = document.getElementById("mobileRoomConfirm");
  if (!overlay) return;
  overlay.classList.add("hidden");
  document.body.classList.remove("mobile-room-confirm-open");
}

function toggleFlipBoard() {
  state.flipped = !state.flipped;
  state.lastBoardFrame = "";
  state.lastPieceFrame = "";
  state.lastArrowFrame = "";
  state.slotLayoutKey = "";
  if (state.lastAnalysis) {
    renderAnalysis(state.lastAnalysis.result, state.lastAnalysis.board, state.lastAnalysis.side);
  }
  draw();
  refreshCloudBook();
}

function setMobilePanel(panel) {
  state.mobilePanel = panel;
  renderMobilePanelState();
}

function renderMobilePanelState() {
  document.body.classList.remove("analysis-mobile-mode");
  mobilePanels.forEach((panel) => {
    panel.classList.add("is-mobile-active");
  });
  mobileActionButtons.forEach((button) => {
    button.classList.remove("active");
  });
  updateAnalysisToggleState();
}

async function refreshStatus() {
  const status = await api("/api/status");
  if (enginePathEl) enginePathEl.value = status.enginePath || "";
  if (engineStatusEl) engineStatusEl.textContent = status.exists ? `Engine connected: ${status.enginePath}` : "No Pikafish binary yet. Click Build engine or set the .exe path.";
  if (networkStatusEl) networkStatusEl.textContent = status.networkExists ? `NNUE: ${status.networkPath}` : "NNUE: missing pikafish.nnue. Download it before deep analysis.";
}

async function saveEnginePath() {
  const result = await api("/api/config", { enginePath: enginePathEl.value.trim() });
  engineStatusEl.textContent = result.exists ? `Engine: ${result.enginePath}` : "Path does not exist.";
}

async function buildEngine() {
  const button = document.getElementById("buildEngineBtn");
  button.disabled = true;
  button.textContent = "Building...";
  engineStatusEl.textContent = "Building Pikafish with local compiler. This can take a few minutes.";
  try {
    const result = await api("/api/build-engine", {});
    enginePathEl.value = result.enginePath || "";
    engineStatusEl.textContent = result.exists ? `Build done: ${result.enginePath}` : `Build did not create an engine. ${result.log || ""}`;
  } catch (err) {
    engineStatusEl.textContent = err.message;
  } finally {
    button.disabled = false;
    button.textContent = "Build engine";
    refreshStatus();
  }
}

async function downloadNetwork() {
  const button = document.getElementById("downloadNetBtn");
  button.disabled = true;
  button.textContent = "Downloading...";
  networkStatusEl.textContent = "Downloading pikafish.nnue from official Pikafish Networks...";
  try {
    const result = await api("/api/download-network", {});
    networkStatusEl.textContent = result.exists ? `NNUE: ${result.networkPath}` : "NNUE download failed.";
  } catch (err) {
    networkStatusEl.textContent = err.message;
  } finally {
    button.disabled = false;
    button.textContent = "Tai NNUE";
    refreshStatus();
  }
}

async function startManualAnalysis() {
  reportAnalysisActivity("Bấm phân tích bằng Pikafish");
  stopAutoPlay(true);
  cancelScheduledAnalysisRefresh();
  state.analysisMode = true;
  updateAnalysisToggleState();
  return runAnalysis({ activateMode: true, autoPlay: false });
}

function stopManualAnalysis() {
  cancelScheduledAnalysisRefresh();
  stopAutoPlay(true);
  stopScoreAnimation();
  stopAnalysisClock();
  state.analysisMode = false;
  state.bestMove = "";
  state.suggestions = [];
  state.suggestionOptions = [];
  state.lastAnalysis = null;
  state.shownScore = null;
  state.analysisRequest++;
  clearArrow();
  renderScore(0, "ChÆ°a phÃ¢n tÃ­ch");
  updateAnalysisToggleState();
}

function toggleManualAnalysis() {
  if (state.analysisMode) {
    stopManualAnalysis();
    return Promise.resolve();
  }
  return startManualAnalysis();
}

function updateAnalysisToggleState() {
  if (analyzeBtn) {
    analyzeBtn.classList.toggle("active", state.analysisMode);
    analyzeBtn.setAttribute("aria-pressed", state.analysisMode ? "true" : "false");
  }
  mobileActionButtons.forEach((button) => {
    if (button.dataset.mobileAction === "analysis") {
      button.classList.toggle("active", state.analysisMode);
      button.setAttribute("aria-pressed", state.analysisMode ? "true" : "false");
    }
  });
}

async function runAnalysis({ activateMode = false, autoPlay = false } = {}) {
  cancelScheduledAnalysisRefresh();
  if (activateMode) {
    state.analysisMode = true;
    updateAnalysisToggleState();
  }
  const requestId = ++state.analysisRequest;
  startAnalysisClock(requestId);
  const boardBefore = cloneBoard(state.board);
  const sideBefore = state.side;
  const fenBefore = `${boardToCloudFen(boardBefore, sideBefore)} - - 0 1`;
  analysisEl.textContent = "Đang phân tích...";
  renderPendingAnalysis();
  state.bestMove = "";
  state.suggestions = [];
  state.suggestionOptions = [];
  state.lastAnalysis = null;
  state.shownScore = null;
  state.mobileAnalysisDepth = 0;
  state.mobileAnalysisScore = null;
  stopScoreAnimation();
  clearArrow();

  try {
    const schedule = autoPlay ? AUTO_ANALYSIS_STAGES : MANUAL_ANALYSIS_STAGES;
    const startedAt = performance.now();
    let latestResult = null;

    for (const stageMs of schedule) {
      if (requestId !== state.analysisRequest) return latestResult;
      const elapsed = performance.now() - startedAt;
      const remainingBudget = ANALYSIS_MAX_MS - elapsed;
      if (remainingBudget < 140) break;
      const movetime = Math.max(120, Math.min(stageMs, Math.floor(remainingBudget)));
      const result = await api("/api/analyze", {
        fen: fenBefore,
        moves: [],
        movetime,
        multipv: 1
      });
      latestResult = result;
      if (requestId !== state.analysisRequest) return latestResult;
      if (hasAnalysisLine(result)) {
        applyAnalysisSnapshot(result, boardBefore, sideBefore, { pending: true });
      }
      if ((performance.now() - startedAt) >= ANALYSIS_MAX_MS) break;
    }

    if (!latestResult || !hasAnalysisLine(latestResult)) {
      if (requestId === state.analysisRequest) renderAnalysis(latestResult || {}, boardBefore, sideBefore, { pending: false });
      return latestResult;
    }

    if (requestId !== state.analysisRequest) return latestResult;
    applyAnalysisSnapshot(latestResult, boardBefore, sideBefore, { pending: false });
    return latestResult;
  } catch (err) {
    if (requestId === state.analysisRequest) {
      analysisEl.textContent = err.message;
      stopAnalysisClock();
    }
    throw err;
  }
}

async function playBestMove() {
  const result = state.bestMove ? { bestMove: state.bestMove } : await runAnalysis({ activateMode: state.analysisMode });
  if (result?.bestMove && result.bestMove !== "(none)" && result.bestMove !== "0000") {
    makeMove(result.bestMove);
  }
}

function cancelScheduledAnalysisRefresh() {
  if (!state.analysisRefreshTimer) return;
  clearTimeout(state.analysisRefreshTimer);
  state.analysisRefreshTimer = 0;
}

function scheduleAnalysisRefresh(delay = 0) {
  cancelScheduledAnalysisRefresh();
  if (!state.analysisMode) return;
  state.analysisRefreshTimer = window.setTimeout(() => {
    state.analysisRefreshTimer = 0;
    runAnalysis({ activateMode: true }).catch(() => {});
  }, Math.max(0, delay));
}

function clearQueuedCursorNavigation() {
  if (state.queuedCursorFrame) {
    cancelAnimationFrame(state.queuedCursorFrame);
    state.queuedCursorFrame = 0;
  }
  state.queuedCursorTarget = null;
}

function requestQueuedCursorStep() {
  if (state.queuedCursorFrame || state.moveAnimationRunning || state.moveAnimation) return;
  state.queuedCursorFrame = window.requestAnimationFrame(applyQueuedCursorTarget);
}

function clearManualMoveFrame() {
  if (!state.manualMoveFrame) return;
  cancelAnimationFrame(state.manualMoveFrame);
  state.manualMoveFrame = 0;
}

function toggleAuto() {
  cancelScheduledAnalysisRefresh();
  stopScoreAnimation();
  state.auto = !state.auto;
  if (state.auto) {
    state.analysisMode = false;
    state.suggestions = [];
    state.suggestionOptions = [];
    state.bestMove = "";
    state.lastAnalysis = null;
    updateAnalysisToggleState();
  }
  document.getElementById("autoBtn").textContent = state.auto ? "Dừng" : "Bắt đầu";
  document.getElementById("autoBtn").classList.toggle("active", state.auto);
  if (state.auto) autoStep();
  else clearTimeout(state.autoTimer);
}

function stopAutoPlay(clearSides = false) {
  state.auto = false;
  clearTimeout(state.autoTimer);
  const autoBtn = document.getElementById("autoBtn");
  autoBtn.textContent = "Bắt đầu";
  autoBtn.classList.remove("active");
  if (clearSides) {
    document.getElementById("aiRed").checked = false;
    document.getElementById("aiBlack").checked = false;
  }
}

async function autoStep() {
  if (state.gameOver) {
    stopAutoPlay();
    return;
  }
  if (!state.auto) return;
  const red = document.getElementById("aiRed").checked;
  const black = document.getElementById("aiBlack").checked;
  const shouldMove = (state.side === "w" && red) || (state.side === "b" && black);
  if (!shouldMove) {
    state.autoTimer = setTimeout(autoStep, autoDelay());
    return;
  }
  try {
    const result = await runAnalysis({ autoPlay: true });
    if (result?.bestMove && result.bestMove !== "(none)") makeMove(result.bestMove, { manual: false });
  } catch {
    stopAutoPlay();
    return;
  }
  state.autoTimer = setTimeout(autoStep, autoDelay());
}

function renderAnalysis(result, startBoard, startSide, { animateScore = false } = {}) {
  if (!analysisEl) return;
  analysisEl.innerHTML = "";
  if (!result.lines || !result.lines.length) {
    renderScore(0, "Chưa có đánh giá");
    return;
  }
  renderScore(scoreForViewer(result.lines[0], startSide), "Engine", { animate: animateScore });
}

function renderScore(score, source = "", { animate = false } = {}) {
  if (!analysisEl) return;
  stopScoreAnimation();
  const sourceText = source ? ` · ${source}` : "";
  const signText = score > 0 ? "Ưu thế" : score < 0 ? "Bất lợi" : "Cân bằng";
  analysisEl.innerHTML = "";
  const banner = document.createElement("div");
  banner.className = `score-banner ${scoreClass(score)}`;
  banner.innerHTML = `<span>Đánh giá</span><strong>${formatEval(score)}</strong><small>${signText}${sourceText} · Góc nhìn ${viewerName()}</small>`;
  analysisEl.appendChild(banner);
  if (animate) animateScoreBanner(banner, score);
}

function animateScoreBanner(banner, finalScore) {
  const strong = banner.querySelector("strong");
  if (!strong || !Number.isFinite(finalScore) || Math.abs(finalScore) >= 30000) return;
  const rangeA = finalScore * 0.9;
  const rangeB = finalScore * 1.1;
  let min = Math.ceil(Math.min(rangeA, rangeB));
  let max = Math.floor(Math.max(rangeA, rangeB));
  if (min === max && finalScore !== 0) {
    min = finalScore - 1;
    max = finalScore + 1;
  }
  const startedAt = performance.now();
  const duration = 3000;
  state.scoreAnimation = setInterval(() => {
    const elapsed = performance.now() - startedAt;
    if (elapsed >= duration) {
      stopScoreAnimation();
      banner.className = `score-banner ${scoreClass(finalScore)}`;
      strong.textContent = formatEval(finalScore);
      showSuggestionOption(0);
      return;
    }
    const next = Math.round(min + Math.random() * (max - min));
    banner.className = `score-banner ${scoreClass(next)}`;
    strong.textContent = formatEval(next);
  }, 420);
}

function stopScoreAnimation() {
  if (!state.scoreAnimation) return;
  clearInterval(state.scoreAnimation);
  state.scoreAnimation = null;
}

function showSuggestionOption(index) {
  if (index < 0) {
    state.suggestions = [];
    clearArrow();
    return;
  }
  const option = state.suggestionOptions[index] || state.suggestionOptions[0] || [];
  state.suggestions = option;
  state.lastArrowFrame = "";
  drawArrowLayer();
}

function hasAnalysisLine(result) {
  return Boolean(result?.lines?.length);
}

function renderPendingAnalysis() {
  if (!analysisEl) return;
  analysisEl.innerHTML = "";
  state.mobileAnalysisDepth = 0;
  state.mobileAnalysisScore = null;
  const banner = document.createElement("div");
  banner.className = "score-banner equal";
  banner.innerHTML = `<span>Đánh giá</span><strong>...</strong><small>Engine đang phân tích · Góc nhìn ${viewerName()}</small>`;
  analysisEl.appendChild(banner);
  renderMobileScoreStrip(null, "Engine đang phân tích");
}

function applyAnalysisSnapshot(result, board, side, { pending = false } = {}) {
  state.bestMove = result.bestMove || "";
  state.suggestionOptions = buildSuggestionOptions(result, board);
  state.suggestions = state.suggestionOptions[0] || [];
  state.lastAnalysis = { result, board, side };
  renderAnalysis(result, board, side, { pending });
  draw();
}

function renderAnalysis(result, startBoard, startSide, { pending = false } = {}) {
  if (!analysisEl) return;
  analysisEl.innerHTML = "";
  if (!result.lines || !result.lines.length) {
    state.shownScore = 0;
    state.mobileAnalysisDepth = 0;
    state.mobileAnalysisScore = 0;
    renderScore(0, "Engine", { pending: false });
    return;
  }
  const mainLine = result.lines[0];
  const score = scoreForViewer(mainLine, startSide);
  state.mobileAnalysisDepth = displayDepthForLine(mainLine);
  state.mobileAnalysisScore = score;
  renderScore(score, "Engine", { pending });
}

function renderScore(score, source = "", { pending = false } = {}) {
  if (!analysisEl) return;
  stopScoreAnimation();
  state.mobileAnalysisScore = Number.isFinite(score) ? score : null;
  const previousScore = Number.isFinite(state.shownScore) ? state.shownScore : null;
  const sourceText = source ? ` · ${source}` : "";
  const signText = score > 0 ? "Ưu thế" : score < 0 ? "Bất lợi" : "Cân bằng";
  analysisEl.innerHTML = "";
  const banner = document.createElement("div");
  banner.className = `score-banner ${scoreClass(score)}`;
  banner.innerHTML = `<span>Đánh giá</span><strong>${formatEval(previousScore ?? score)}</strong><small>${signText}${sourceText} · Góc nhìn ${viewerName()}${pending ? " · đang đào sâu" : ""}</small>`;
  analysisEl.appendChild(banner);
  renderMobileScoreStrip(previousScore ?? score);
  if (previousScore === null || previousScore === score) {
    state.shownScore = score;
    return;
  }
  tweenScoreBanner(banner, previousScore, score);
}

function stopScoreAnimation() {
  if (!state.scoreAnimation) return;
  cancelAnimationFrame(state.scoreAnimation);
  state.scoreAnimation = null;
}

function tweenScoreBanner(banner, fromScore, toScore) {
  const strong = banner.querySelector("strong");
  if (!strong) {
    state.shownScore = toScore;
    renderMobileScoreStrip(toScore);
    return;
  }
  const startedAt = performance.now();
  const duration = 320;
  const step = () => {
    const progress = Math.min(1, (performance.now() - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(fromScore + (toScore - fromScore) * eased);
    banner.className = `score-banner ${scoreClass(current)}`;
    strong.textContent = formatEval(current);
    state.mobileAnalysisScore = current;
    renderMobileScoreStrip(current);
    if (progress < 1) {
      state.scoreAnimation = requestAnimationFrame(step);
      return;
    }
    state.scoreAnimation = null;
    state.shownScore = toScore;
    banner.className = `score-banner ${scoreClass(toScore)}`;
    strong.textContent = formatEval(toScore);
    state.mobileAnalysisScore = toScore;
    renderMobileScoreStrip(toScore);
  };
  state.scoreAnimation = requestAnimationFrame(step);
}

function startAnalysisClock(requestId) {
  stopAnalysisClock();
  state.analysisClockStartedAt = performance.now();
  state.analysisClockRequest = requestId;
  state.analysisClockElapsedSec = 0;
  renderMobileScoreStrip(state.mobileAnalysisScore);
  state.analysisClockTimer = window.setInterval(() => tickAnalysisClock(requestId), 250);
}

function stopAnalysisClock(requestId = 0) {
  if (requestId && state.analysisClockRequest !== requestId) return;
  if (state.analysisClockTimer) {
    clearInterval(state.analysisClockTimer);
    state.analysisClockTimer = 0;
  }
  if (!requestId) {
    state.analysisClockStartedAt = 0;
    state.analysisClockRequest = 0;
    state.analysisClockElapsedSec = 0;
    state.mobileAnalysisDepth = 0;
    state.mobileAnalysisScore = null;
  }
}

function tickAnalysisClock(requestId) {
  if (requestId !== state.analysisRequest || requestId !== state.analysisClockRequest) {
    stopAnalysisClock(requestId);
    return;
  }
  const elapsed = analysisElapsedSeconds();
  if (elapsed !== state.analysisClockElapsedSec) {
    state.analysisClockElapsedSec = elapsed;
    renderMobileScoreStrip(state.mobileAnalysisScore);
  }
  if (elapsed >= 10) stopAnalysisClock(requestId);
}

function analysisElapsedSeconds() {
  if (!state.analysisClockStartedAt) return state.analysisClockElapsedSec || 0;
  return Math.min(10, Math.max(0, Math.floor((performance.now() - state.analysisClockStartedAt) / 1000)));
}

function displayDepthForLine(line) {
  const depth = Number(line?.depth || 0);
  if (!Number.isFinite(depth) || depth <= 0) return 0;
  return Math.max(1, Math.round(depth + ANALYSIS_DISPLAY_DEPTH_BOOST));
}

function renderMobileScoreStrip(score) {
  if (!mobileScoreStripEl) return;
  const isNumber = Number.isFinite(score);
  const scoreText = isNumber ? formatEval(score) : "...";
  const depthText = state.mobileAnalysisDepth > 0 ? String(state.mobileAnalysisDepth) : "...";
  const timeText = `${analysisElapsedSeconds()}s`;
  mobileScoreStripEl.className = `mobile-score-strip ${isNumber ? scoreClass(score) : "equal"}`;
  mobileScoreStripEl.textContent = `\u0110\u1ed9 s\u00e2u: ${depthText} \u0110i\u1ec3m: ${scoreText} Th\u1eddi gian: ${timeText}`;
}

function scoreForViewer(line, sideToMove) {
  const raw = parseEngineScore(line?.score || "");
  const viewerSide = state.flipped ? "b" : "w";
  const multiplier = sideToMove === viewerSide ? 1 : -1;
  if (raw.kind === "mate") return Math.sign(raw.value || 1) * multiplier * 31999;
  return scaleAdvantageScore(raw.value * multiplier, ENGINE_SCORE_SENSITIVITY, ENGINE_SCORE_DISPLAY_LIMIT);
}

function parseEngineScore(score) {
  const [kind, valueText] = String(score).trim().split(/\s+/);
  const value = Number(valueText || 0);
  if (kind === "mate") return { kind, value };
  return { kind: "cp", value: Number.isFinite(value) ? value : 0 };
}

function formatEval(value) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function scaleAdvantageScore(value, sensitivity = 1.65, limit = 1500) {
  if (!Number.isFinite(value) || value === 0) return 0;
  const sign = Math.sign(value);
  const scaled = Math.round(Math.abs(value) * sensitivity);
  return sign * Math.min(limit, scaled);
}

function scoreClass(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "equal";
}

function viewerName() {
  return state.flipped ? "Đen" : "Đỏ";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function onBoardClick(event) {
  event.preventDefault();
  if (state.moveAnimation || state.moveAnimationRunning) return;
  const square = eventToSquare(event);
  if (!square) return;
  if (state.editMode) {
    editBoardSquare(square);
    return;
  }
  if (state.gameOver) return;
  const piece = getPiece(square);
  if (state.selected) {
    const move = squareToUci(state.selected) + squareToUci(square);
    if (state.hints.some((hint) => hint.x === square.x && hint.y === square.y)) {
      makeMove(move);
      return;
    }
  }
  if (piece && pieceColor(piece) === state.side) {
    state.selected = square;
    state.hints = legalishMoves(square);
  } else {
    state.selected = null;
    state.hints = [];
  }
  draw();
}

function buildMoveAnimation(board, move, moveKey) {
  if (!board || !/^[a-i][0-9][a-i][0-9]$/.test(move)) return null;
  const from = uciToSquare(move.slice(0, 2));
  const to = uciToSquare(move.slice(2, 4));
  const piece = board[from.y]?.[from.x] || "";
  if (!piece) return null;
  const capturedPiece = board[to.y]?.[to.x] || "";
  return {
    move,
    moveKey,
    piece,
    capturedPiece,
    from,
    to,
    fromIndex: from.y * 9 + from.x,
    toIndex: to.y * 9 + to.x
  };
}

function buildDirectionalMoveAnimation(board, move, moveKey, { reverse = false } = {}) {
  if (!board || !/^[a-i][0-9][a-i][0-9]$/.test(move)) return null;
  const rawFrom = uciToSquare(move.slice(0, 2));
  const rawTo = uciToSquare(move.slice(2, 4));
  const from = reverse ? rawTo : rawFrom;
  const to = reverse ? rawFrom : rawTo;
  const piece = board[from.y]?.[from.x] || "";
  if (!piece) return null;
  const capturedPiece = reverse ? "" : (board[to.y]?.[to.x] || "");
  return {
    move,
    moveKey,
    piece,
    capturedPiece,
    from,
    to,
    fromIndex: from.y * 9 + from.x,
    toIndex: to.y * 9 + to.x
  };
}

function buildCursorMoveAnimation(previousCursor, nextCursor, sourceBoard) {
  if (Math.abs(nextCursor - previousCursor) !== 1) return null;
  const movingForward = nextCursor > previousCursor;
  const moveIndex = movingForward ? previousCursor : nextCursor;
  const move = state.moves[moveIndex];
  if (!move) return null;
  return buildDirectionalMoveAnimation(
    sourceBoard,
    move,
    `cursor:${moveIndex + 1}:${movingForward ? "f" : "b"}:${move}`,
    { reverse: !movingForward }
  );
}

function moveAnimationTravelTransform(animation) {
  if (!animation) return pieceRestTransform();
  const fromPos = squareToPixel(animation.from);
  const toPos = squareToPixel(animation.to);
  const deltaX = toPos.x - fromPos.x;
  const deltaY = toPos.y - fromPos.y;
  return `${pieceRestTransform()} translate3d(${deltaX}px, ${deltaY}px, 0)`;
}

function clearMoveAnimation({ preserveKey = false } = {}) {
  if (state.moveAnimationTimer) {
    clearTimeout(state.moveAnimationTimer);
    state.moveAnimationTimer = 0;
  }
  state.moveAnimationRunning = false;
  hideMoveAnimationElements();
  state.moveAnimation = null;
  state.activeMoveSlotEl = null;
  if (!preserveKey) state.lastAnimatedMoveKey = "";
}

function primeMoveAnimation(animation) {
  if (!animation) return;
  if (state.moveAnimationTimer) {
    clearTimeout(state.moveAnimationTimer);
    state.moveAnimationTimer = 0;
  }
  state.moveAnimationRunning = false;
  hideMoveAnimationElements();
  state.moveAnimation = animation;
  state.lastAnimatedMoveKey = animation.moveKey;
  state.lastPieceFrame = "";
}

function overlayRestTransform() {
  return "translate(-50%, -50%) translate3d(0, 0, 0)";
}

function hideMoveAnimationElements({
  resetActiveSlot = true,
  resetMovingPiece = true,
  resetCapturePiece = true
} = {}) {
  if (resetActiveSlot && state.activeMoveSlotEl) {
    state.activeMoveSlotEl.style.transition = "none";
    state.activeMoveSlotEl.style.transform = pieceRestTransform();
  }
  if (resetMovingPiece && movingPieceEl) {
    movingPieceEl.style.transition = "none";
    movingPieceEl.classList.remove("is-visible");
    movingPieceEl.style.left = "0px";
    movingPieceEl.style.top = "0px";
    movingPieceEl.style.transform = overlayRestTransform();
    movingPieceEl.setAttribute("aria-hidden", "true");
  }
  if (resetCapturePiece && capturePieceEl) {
    capturePieceEl.style.transition = "none";
    capturePieceEl.classList.remove("is-visible", "fading");
    capturePieceEl.style.left = "0px";
    capturePieceEl.style.top = "0px";
    capturePieceEl.style.transform = overlayRestTransform();
    capturePieceEl.setAttribute("aria-hidden", "true");
  }
}

function hideCheckmateEffect() {
  if (state.checkmateEffectTimer) {
    clearTimeout(state.checkmateEffectTimer);
    state.checkmateEffectTimer = 0;
  }
  if (checkmateBurstEl) {
    checkmateBurstEl.classList.remove("show");
    checkmateBurstEl.setAttribute("aria-hidden", "true");
  }
}

function clearCheckmateEffectKey() {
  state.lastCheckmateEffectKey = "";
  hideCheckmateEffect();
}

function maybeShowCheckmateEffect({ force = false } = {}) {
  if (!state.gameOver || !state.checkmatedSide || !checkmateBurstEl) return;
  const key = `${state.cursor}:${state.checkmatedSide}:${boardSignature(state.board)}`;
  if (!force && state.lastCheckmateEffectKey === key) return;
  state.lastCheckmateEffectKey = key;
  if (state.checkmateEffectTimer) clearTimeout(state.checkmateEffectTimer);
  checkmateBurstEl.classList.remove("show");
  void checkmateBurstEl.offsetWidth;
  checkmateBurstEl.setAttribute("aria-hidden", "false");
  checkmateBurstEl.classList.add("show");
  state.checkmateEffectTimer = window.setTimeout(() => {
    checkmateBurstEl.classList.remove("show");
    checkmateBurstEl.setAttribute("aria-hidden", "true");
    state.checkmateEffectTimer = 0;
  }, 3050);
}

function paintMotionPiece(element, piece) {
  if (!element || !piece) return;
  element.dataset.piece = piece;
  const image = element.querySelector(".piece-skin");
  if (image) {
    const source = pieceImageFor(piece);
    if (image.getAttribute("src") !== source) image.src = source;
    image.alt = PIECE_NAMES[piece] || piece;
  }
}

function setPieceSlotImage(el, piece) {
  if (!el || !piece) return;
  el.dataset.piece = piece;
  const image = el.querySelector(".piece-skin");
  if (image) {
    const source = pieceImageFor(piece);
    if (image.getAttribute("src") !== source) image.src = source;
    image.alt = PIECE_NAMES[piece] || piece;
  }
  el.setAttribute("aria-label", PIECE_NAMES[piece] || piece);
}

function prepareMoveDestinationHandoff(animation) {
  if (!animation) return;
  const { pieceSlots } = ensureBoardSlots();
  const targetSlotEl = pieceSlots[animation.toIndex];
  if (!targetSlotEl) return;
  const piece = animation.piece;
  const isRed = piece === piece.toUpperCase();
  const checkedSides = getCheckedSides();
  setPieceSlotImage(targetSlotEl, piece);
  targetSlotEl.classList.toggle("red", isRed);
  targetSlotEl.classList.toggle("black", !isRed);
  targetSlotEl.classList.remove("selected");
  targetSlotEl.classList.toggle("in-check", piece.toLowerCase() === "k" && checkedSides[pieceColor(piece)]);
  targetSlotEl.style.transition = "none";
  targetSlotEl.style.transform = pieceRestTransform();
  targetSlotEl.classList.add("is-visible");
  targetSlotEl.setAttribute("aria-hidden", "false");
}

function showMoveLandingShield(animation) {
  if (!animation || !movingPieceEl) return;
  const toPos = squareToPixel(animation.to);
  paintMotionPiece(movingPieceEl, animation.piece);
  movingPieceEl.style.transition = "none";
  movingPieceEl.style.left = `${toPos.x}px`;
  movingPieceEl.style.top = `${toPos.y}px`;
  movingPieceEl.style.transform = overlayRestTransform();
  movingPieceEl.classList.add("is-visible");
  movingPieceEl.setAttribute("aria-hidden", "false");
}

function hideMoveLandingShieldSoon() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      hideMoveAnimationElements({ resetActiveSlot: false });
    });
  });
}

function finalizeMoveAnimation(animation) {
  if (!state.moveAnimation || state.moveAnimation.moveKey !== animation.moveKey) return;
  const afterComplete = typeof state.moveAnimation.afterComplete === "function"
    ? state.moveAnimation.afterComplete
    : null;
  const activeSlotEl = state.activeMoveSlotEl;
  const useMobileHandoff = isCompactMobile();
  if (state.moveAnimationTimer) {
    clearTimeout(state.moveAnimationTimer);
    state.moveAnimationTimer = 0;
  }
  state.moveAnimationRunning = false;
  if (useMobileHandoff) {
    showMoveLandingShield(animation);
    prepareMoveDestinationHandoff(animation);
  }
  hideMoveAnimationElements({ resetActiveSlot: false, resetMovingPiece: !useMobileHandoff });
  state.moveAnimation = null;
  state.activeMoveSlotEl = null;
  state.lastPieceFrame = "";
  const finish = () => {
    drawPieces();
    renderHistory();
    drawArrowLayer();
    if (activeSlotEl) {
      activeSlotEl.style.transition = "none";
      activeSlotEl.style.transform = pieceRestTransform();
    }
    if (afterComplete) afterComplete();
    if (Number.isInteger(state.queuedCursorTarget) && state.queuedCursorTarget !== state.cursor) {
      requestQueuedCursorStep();
    }
    if (useMobileHandoff) {
      hideMoveLandingShieldSoon();
    }
  };
  if (useMobileHandoff) {
    window.requestAnimationFrame(finish);
  } else {
    finish();
  }
}

function startMoveAnimation(animation, { prepared = false } = {}) {
  if (!animation) return false;
  if (prepared) {
    if (state.moveAnimationTimer) {
      clearTimeout(state.moveAnimationTimer);
      state.moveAnimationTimer = 0;
    }
    state.moveAnimation = animation;
    state.lastAnimatedMoveKey = animation.moveKey;
  } else {
    primeMoveAnimation(animation);
  }

  const { pieceSlots } = ensureBoardSlots();
  const movingSlotEl = pieceSlots[animation.fromIndex];
  if (!movingSlotEl) {
    clearMoveAnimation({ preserveKey: true });
    drawPieces();
    return false;
  }
  state.activeMoveSlotEl = movingSlotEl;
  state.moveAnimationRunning = false;
  if (isCompactMobile()) {
    paintMotionPiece(movingPieceEl, animation.piece);
  }
  movingSlotEl.style.transition = "none";
  movingSlotEl.style.transform = pieceRestTransform();

  void movingSlotEl.offsetWidth;
  if (!state.moveAnimation || state.moveAnimation.moveKey !== animation.moveKey) {
    clearMoveAnimation({ preserveKey: true });
    return false;
  }
  const duration = analysisMoveDurationMs();
  playMoveSound(animation.soundKind || (animation.capturedPiece ? "capture" : "move"), duration);
  movingSlotEl.style.transition = `transform ${duration}ms ${ANALYSIS_MOVE_EASING}`;
  movingSlotEl.style.transform = moveAnimationTravelTransform(animation);
  state.moveAnimationRunning = true;

  state.moveAnimationTimer = window.setTimeout(() => {
    finalizeMoveAnimation(animation);
  }, duration + 8);
  return true;
}

function makeMove(move, { manual = true, settledVisual = false } = {}) {
  if (state.gameOver) return;
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return;
  clearQueuedCursorNavigation();
  cancelScheduledAnalysisRefresh();
  const from = uciToSquare(move.slice(0, 2));
  const to = uciToSquare(move.slice(2, 4));
  const piece = getPiece(from);
  if (!piece) return;
  if (!isLegalMove(move, state.side)) return;
  if (manual && !settledVisual && (state.selected || state.hints.length)) {
    clearManualMoveFrame();
    state.selected = null;
    state.hints = [];
    state.lastPieceFrame = "";
    drawPieces();
    state.manualMoveFrame = window.requestAnimationFrame(() => {
      state.manualMoveFrame = 0;
      makeMove(move, { manual, settledVisual: true });
    });
    return;
  }
  clearManualMoveFrame();
  const moveAnimation = buildMoveAnimation(state.board, move, `${state.cursor + 1}:${move}`);
  if (manual) {
    stopScoreAnimation();
    state.bestMove = "";
    state.suggestions = [];
    state.suggestionOptions = [];
    state.lastAnalysis = null;
    state.analysisRequest++;
    clearArrow();
  }
  state.board[to.y][to.x] = piece;
  state.board[from.y][from.x] = "";
  state.moves = state.moves.slice(0, state.cursor);
  state.moves.push(move);
  state.cursor = state.moves.length;
  state.side = state.side === "w" ? "b" : "w";
  state.checkmatedSide = getCheckmatedSide();
  state.gameOver = Boolean(state.checkmatedSide);
  if (state.gameOver) stopAutoPlay();
  state.selected = null;
  state.hints = [];
  const finishMoveEffects = () => {
    if (state.gameOver) maybeShowCheckmateEffect();
    else clearCheckmateEffectKey();
    refreshCloudBook();
    if (manual) reportAnalysisActivity(`Manual move ${move}`);
    if (manual && state.analysisMode) {
      scheduleAnalysisRefresh(ANALYSIS_MANUAL_MOVE_ANALYSIS_DELAY_MS);
    }
  };
  if (moveAnimation) {
    moveAnimation.soundKind = state.gameOver ? "checkmate" : (moveAnimation.capturedPiece ? "capture" : "move");
    moveAnimation.afterComplete = finishMoveEffects;
    primeMoveAnimation(moveAnimation);
    draw(true);
    if (!startMoveAnimation(moveAnimation, { prepared: true })) {
      playMoveSound(moveAnimation.soundKind, analysisMoveDurationMs());
      finishMoveEffects();
    }
  } else {
    draw();
    playMoveSound(state.gameOver ? "checkmate" : "move", analysisMoveDurationMs());
    finishMoveEffects();
  }
}

function applyQueuedCursorTarget() {
  state.queuedCursorFrame = 0;
  const target = state.queuedCursorTarget;
  if (!Number.isInteger(target)) return;
  if (state.moveAnimationRunning || state.moveAnimation) {
    requestQueuedCursorStep();
    return;
  }
  if (target === state.cursor) {
    state.queuedCursorTarget = null;
    return;
  }
  const previousCursor = state.cursor;
  const nextCursor = previousCursor + Math.sign(target - previousCursor);
  const previousBoard = state.board.map((row) => row.slice());
  const navigationAnimation = buildCursorMoveAnimation(previousCursor, nextCursor, previousBoard);
  state.cursor = nextCursor;
  if (state.cursor === target) state.queuedCursorTarget = null;
  if (navigationAnimation) primeMoveAnimation(navigationAnimation);
  rebuildPosition({
    immediateDraw: true,
    analysisDelay: ANALYSIS_NAVIGATION_ANALYSIS_DELAY_MS,
    preserveQueuedNavigation: true,
    preserveMoveAnimation: Boolean(navigationAnimation)
  });
  if (navigationAnimation) {
    startMoveAnimation(navigationAnimation, { prepared: true });
  } else if (state.queuedCursorTarget !== null) {
    requestQueuedCursorStep();
  }
}

function queueCursorTarget(target) {
  clearManualMoveFrame();
  const clamped = Math.max(0, Math.min(state.moves.length, target));
  if (clamped === state.cursor && !state.queuedCursorFrame && !state.moveAnimation) return;
  state.queuedCursorTarget = clamped;
  requestQueuedCursorStep();
}

function undo() {
  const baseCursor = Number.isInteger(state.queuedCursorTarget) ? state.queuedCursorTarget : state.cursor;
  if (baseCursor <= 0) return;
  queueCursorTarget(baseCursor - 1);
}

function redo() {
  const baseCursor = Number.isInteger(state.queuedCursorTarget) ? state.queuedCursorTarget : state.cursor;
  if (baseCursor >= state.moves.length) return;
  queueCursorTarget(baseCursor + 1);
}

function reset() {
  clearQueuedCursorNavigation();
  clearManualMoveFrame();
  cancelScheduledAnalysisRefresh();
  clearMoveAnimation();
  clearCheckmateEffectKey();
  state.moves = [];
  state.cursor = 0;
  rebuildPosition({ immediateDraw: true, analysisDelay: 0 });
}

function renderPiecePalette() {
  if (!piecePaletteEl) return;
  piecePaletteEl.innerHTML = "";
  EDITOR_PIECES.forEach((piece) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-piece";
    button.dataset.piece = piece;
    button.title = piece ? (PIECE_NAMES[piece] || piece) : "Xóa quân";
    if (piece) {
      button.style.setProperty("--piece-image", `url("${pieceImageFor(piece)}")`);
      button.setAttribute("aria-label", PIECE_NAMES[piece] || piece);
    } else {
      button.classList.add("eraser");
      button.textContent = "×";
      button.setAttribute("aria-label", "Xóa quân");
    }
    button.addEventListener("click", () => {
      state.editorPiece = piece;
      updateEditorUi();
    });
    piecePaletteEl.appendChild(button);
  });
}

function renderMobileSetupPalette() {
  if (!mobileSetupPaletteEl) return;
  mobileSetupPaletteEl.innerHTML = "";
  EDITOR_PIECES.forEach((piece) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-piece mobile-setup-piece";
    button.dataset.piece = piece;
    button.title = piece ? (PIECE_NAMES[piece] || piece) : "Xóa quân";
    if (piece) {
      button.style.setProperty("--piece-image", `url("${pieceImageFor(piece)}")`);
      button.setAttribute("aria-label", PIECE_NAMES[piece] || piece);
    } else {
      button.classList.add("eraser");
      button.textContent = "×";
      button.setAttribute("aria-label", "Xóa quân");
    }
    button.addEventListener("click", () => {
      state.editorPiece = piece;
      updateEditorUi();
    });
    mobileSetupPaletteEl.appendChild(button);
  });
}

function updateEditorUi() {
  boardEl.classList.toggle("editing", state.editMode);
  document.body.classList.toggle("mobile-setup-active", state.mobileSetupMode);
  if (mobileSetupPanelEl) mobileSetupPanelEl.classList.toggle("hidden", !state.mobileSetupMode);
  if (editBoardBtn) {
    editBoardBtn.classList.toggle("active", state.editMode);
    editBoardBtn.textContent = state.editMode ? "Đang sửa bàn" : "Sửa bàn cờ";
  }
  if (sideToMoveEl) sideToMoveEl.value = state.side;
  if (mobileSetupSideEl) mobileSetupSideEl.value = state.side;
  if (piecePaletteEl) {
    [...piecePaletteEl.querySelectorAll(".palette-piece")].forEach((button) => {
      button.classList.toggle("active", button.dataset.piece === state.editorPiece);
    });
  }
  if (mobileSetupPaletteEl) {
    [...mobileSetupPaletteEl.querySelectorAll(".palette-piece")].forEach((button) => {
      button.classList.toggle("active", button.dataset.piece === state.editorPiece);
    });
  }
  document.querySelectorAll('[data-mobile-action="setup"]').forEach((button) => {
    button.classList.toggle("active", state.mobileSetupMode);
  });
}

function toggleEditMode() {
  clearQueuedCursorNavigation();
  clearManualMoveFrame();
  cancelScheduledAnalysisRefresh();
  clearMoveAnimation();
  state.editMode = !state.editMode;
  stopAutoPlay();
  state.selected = null;
  state.hints = [];
  state.suggestions = [];
  state.suggestionOptions = [];
  clearArrow();
  updateEditorUi();
  draw();
}

function startMobileSetup() {
  clearQueuedCursorNavigation();
  clearManualMoveFrame();
  cancelScheduledAnalysisRefresh();
  clearMoveAnimation();
  clearCheckmateEffectKey();
  stopAutoPlay();
  stopScoreAnimation();
  hideBoardSkinMenu();
  state.mobileSetupMode = true;
  state.editMode = true;
  state.board = emptyBoard();
  state.side = "w";
  state.moves = [];
  state.cursor = 0;
  state.selected = null;
  state.hints = [];
  state.bestMove = "";
  state.suggestions = [];
  state.suggestionOptions = [];
  state.lastAnalysis = null;
  state.analysisRequest++;
  state.gameOver = false;
  state.checkmatedSide = null;
  state.editorPiece = "R";
  clearArrow();
  renderMobileSetupPalette();
  updateEditorUi();
  draw(true);
}

function cancelMobileSetup() {
  state.mobileSetupMode = false;
  state.editMode = false;
  state.selected = null;
  state.hints = [];
  updateEditorUi();
  reset();
}

function clearMobileSetupBoard() {
  if (!state.mobileSetupMode) return;
  clearQueuedCursorNavigation();
  clearManualMoveFrame();
  cancelScheduledAnalysisRefresh();
  clearMoveAnimation();
  clearCheckmateEffectKey();
  stopScoreAnimation();
  state.board = emptyBoard();
  state.moves = [];
  state.cursor = 0;
  state.selected = null;
  state.hints = [];
  state.bestMove = "";
  state.suggestions = [];
  state.suggestionOptions = [];
  state.lastAnalysis = null;
  state.analysisRequest++;
  state.gameOver = false;
  state.checkmatedSide = null;
  clearArrow();
  draw(true);
}

function setMobileSetupSide() {
  if (!mobileSetupSideEl) return;
  state.side = mobileSetupSideEl.value === "b" ? "b" : "w";
  state.analysisRequest++;
  updateEditorUi();
}

function saveMobileSetupPosition() {
  if (!state.mobileSetupMode) return;
  if (!hasBothKings(state.board)) {
    showToast("Cần đặt đủ Tướng đỏ và Tướng đen");
    return;
  }
  clearQueuedCursorNavigation();
  clearManualMoveFrame();
  cancelScheduledAnalysisRefresh();
  clearMoveAnimation();
  clearCheckmateEffectKey();
  stopScoreAnimation();
  state.mobileSetupMode = false;
  state.editMode = false;
  state.moves = [];
  state.cursor = 0;
  state.selected = null;
  state.hints = [];
  state.bestMove = "";
  state.suggestions = [];
  state.suggestionOptions = [];
  state.lastAnalysis = null;
  state.analysisRequest++;
  state.checkmatedSide = getCheckmatedSide();
  state.gameOver = Boolean(state.checkmatedSide);
  updateEditorUi();
  setMobilePanel("analysis");
  draw(true);
  if (state.gameOver) maybeShowCheckmateEffect();
  refreshCloudBook();
  if (state.analysisMode) scheduleAnalysisRefresh(0);
  showToast("Đã lưu hình cờ");
}

function clearBoard() {
  clearQueuedCursorNavigation();
  clearManualMoveFrame();
  cancelScheduledAnalysisRefresh();
  clearMoveAnimation();
  clearCheckmateEffectKey();
  stopAutoPlay();
  stopScoreAnimation();
  state.board = emptyBoard();
  state.moves = [];
  state.cursor = 0;
  state.selected = null;
  state.hints = [];
  state.bestMove = "";
  state.suggestions = [];
  state.suggestionOptions = [];
  state.lastAnalysis = null;
  state.analysisRequest++;
  state.gameOver = false;
  state.checkmatedSide = null;
  draw();
  refreshCloudBook();
}

function loadFenFromPrompt() {
  const currentFen = currentFenString();
  const input = window.prompt("Nhập FEN cờ tướng:", currentFen);
  if (input === null) return;
  try {
    clearQueuedCursorNavigation();
    clearManualMoveFrame();
    cancelScheduledAnalysisRefresh();
    const parsed = parseFenInput(input);
    clearMoveAnimation();
    clearCheckmateEffectKey();
    stopAutoPlay();
    stopScoreAnimation();
    state.board = parsed.board;
    state.side = parsed.side;
    state.moves = [];
    state.cursor = 0;
    state.selected = null;
    state.hints = [];
    state.bestMove = "";
    state.suggestions = [];
    state.suggestionOptions = [];
    state.lastAnalysis = null;
    state.analysisRequest++;
    state.checkmatedSide = getCheckmatedSide();
    state.gameOver = Boolean(state.checkmatedSide);
    if (sideToMoveEl) sideToMoveEl.value = state.side;
    draw(true);
    if (state.gameOver) maybeShowCheckmateEffect();
    refreshCloudBook();
    if (state.analysisMode) {
      scheduleAnalysisRefresh(0);
    }
  } catch (err) {
    window.alert(err.message || "FEN không hợp lệ.");
  }
}

async function copyFenToClipboard() {
  const fen = currentFenString();
  try {
    await navigator.clipboard.writeText(fen);
  } catch {
    const input = document.createElement("textarea");
    input.value = fen;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  showToast("Đã copy FEN");
}

function showToast(message) {
  let toast = document.querySelector(".toast-message");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast-message";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function setSideToMove() {
  if (!sideToMoveEl) return;
  clearQueuedCursorNavigation();
  clearManualMoveFrame();
  cancelScheduledAnalysisRefresh();
  clearMoveAnimation();
  clearCheckmateEffectKey();
  stopScoreAnimation();
  state.side = sideToMoveEl.value === "b" ? "b" : "w";
  state.moves = [];
  state.cursor = 0;
  state.gameOver = false;
  state.checkmatedSide = null;
  state.analysisRequest++;
  draw(true);
  refreshCloudBook();
}

function editBoardSquare(square) {
  clearQueuedCursorNavigation();
  clearManualMoveFrame();
  cancelScheduledAnalysisRefresh();
  clearMoveAnimation();
  clearCheckmateEffectKey();
  const piece = state.editorPiece;
  if (piece && !isEditorPieceAllowed(piece, square)) return;
  stopScoreAnimation();
  if (piece && piece.toLowerCase() === "k") removePieceFromBoard(piece);
  state.board[square.y][square.x] = piece || "";
  state.moves = [];
  state.cursor = 0;
  state.selected = null;
  state.hints = [];
  state.bestMove = "";
  state.suggestions = [];
  state.suggestionOptions = [];
  state.lastAnalysis = null;
  state.analysisRequest++;
  state.checkmatedSide = getCheckmatedSide();
  state.gameOver = Boolean(state.checkmatedSide);
  draw(true);
  if (state.gameOver) maybeShowCheckmateEffect();
  if (!state.mobileSetupMode) refreshCloudBook();
}

function removePieceFromBoard(piece) {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      if (state.board[y][x] === piece) state.board[y][x] = "";
    }
  }
}

function hasBothKings(board) {
  let redKing = false;
  let blackKing = false;
  for (const row of board || []) {
    for (const piece of row) {
      if (piece === "K") redKing = true;
      if (piece === "k") blackKing = true;
    }
  }
  return redKing && blackKing;
}

function isEditorPieceAllowed(piece, square) {
  if (piece.toLowerCase() !== "k") return true;
  const oppositeKing = piece === "K" ? "k" : "K";
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      if (state.board[y][x] === oppositeKing && x === square.x) return false;
    }
  }
  return true;
}

function rebuildPosition({
  immediateDraw = false,
  analysisDelay = 0,
  preserveQueuedNavigation = false,
  preserveMoveAnimation = false
} = {}) {
  if (!preserveQueuedNavigation) clearQueuedCursorNavigation();
  cancelScheduledAnalysisRefresh();
  if (!preserveMoveAnimation) clearMoveAnimation();
  stopScoreAnimation();
  state.board = parseFen(START_FEN);
  state.side = "w";
  for (const move of state.moves.slice(0, state.cursor)) {
    applyMoveToBoard(state.board, move);
    state.side = state.side === "w" ? "b" : "w";
  }
  state.selected = null;
  state.hints = [];
  state.bestMove = "";
  state.suggestions = [];
  state.suggestionOptions = [];
  state.lastAnalysis = null;
  state.analysisRequest++;
  state.checkmatedSide = getCheckmatedSide();
  state.gameOver = Boolean(state.checkmatedSide);
  draw(immediateDraw);
  if (state.gameOver) maybeShowCheckmateEffect();
  else clearCheckmateEffectKey();
  refreshCloudBook();
  if (state.analysisMode) {
    scheduleAnalysisRefresh(analysisDelay);
  }
}

function draw(immediate = false) {
  if (state.drawFrame) {
    window.cancelAnimationFrame(state.drawFrame);
    state.drawFrame = 0;
  }
  if (immediate || !isCompactMobile()) {
    drawNow();
    return;
  }
  state.drawFrame = window.requestAnimationFrame(() => {
    state.drawFrame = 0;
    drawNow();
  });
}

function drawNow() {
  boardEl.classList.toggle("flipped", state.flipped);
  updateEditorUi();
  drawBoard();
  drawPieces();
  renderHistory();
  drawArrowLayer();
}

function drawBoard() {
  const metrics = boardMetrics(boardEl);
  if (!metrics.width || !metrics.height) return;
  state.lastBoardSizeKey = `${Math.round(metrics.width)}`;
  const signature = `${state.lastBoardSizeKey}|${state.flipped ? "b" : "w"}`;
  if (signature === state.lastBoardFrame) return;
  state.lastBoardFrame = signature;
  for (const canvas of [boardCanvas, arrowCanvas]) {
    canvas.width = Math.round(metrics.width * devicePixelRatio);
    canvas.height = Math.round(metrics.height * devicePixelRatio);
    canvas.style.width = `${metrics.width}px`;
    canvas.style.height = `${metrics.height}px`;
  }
}

function ensureBoardSlots() {
  const metrics = boardMetrics(boardEl);
  const layoutKey = `${Math.round(metrics.width)}x${Math.round(metrics.height)}|${state.flipped ? "b" : "w"}`;
  if (state.pieceSlots && state.hintSlots && state.pieceSlots.length === 90 && state.hintSlots.length === 90) {
    if (state.slotLayoutKey !== layoutKey) {
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
          const index = y * 9 + x;
          const pos = squareToPixel({ x, y });
          state.hintSlots[index].style.left = `${pos.x}px`;
          state.hintSlots[index].style.top = `${pos.y}px`;
          state.pieceSlots[index].style.left = `${pos.x}px`;
          state.pieceSlots[index].style.top = `${pos.y}px`;
        }
      }
      state.slotLayoutKey = layoutKey;
    }
    return { pieceSlots: state.pieceSlots, hintSlots: state.hintSlots };
  }

  state.slotLayoutKey = layoutKey;
  state.pieceSlots = [];
  state.hintSlots = [];

  const fragment = document.createDocumentFragment();
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const pos = squareToPixel({ x, y });
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.style.left = `${pos.x}px`;
      hint.style.top = `${pos.y}px`;
      hint.setAttribute("aria-hidden", "true");
      fragment.appendChild(hint);
      state.hintSlots.push(hint);
    }
  }

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const pos = squareToPixel({ x, y });
      const piece = document.createElement("div");
      piece.className = "piece image-piece";
      piece.style.left = `${pos.x}px`;
      piece.style.top = `${pos.y}px`;
      piece.setAttribute("aria-hidden", "true");
      const image = document.createElement("img");
      image.className = "piece-skin";
      image.alt = "";
      image.decoding = "sync";
      image.loading = "eager";
      image.fetchPriority = "high";
      image.draggable = false;
      piece.appendChild(image);
      fragment.appendChild(piece);
      state.pieceSlots.push(piece);
    }
  }

  piecesEl.replaceChildren(fragment);
  return { pieceSlots: state.pieceSlots, hintSlots: state.hintSlots };
}

function drawPieces() {
  const { pieceSlots, hintSlots } = ensureBoardSlots();
  if (!pieceSlots.length || !hintSlots.length) return;
  const keepHiddenPieceSkins = isCompactMobile();
  const checkedSides = getCheckedSides();
  const selectionKey = state.selected ? squareToUci(state.selected) : "";
  const hintKey = state.hints.map(squareToUci).join(",");
  const animationKey = state.moveAnimation?.moveKey || "";
  const signature = `${boardSignature(state.board)}|${state.flipped ? "b" : "w"}|${currentPieceSkin()}|${isCompactMobile() ? "m" : "d"}|${selectionKey}|${hintKey}|${animationKey}|${checkedSides.w ? "1" : "0"}${checkedSides.b ? "1" : "0"}`;
  if (signature === state.lastPieceFrame) return;
  state.lastPieceFrame = signature;
  const hintIndexes = new Set(state.hints.map((hint) => hint.y * 9 + hint.x));
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const index = y * 9 + x;
      const animation = state.moveAnimation;
      let piece = state.board[y][x];
      if (animation) {
        if (index === animation.fromIndex) piece = animation.piece;
        else if (index === animation.toIndex) piece = "";
      }
      const el = pieceSlots[index];
      if (!piece) {
        el.classList.remove("is-visible");
        el.classList.remove("selected", "in-check", "red", "black");
        el.style.transition = "none";
        el.style.transform = pieceRestTransform();
        if (!keepHiddenPieceSkins && el.dataset.piece && !(animation && index === animation.toIndex)) {
          el.dataset.piece = "";
          el.removeAttribute("aria-label");
        }
        el.setAttribute("aria-hidden", "true");
      } else {
        const isRed = piece === piece.toUpperCase();
        const image = el.querySelector(".piece-skin");
        if (el.dataset.piece !== piece || (image && image.getAttribute("src") !== pieceImageFor(piece))) {
          setPieceSlotImage(el, piece);
        }
        el.classList.toggle("red", isRed);
        el.classList.toggle("black", !isRed);
        el.classList.toggle("selected", Boolean(state.selected && state.selected.x === x && state.selected.y === y));
        el.classList.toggle("in-check", piece.toLowerCase() === "k" && checkedSides[pieceColor(piece)]);
        if (state.moveAnimation && state.moveAnimation.fromIndex === index) {
          const keepRunningTransform = state.moveAnimationRunning && state.activeMoveSlotEl === el;
          state.activeMoveSlotEl = el;
          if (!keepRunningTransform) {
            el.style.transition = "none";
            el.style.transform = pieceRestTransform();
          }
        } else {
          el.style.transition = "none";
          el.style.transform = pieceRestTransform();
        }
        el.classList.add("is-visible");
        el.setAttribute("aria-hidden", "false");
      }

      const hintEl = hintSlots[index];
      const showHint = hintIndexes.has(index);
      hintEl.classList.toggle("is-visible", showHint);
      hintEl.setAttribute("aria-hidden", showHint ? "false" : "true");
    }
  }
}

function drawArrowLayer() {
  const metrics = boardMetrics(boardEl);
  if (!metrics.width || !metrics.height) return;
  const signature = `${Math.round(metrics.width)}|${state.flipped ? "b" : "w"}|${currentTheme()}|${boardSignature(state.board)}|${state.suggestions.map((suggestion) => `${suggestion.move}:${resolveSuggestionColor(suggestion)}`).join("|")}`;
  if (signature === state.lastArrowFrame) return;
  state.lastArrowFrame = signature;
  clearArrowCanvas();
  state.suggestions.forEach((suggestion) => drawArrow(suggestion.move, resolveSuggestionColor(suggestion)));
}

function drawArrow(move, color = "rgba(23, 126, 137, 0.88)") {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return;
  const from = squareToPixel(uciToSquare(move.slice(0, 2)));
  const toSquare = uciToSquare(move.slice(2, 4));
  const to = squareToPixel(toSquare);
  const ctx = arrowCanvas.getContext("2d");
  const metrics = boardMetrics(boardEl);
  const pieceRatio = Number.parseFloat(getComputedStyle(boardEl).getPropertyValue("--piece-size")) / 100 || 0.086;
  const isMobileBoard = metrics.width <= 460;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.lineWidth = isMobileBoard ? Math.max(3.8, metrics.width * pieceRatio * 0.072) : Math.max(4.2, metrics.width / 160);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const stopBeforeTarget = 0;
  const tip = { x: to.x - dir.x * stopBeforeTarget, y: to.y - dir.y * stopBeforeTarget };
  const head = isMobileBoard ? Math.max(34, metrics.width * pieceRatio * 0.82) : Math.max(50, metrics.width / 14.6);
  const halfWidth = isMobileBoard ? Math.max(9, head * 0.22) : Math.max(11, head * 0.21);
  const base = { x: tip.x - dir.x * head, y: tip.y - dir.y * head };
  const palette = arrowPalette(color);
  drawStyledArrow(ctx, from, base, tip, normal, halfWidth, palette);
}

function clearArrowCanvas() {
  const ctx = arrowCanvas.getContext("2d");
  const metrics = boardMetrics(boardEl);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, metrics.width, metrics.height);
}

function clearArrow() {
  state.lastArrowFrame = "";
  clearArrowCanvas();
}

function renderHistory() {
  if (!historyEl) return;
  const signature = `${state.cursor}|${state.moves.join(",")}`;
  if (signature === state.lastHistoryFrame) return;
  state.lastHistoryFrame = signature;
  historyEl.innerHTML = "";
  const replay = parseFen(START_FEN);
  let side = "w";
  let row = null;
  state.moves.forEach((move, index) => {
    if (index % 2 === 0) {
      row = document.createElement("li");
      row.className = "move-row";
      row.innerHTML = `<span class="move-no">${Math.floor(index / 2) + 1}.</span>`;
      historyEl.appendChild(row);
    }
    const cell = document.createElement("span");
    cell.className = `move-cell ${side === "w" ? "red-move" : "black-move"}`;
    cell.textContent = formatMove(move, replay, side);
    if (index === state.cursor - 1) cell.classList.add("current");
    row.appendChild(cell);
    applyMoveToBoard(replay, move);
    side = side === "w" ? "b" : "w";
  });
}

async function refreshCloudBook() {
  if (!cloudBookEl) return;
  const requestId = ++state.cloudRequest;
  const fen = boardToCloudFen(state.board, state.side);
  renderCloudPlaceholders();
  cloudBookEl.textContent = "Đang tải dữ liệu đám mây...";
  try {
    const result = await api(`/api/cloud?board=${encodeURIComponent(fen)}`);
    if (requestId !== state.cloudRequest) return;
    renderCloudBook(result);
  } catch (err) {
    setTimeout(() => {
      if (requestId === state.cloudRequest) renderCloudPlaceholders();
    }, 0);
    if (requestId === state.cloudRequest) {
      cloudBookEl.innerHTML = `<div class="cloud-empty">Không kết nối được ChessDB: ${escapeHtml(err.message)}</div>`;
    }
  }
}

function renderCloudBook(result) {
  if (!result.moves?.length) {
    renderCloudPlaceholders();
    return;
    const statusText = {
      unknown: "Vị trí này chưa có trong cơ sở dữ liệu.",
      invalid: "FEN không hợp lệ.",
      checkmate: "Vị trí đã hết cờ.",
      stalemate: "Vị trí hòa/hết nước."
    }[result.status] || "Không có nước đề xuất.";
    cloudBookEl.innerHTML = `<div class="cloud-empty">${statusText}</div>`;
    return;
  }
  const replay = cloneBoard(state.board);
  const side = state.side;
  const rows = result.moves.slice(0, CLOUD_MOVE_LIMIT).map((entry) => {
    const score = scoreFromCloud(entry.score);
    return `<button class="cloud-row" data-move="${entry.move}">
      <span class="cloud-move">${formatMove(entry.move, replay, side)}</span>
      <span class="cloud-score ${scoreClass(score)}">${formatEval(score)}</span>
    </button>`;
  }).join("");
  cloudBookEl.innerHTML = rows;
  cloudBookEl.querySelectorAll(".cloud-row").forEach((row) => {
    row.addEventListener("click", () => makeMove(row.dataset.move));
  });
}

function renderCloudPlaceholders() {
  if (!cloudBookEl) return;
  cloudBookEl.innerHTML = Array.from({ length: CLOUD_MOVE_LIMIT }, () => (
    `<div class="cloud-row cloud-placeholder" aria-hidden="true">
      <span class="cloud-move">&nbsp;</span>
      <span class="cloud-score">&nbsp;</span>
    </div>`
  )).join("");
}

async function refreshCloudBook() {
  if (!cloudBookEl) return;
  const requestId = ++state.cloudRequest;
  const fen = boardToCloudFen(state.board, state.side);
  renderCloudPlaceholders();
  try {
    const result = await api(`/api/cloud?board=${encodeURIComponent(fen)}`);
    if (requestId !== state.cloudRequest) return;
    renderCloudBook(result);
  } catch {
    if (requestId === state.cloudRequest) renderCloudPlaceholders();
  }
}

function scoreFromCloud(score) {
  const value = Number(score);
  return Number.isFinite(value) ? value : 0;
}

function cloudWinRate(score) {
  const value = Number.isFinite(score) ? score : 0;
  return Math.max(1, Math.min(99, 50 + value / 13.2));
}

function formatCloudWinRate(score) {
  return `${cloudWinRate(score).toFixed(2)}%`;
}

function cloudNote(score) {
  if (score > 0) return "!(06-00)";
  if (score < 0) return "?(06-01)";
  return "!(07-02)";
}

function cloudPlaceholderRows(count) {
  return Array.from({ length: Math.max(0, count) }, () => (
    `<div class="cloud-row cloud-placeholder" aria-hidden="true">
      <span class="cloud-move">&nbsp;</span>
      <span class="cloud-score">&nbsp;</span>
      <span class="cloud-win">&nbsp;</span>
      <span class="cloud-note">&nbsp;</span>
    </div>`
  )).join("");
}

function renderCloudPlaceholders() {
  if (!cloudBookEl) return;
  cloudBookEl.innerHTML = "";
}

function renderCloudBook(result) {
  if (!cloudBookEl) return;
  const entries = Array.isArray(result?.moves) ? result.moves.filter(isReliableCloudMove).slice(0, CLOUD_MOVE_LIMIT) : [];
  if (!entries.length) {
    renderCloudPlaceholders();
    return;
  }
  const replay = cloneBoard(state.board);
  const side = state.side;
  const rows = entries.map((entry) => {
    const score = scoreFromCloud(entry.score);
    const cls = scoreClass(score);
    return `<button class="cloud-row ${cls}" data-move="${entry.move}">
      <span class="cloud-move">${formatMove(entry.move, replay, side)}</span>
      <span class="cloud-score ${cls}">${formatEval(score)}</span>
      <span class="cloud-win ${cls}">${formatCloudWinRate(score)}</span>
      <span class="cloud-note ${cls}">${cloudNote(score)}</span>
    </button>`;
  }).join("") + cloudPlaceholderRows(CLOUD_MOVE_LIMIT - entries.length);
  cloudBookEl.innerHTML = rows;
  cloudBookEl.querySelectorAll("button.cloud-row").forEach((row) => {
    row.addEventListener("click", () => makeMove(row.dataset.move));
  });
}

function isReliableCloudMove(entry) {
  if (!entry || !/^[a-i][0-9][a-i][0-9]$/.test(String(entry.move || ""))) return false;
  return Number.isFinite(Number(entry.score));
}

async function refreshCloudBook() {
  if (!cloudBookEl) return;
  const requestId = ++state.cloudRequest;
  const fen = boardToCloudFen(state.board, state.side);
  renderCloudPlaceholders();
  try {
    const result = await api(`/api/cloud?board=${encodeURIComponent(fen)}`);
    if (requestId !== state.cloudRequest) return;
    renderCloudBook(result);
  } catch {
    if (requestId === state.cloudRequest) renderCloudPlaceholders();
  }
}

function boardToCloudFen(board, side) {
  const rows = [];
  for (let y = 9; y >= 0; y--) {
    let row = "";
    let empty = 0;
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (!piece) empty++;
      else {
        if (empty) row += empty;
        empty = 0;
        row += piece;
      }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join("/")} ${side}`;
}

function currentFenString() {
  return `${boardToCloudFen(state.board, state.side)} - - 0 1`;
}

function boardSignature(board) {
  return (board || []).map((row) => row.join("")).join("/");
}

function buildSuggestionOptions(result, board) {
  const lines = Array.isArray(result.lines) ? result.lines.slice(0, 1) : [];
  const options = lines.map((line, index) => {
    const pv = Array.isArray(line.pv) ? line.pv : [];
    const fallback = index === 0 && result.ponder ? [result.bestMove, result.ponder] : [];
    const arrowMoves = (pv.length > 1 ? pv.slice(0, 2) : fallback).filter(Boolean);
    return buildSuggestionGroup(arrowMoves, board);
  }).filter((option) => option.length);
  if (!options.length) {
    const fallbackPv = result.ponder ? [result.bestMove, result.ponder] : [result.bestMove].filter(Boolean);
    const fallback = buildSuggestionGroup(fallbackPv, board);
    if (fallback.length) options.push(fallback);
  }
  return options;
}

function buildSuggestionGroup(arrowMoves, board) {
  const replay = cloneBoard(board);
  return arrowMoves.map((move) => {
    if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return null;
    const from = uciToSquare(move.slice(0, 2));
    const piece = replay[from.y]?.[from.x] || "";
    if (!piece) return null;
    const side = pieceColor(piece);
    const color = suggestionArrowColor(side);
    applyMoveToBoard(replay, move);
    return { move, color, side };
  }).filter(Boolean);
}

function suggestionArrowColor(side) {
  return side === "w" ? "rgba(118, 190, 82, 0.9)" : "rgba(211, 20, 197, 0.92)";
}

function resolveSuggestionColor(suggestion) {
  if (!suggestion?.side && suggestion?.color) return suggestion.color;
  return suggestionArrowColor(suggestion?.side || "");
}

function formatPv(pv, startBoard, startSide) {
  const replay = cloneBoard(startBoard);
  let side = startSide;
  return pv.map((move) => {
    const text = formatMove(move, replay, side);
    applyMoveToBoard(replay, move);
    side = side === "w" ? "b" : "w";
    return text;
  });
}

function formatMove(move, board, side) {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return move;
  const from = uciToSquare(move.slice(0, 2));
  const to = uciToSquare(move.slice(2, 4));
  const piece = board[from.y]?.[from.x] || "";
  if (!piece) return move;
  const color = pieceColor(piece) || side;
  const code = PIECE_CODES[piece.toLowerCase()] || piece.toUpperCase();
  const fromFile = fileNumber(from.x, color);
  const toFile = fileNumber(to.x, color);
  if (from.y === to.y) return `${code}${fromFile}-${toFile}`;
  const forward = color === "w" ? to.y > from.y : to.y < from.y;
  const sign = forward ? "." : "/";
  const lower = piece.toLowerCase();
  const target = lower === "n" || lower === "b" || lower === "a" ? toFile : Math.abs(to.y - from.y);
  return `${code}${fromFile}${sign}${target}`;
}

function fileNumber(x, color) {
  return color === "w" ? 9 - x : x + 1;
}

function legalishMoves(square) {
  const piece = getPiece(square);
  if (!piece) return [];
  const moves = [];
  const own = pieceColor(piece);
  const add = (x, y) => {
    if (!inside(x, y)) return;
    const target = state.board[y][x];
    if (target?.toLowerCase() === "k") return;
    if (!target || pieceColor(target) !== own) moves.push({ x, y });
  };
  const lower = piece.toLowerCase();
  if (lower === "r") slide(square, [[1, 0], [-1, 0], [0, 1], [0, -1]], add);
  if (lower === "c") cannon(square, add);
  if (lower === "n") knight(square, add);
  if (lower === "b") bishop(square, add, own);
  if (lower === "a") advisor(square, add, own);
  if (lower === "k") king(square, add, own);
  if (lower === "p") pawn(square, add, own);
  return moves.filter((to) => isLegalMove(squareToUci(square) + squareToUci(to), own));
}

function slide(square, dirs, add) {
  for (const [dx, dy] of dirs) {
    let x = square.x + dx, y = square.y + dy;
    while (inside(x, y)) {
      add(x, y);
      if (state.board[y][x]) break;
      x += dx;
      y += dy;
    }
  }
}

function cannon(square, add) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let x = square.x + dx, y = square.y + dy, screen = false;
    while (inside(x, y)) {
      const target = state.board[y][x];
      if (!screen) {
        if (!target) add(x, y);
        else screen = true;
      } else if (target) {
        add(x, y);
        break;
      }
      x += dx;
      y += dy;
    }
  }
}

function knight(square, add) {
  const jumps = [
    [1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1],
    [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0]
  ];
  jumps.forEach(([dx, dy, bx, by]) => {
    if (!state.board[square.y + by]?.[square.x + bx]) add(square.x + dx, square.y + dy);
  });
}

function bishop(square, add, own) {
  [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dx, dy]) => {
    const y = square.y + dy;
    if (own === "w" && y > 4) return;
    if (own === "b" && y < 5) return;
    if (!state.board[square.y + dy / 2]?.[square.x + dx / 2]) add(square.x + dx, y);
  });
}

function advisor(square, add, own) {
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => {
    const x = square.x + dx, y = square.y + dy;
    if (inPalace(x, y, own)) add(x, y);
  });
}

function king(square, add, own) {
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
    const x = square.x + dx, y = square.y + dy;
    if (inPalace(x, y, own)) add(x, y);
  });
}

function pawn(square, add, own) {
  const forward = own === "w" ? 1 : -1;
  add(square.x, square.y + forward);
  const crossed = own === "w" ? square.y >= 5 : square.y <= 4;
  if (crossed) {
    add(square.x + 1, square.y);
    add(square.x - 1, square.y);
  }
}

function inPalace(x, y, own) {
  return x >= 3 && x <= 5 && (own === "w" ? y >= 0 && y <= 2 : y >= 7 && y <= 9);
}

function isLegalMove(move, side = state.side) {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return false;
  const from = uciToSquare(move.slice(0, 2));
  const to = uciToSquare(move.slice(2, 4));
  if (!inside(from.x, from.y) || !inside(to.x, to.y)) return false;
  const piece = state.board[from.y]?.[from.x] || "";
  if (!piece || pieceColor(piece) !== side) return false;
  const target = state.board[to.y]?.[to.x] || "";
  if (target && (pieceColor(target) === side || target.toLowerCase() === "k")) return false;
  const pseudo = pseudoMovesOnBoard(state.board, from);
  if (!pseudo.some((square) => square.x === to.x && square.y === to.y)) return false;
  const next = cloneBoard(state.board);
  applyMoveToBoard(next, move);
  return !isKingInCheck(next, side);
}

function pseudoMovesOnBoard(board, square) {
  const piece = board[square.y]?.[square.x] || "";
  if (!piece) return [];
  const own = pieceColor(piece);
  const moves = [];
  const add = (x, y) => {
    if (!inside(x, y)) return;
    const target = board[y][x];
    if (target?.toLowerCase() === "k") return;
    if (!target || pieceColor(target) !== own) moves.push({ x, y });
  };
  const lower = piece.toLowerCase();
  if (lower === "r") slideOnBoard(board, square, [[1, 0], [-1, 0], [0, 1], [0, -1]], add);
  if (lower === "c") cannonOnBoard(board, square, add);
  if (lower === "n") knightOnBoard(board, square, add);
  if (lower === "b") bishopOnBoard(board, square, add, own);
  if (lower === "a") advisor(square, add, own);
  if (lower === "k") king(square, add, own);
  if (lower === "p") pawn(square, add, own);
  return moves;
}

function isKingInCheck(board, side) {
  const kingSquare = findKing(board, side);
  if (!kingSquare) return true;
  return isSquareAttacked(board, kingSquare, side === "w" ? "b" : "w");
}

function isCheckmate(side) {
  return isKingInCheck(state.board, side) && !hasLegalMoves(side);
}

function getCheckmatedSide() {
  if (!findKing(state.board, "w") || !findKing(state.board, "b")) return false;
  return isCheckmate(state.side) ? state.side : null;
}

function getCheckedSides() {
  return {
    w: Boolean(findKing(state.board, "w")) && isKingInCheck(state.board, "w"),
    b: Boolean(findKing(state.board, "b")) && isKingInCheck(state.board, "b")
  };
}

function evaluateGameOver() {
  return Boolean(getCheckmatedSide());
}

function hasLegalMoves(side) {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = state.board[y][x];
      if (!piece || pieceColor(piece) !== side) continue;
      const from = { x, y };
      const moves = pseudoMovesOnBoard(state.board, from);
      if (moves.some((to) => isLegalMove(squareToUci(from) + squareToUci(to), side))) return true;
    }
  }
  return false;
}

function findKing(board, side) {
  const king = side === "w" ? "K" : "k";
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      if (board[y][x] === king) return { x, y };
    }
  }
  return null;
}

function isSquareAttacked(board, square, bySide) {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece && pieceColor(piece) === bySide && attacksSquare(board, { x, y }, square)) {
        return true;
      }
    }
  }
  return false;
}

function attacksSquare(board, from, target) {
  const piece = board[from.y]?.[from.x] || "";
  const side = pieceColor(piece);
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  switch (piece.toLowerCase()) {
    case "r":
      return (dx === 0 || dy === 0) && clearLine(board, from, target) === 0;
    case "c":
      return (dx === 0 || dy === 0) && clearLine(board, from, target) === 1;
    case "n":
      return ((adx === 1 && ady === 2 && !board[from.y + dy / 2]?.[from.x]) ||
        (adx === 2 && ady === 1 && !board[from.y]?.[from.x + dx / 2]));
    case "b":
      return adx === 2 && ady === 2 &&
        !(side === "w" && target.y > 4) &&
        !(side === "b" && target.y < 5) &&
        !board[from.y + dy / 2]?.[from.x + dx / 2];
    case "a":
      return adx === 1 && ady === 1 && inPalace(target.x, target.y, side);
    case "k":
      return (from.x === target.x && clearLine(board, from, target) === 0) ||
        (adx + ady === 1 && inPalace(target.x, target.y, side));
    case "p": {
      const forward = side === "w" ? 1 : -1;
      const crossed = side === "w" ? from.y >= 5 : from.y <= 4;
      return (dx === 0 && dy === forward) || (crossed && adx === 1 && dy === 0);
    }
    default:
      return false;
  }
}

function clearLine(board, from, target) {
  if (from.x !== target.x && from.y !== target.y) return Infinity;
  const stepX = Math.sign(target.x - from.x);
  const stepY = Math.sign(target.y - from.y);
  let x = from.x + stepX;
  let y = from.y + stepY;
  let blockers = 0;
  while (x !== target.x || y !== target.y) {
    if (board[y][x]) blockers++;
    x += stepX;
    y += stepY;
  }
  return blockers;
}

function slideOnBoard(board, square, dirs, add) {
  for (const [dx, dy] of dirs) {
    let x = square.x + dx, y = square.y + dy;
    while (inside(x, y)) {
      add(x, y);
      if (board[y][x]) break;
      x += dx;
      y += dy;
    }
  }
}

function cannonOnBoard(board, square, add) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let x = square.x + dx, y = square.y + dy, screen = false;
    while (inside(x, y)) {
      const target = board[y][x];
      if (!screen) {
        if (!target) add(x, y);
        else screen = true;
      } else if (target) {
        add(x, y);
        break;
      }
      x += dx;
      y += dy;
    }
  }
}

function knightOnBoard(board, square, add) {
  const jumps = [
    [1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1],
    [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0]
  ];
  jumps.forEach(([dx, dy, bx, by]) => {
    if (!board[square.y + by]?.[square.x + bx]) add(square.x + dx, square.y + dy);
  });
}

function bishopOnBoard(board, square, add, own) {
  [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dx, dy]) => {
    const y = square.y + dy;
    if (own === "w" && y > 4) return;
    if (own === "b" && y < 5) return;
    if (!board[square.y + dy / 2]?.[square.x + dx / 2]) add(square.x + dx, y);
  });
}

function parseFen(fen) {
  const rows = fen.split(" ")[0].split("/");
  const board = Array.from({ length: 10 }, () => Array(9).fill(""));
  rows.forEach((row, rowIndex) => {
    let x = 0;
    const y = 9 - rowIndex;
    for (const char of row) {
      if (/\d/.test(char)) x += Number(char);
      else board[y][x++] = char;
    }
  });
  return board;
}

function parseFenInput(fen) {
  const parts = normalizeFenText(fen).split(/\s+/);
  const boardIndex = parts.findIndex((part) => part.includes("/"));
  if (boardIndex < 0) throw new Error("Không tìm thấy phần bàn cờ trong FEN.");
  const boardPart = parts[boardIndex] || "";
  const sideText = String(parts[boardIndex + 1] || "w").toLowerCase();
  const side = sideText === "b" || sideText === "black" || sideText === "đen" || sideText === "den" ? "b" : "w";
  const rows = boardPart.split("/");
  if (rows.length !== 10) throw new Error("FEN phải có đúng 10 hàng.");
  const board = Array.from({ length: 10 }, () => Array(9).fill(""));
  const validPieces = /^[kabnrcpKABNRCP]$/;
  rows.forEach((row, rowIndex) => {
    let x = 0;
    const y = 9 - rowIndex;
    for (const char of row) {
      if (/[1-9]/.test(char)) {
        x += Number(char);
        if (x > 9) throw new Error("FEN có hàng dài quá 9 cột.");
      } else if (validPieces.test(char)) {
        if (x >= 9) throw new Error("FEN có hàng dài quá 9 cột.");
        board[y][x++] = char;
      } else {
        throw new Error(`FEN có ký tự không hợp lệ: ${char}`);
      }
    }
    if (x !== 9) throw new Error("Mỗi hàng FEN phải đủ 9 cột.");
  });
  return { board, side };
}

function normalizeFenText(fen) {
  return String(fen || "")
    .trim()
    .replace(/^position\s+fen\s+/i, "")
    .replace(/^fen\s+/i, "")
    .replace(/[“”"]/g, "")
    .replace(/[，；;]/g, " ")
    .replace(/\s+/g, " ");
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function emptyBoard() {
  return Array.from({ length: 10 }, () => Array(9).fill(""));
}

function applyMoveToBoard(board, move) {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return;
  const from = uciToSquare(move.slice(0, 2));
  const to = uciToSquare(move.slice(2, 4));
  board[to.y][to.x] = board[from.y][from.x];
  board[from.y][from.x] = "";
}

function geometry() {
  const metrics = boardMetrics(boardEl);
  const pad = metrics.width * 0.07;
  const usableW = metrics.width - pad * 2;
  const usableH = metrics.height - pad * 2;
  return {
    rect: metrics.rect,
    offsetX: metrics.offsetX,
    offsetY: metrics.offsetY,
    x: (file) => pad + (state.flipped ? 8 - file : file) * usableW / 8,
    y: (rank) => pad + (state.flipped ? rank : 9 - rank) * usableH / 9
  };
}

function boardMetrics(element) {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
  const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
  const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
  const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;
  return {
    rect,
    offsetX: borderLeft,
    offsetY: borderTop,
    width: Math.max(0, element.clientWidth || rect.width - borderLeft - borderRight),
    height: Math.max(0, element.clientHeight || rect.height - borderTop - borderBottom)
  };
}

function squareToPixel(square) {
  const g = geometry();
  return { x: g.x(square.x), y: g.y(square.y) };
}

function eventToSquare(event) {
  const g = geometry();
  let best = null, bestDistance = Infinity;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const px = g.x(x), py = g.y(y);
      const d = Math.hypot(event.clientX - g.rect.left - g.offsetX - px, event.clientY - g.rect.top - g.offsetY - py);
      if (d < bestDistance) {
        bestDistance = d;
        best = { x, y };
      }
    }
  }
  return bestDistance < boardMetrics(boardEl).width / 9.4 ? best : null;
}

function squareToUci(square) {
  return `${FILES[square.x]}${square.y}`;
}

function uciToSquare(text) {
  return { x: FILES.indexOf(text[0]), y: Number(text[1]) };
}

function getPiece(square) {
  return state.board[square.y]?.[square.x] || "";
}

function pieceColor(piece) {
  if (!piece) return "";
  return piece === piece.toUpperCase() ? "w" : "b";
}

function inside(x, y) {
  return x >= 0 && x < 9 && y >= 0 && y < 10;
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawStyledArrow(ctx, from, base, tip, normal, halfWidth, palette) {
  ctx.save();
  const shaftWidth = ctx.lineWidth;
  const borderWidth = shaftWidth + Math.max(0.75, shaftWidth * 0.13);
  const outlineWidth = shaftWidth + Math.max(0.35, shaftWidth * 0.06);
  const borderHeadWidth = halfWidth + Math.max(0.7, shaftWidth * 0.1);
  const innerHeadWidth = halfWidth * 0.86;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 0;

  ctx.strokeStyle = palette.border;
  ctx.fillStyle = palette.border;
  ctx.lineWidth = borderWidth;
  line(ctx, from.x, from.y, base.x, base.y);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(base.x + normal.x * borderHeadWidth, base.y + normal.y * borderHeadWidth);
  ctx.lineTo(base.x - normal.x * borderHeadWidth, base.y - normal.y * borderHeadWidth);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = palette.edge;
  ctx.fillStyle = palette.edge;
  ctx.lineWidth = outlineWidth;
  line(ctx, from.x, from.y, base.x, base.y);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(base.x + normal.x * halfWidth, base.y + normal.y * halfWidth);
  ctx.lineTo(base.x - normal.x * halfWidth, base.y - normal.y * halfWidth);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = palette.fill;
  ctx.fillStyle = palette.fill;
  ctx.lineWidth = shaftWidth;
  line(ctx, from.x, from.y, base.x, base.y);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(base.x + normal.x * innerHeadWidth, base.y + normal.y * innerHeadWidth);
  ctx.lineTo(base.x - normal.x * innerHeadWidth, base.y - normal.y * innerHeadWidth);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = Math.max(0.8, shaftWidth * 0.2);
  ctx.lineCap = "round";
  line(
    ctx,
    from.x - normal.x * shaftWidth * 0.2,
    from.y - normal.y * shaftWidth * 0.2,
    base.x - normal.x * shaftWidth * 0.2,
    base.y - normal.y * shaftWidth * 0.2
  );
  ctx.restore();
}

function arrowPalette(color) {
  const base = parseArrowColor(color);
  return {
    border: "rgba(16, 20, 22, 0.54)",
    fill: rgbaString({ ...base, a: 0.9 }),
    edge: rgbaString(mixArrowColor(base, 0.42, 0, 0.58)),
    highlight: "rgba(255, 255, 240, 0.32)"
  };
}

function parseArrowColor(color) {
  const match = String(color || "").match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
  if (!match) return { r: 23, g: 126, b: 137, a: 0.9 };
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4])
  };
}

function mixArrowColor(base, ratio, target, alpha = base.a) {
  return {
    r: Math.round(base.r + (target - base.r) * ratio),
    g: Math.round(base.g + (target - base.g) * ratio),
    b: Math.round(base.b + (target - base.b) * ratio),
    a: alpha
  };
}

function rgbaString(color) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

function readStorage(key) {
  try {
    return String(localStorage.getItem(key) || "");
  } catch {
    return "";
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value || ""));
  } catch {}
}

function readOrCreateAuthDeviceId() {
  const existing = readStorage(AUTH_DEVICE_ID_STORAGE_KEY);
  if (/^[a-zA-Z0-9:_-]{8,120}$/.test(existing)) return existing;
  let token = "";
  if (window.crypto?.getRandomValues) {
    const values = new Uint8Array(12);
    window.crypto.getRandomValues(values);
    token = Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
  } else {
    token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  const deviceId = `web-${token.slice(0, 32)}`;
  writeStorage(AUTH_DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}

function isSessionReplacedError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "");
  return Number(error?.status) === 409 || code === "SESSION_REPLACED" || /dang nhap o noi khac|SESSION_REPLACED/i.test(message);
}

function handleAnalysisSessionReplaced() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
  if (accessKeyInputEl && readStorage(AUTH_ACCESS_KEY_STORAGE_KEY)) {
    accessKeyInputEl.value = readStorage(AUTH_ACCESS_KEY_STORAGE_KEY);
  }
  showAccessGate("Tai khoan dang dang nhap o noi khac.");
}

async function api(url, body, behavior = {}) {
  const target = apiTarget(url);
  let lastError = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const headers = {};
      const token = readStorage(AUTH_TOKEN_STORAGE_KEY);
      if (token) headers.Authorization = `Bearer ${token}`;
      if (authDeviceId) headers["X-Dmaihxcai-Device"] = authDeviceId;
      if (body) headers["Content-Type"] = "application/json";
      const response = await fetch(target, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      const raw = await response.text();
      let data = {};

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          if (looksLikeRenderWakePage(raw)) throw new Error("BACKEND_WAKING");
          throw new Error(`Unexpected server response (${response.status})`);
        }
      }

      if (!response.ok || data.ok === false) {
        const message = data.error || `Request failed (${response.status})`;
        if (attempt < 5 && isRetryableStatus(response.status, raw, message)) {
          await wait(1200 + attempt * 900);
          continue;
        }
        const error = Object.assign(new Error(response.status === 401 ? "UNAUTHORIZED" : message), {
          status: response.status,
          code: data.code || ""
        });
        if (!behavior.suppressSessionReplaced && isSessionReplacedError(error)) handleAnalysisSessionReplaced();
        throw error;
      }

      return data;
    } catch (err) {
      lastError = err;
      if (attempt < 5 && isRetryableError(err)) {
        await wait(1200 + attempt * 900);
        continue;
      }
      break;
    }
  }

  if (!behavior.suppressSessionReplaced && isSessionReplacedError(lastError)) handleAnalysisSessionReplaced();
  throw friendlyApiError(lastError);
}

function apiTarget(url) {
  const base = String(window.DMAIHXCAI_API_BASE || "").replace(/\/$/, "");
  return base && url.startsWith("/") ? `${base}${url}` : url;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikeRenderWakePage(text) {
  const sample = String(text || "").toLowerCase();
  return sample.includes("service waking up") || sample.includes("welcome to render") || sample.includes("render");
}

function isRetryableStatus(status, raw, message) {
  return API_RETRYABLE_STATUS.has(status) || looksLikeRenderWakePage(raw) || /waking|temporarily unavailable|failed to fetch/i.test(message);
}

function isRetryableError(err) {
  const message = String((err && err.message) || "");
  return err && (err.name === "TypeError" || message === "BACKEND_WAKING" || /fetch|network|load failed|unexpected server response/i.test(message));
}

function friendlyApiError(err) {
  const message = String((err && err.message) || "");
  if (message === "BACKEND_WAKING" || /unexpected server response|fetch|network|load failed/i.test(message)) {
    return new Error("Backend Render đang khởi động. Trang đã tự chờ và thử lại, nhưng backend vẫn chưa sẵn sàng. Đợi vài giây rồi thử lại.");
  }
  return err instanceof Error ? err : new Error("Request failed");
}

function wakeBackend() {
  if (!window.DMAIHXCAI_API_BASE || wakePromise) return wakePromise;
  wakePromise = fetch(apiTarget("/api/status"))
    .catch(() => {})
    .finally(() => {
      wakePromise = null;
    });
  return wakePromise;
}
