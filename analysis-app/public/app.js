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
const PIECE_CODES = { k: "Tg", a: "S", b: "T", r: "X", c: "P", n: "M", p: "B" };
const EDITOR_PIECES = ["K", "A", "B", "N", "R", "C", "P", "k", "a", "b", "n", "r", "c", "p", ""];

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
  auto: false,
  autoTimer: null,
  gameOver: false,
  checkmatedSide: null,
  editMode: false,
  editorPiece: "R"
};

const boardEl = document.getElementById("board");
const boardCanvas = document.getElementById("boardCanvas");
const arrowCanvas = document.getElementById("arrowCanvas");
const piecesEl = document.getElementById("pieces");
const analysisEl = document.getElementById("analysis");
const cloudBookEl = document.getElementById("cloudBook");
const historyEl = document.getElementById("history");
const engineStatusEl = document.getElementById("engineStatus");
const networkStatusEl = document.getElementById("networkStatus");
const enginePathEl = document.getElementById("enginePath");
const depthEl = document.getElementById("depth");
const strengthButtonsEl = document.getElementById("strengthButtons");
const delayEl = document.getElementById("delay");
const delayOut = document.getElementById("delayOut");
const piecePaletteEl = document.getElementById("piecePalette");
const loadFenBtn = document.getElementById("loadFenBtn");
const copyFenBtn = document.getElementById("copyFenBtn");
const editBoardBtn = document.getElementById("editBoardBtn");
const clearBoardBtn = document.getElementById("clearBoardBtn");
const sideToMoveEl = document.getElementById("sideToMove");

window.addEventListener("resize", draw);
boardEl.addEventListener("click", onBoardClick);
document.getElementById("flipBtn").addEventListener("click", () => {
  state.flipped = !state.flipped;
  if (state.lastAnalysis) {
    renderAnalysis(state.lastAnalysis.result, state.lastAnalysis.board, state.lastAnalysis.side);
  }
  draw();
  refreshCloudBook();
});
bindClick("saveEngineBtn", saveEnginePath);
bindClick("buildEngineBtn", buildEngine);
bindClick("downloadNetBtn", downloadNetwork);
document.getElementById("analyzeBtn").addEventListener("click", startManualAnalysis);
bindClick("bestMoveBtn", playBestMove);
document.getElementById("undoBtn").addEventListener("click", undo);
document.getElementById("redoBtn").addEventListener("click", redo);
document.getElementById("resetBtn").addEventListener("click", reset);
document.getElementById("autoBtn").addEventListener("click", toggleAuto);
if (strengthButtonsEl) strengthButtonsEl.addEventListener("click", onStrengthClick);
if (delayEl && delayOut) delayEl.addEventListener("input", () => delayOut.value = `${delayEl.value}ms`);
if (loadFenBtn) loadFenBtn.addEventListener("click", loadFenFromPrompt);
if (copyFenBtn) copyFenBtn.addEventListener("click", copyFenToClipboard);
if (editBoardBtn) editBoardBtn.addEventListener("click", toggleEditMode);
if (clearBoardBtn) clearBoardBtn.addEventListener("click", clearBoard);
if (sideToMoveEl) sideToMoveEl.addEventListener("change", setSideToMove);

init();

function bindClick(id, handler) {
  const element = document.getElementById(id);
  if (element) element.addEventListener("click", handler);
}

function autoDelay() {
  return delayEl ? Number(delayEl.value) : 700;
}

function onStrengthClick(event) {
  const button = event.target.closest("button[data-depth]");
  if (!button || !strengthButtonsEl) return;
  depthEl.value = button.dataset.depth;
  [...strengthButtonsEl.querySelectorAll("button[data-depth]")].forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  if (state.analysisMode) {
    runAnalysis({ activateMode: true }).catch(() => {});
  }
}

async function init() {
  renderPiecePalette();
  updateEditorUi();
  await refreshStatus();
  draw();
  refreshCloudBook();
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
  stopAutoPlay(true);
  state.analysisMode = true;
  return runAnalysis({ activateMode: true });
}

async function runAnalysis({ activateMode = false } = {}) {
  if (activateMode) state.analysisMode = true;
  const requestId = ++state.analysisRequest;
  const boardBefore = cloneBoard(state.board);
  const sideBefore = state.side;
  const fenBefore = `${boardToCloudFen(boardBefore, sideBefore)} - - 0 1`;
  analysisEl.textContent = "Đang phân tích...";
  state.bestMove = "";
  state.suggestions = [];
  state.suggestionOptions = [];
  stopScoreAnimation();
  clearArrow();

  try {
    const result = await api("/api/analyze", {
      fen: fenBefore,
      moves: [],
      depth: Number(depthEl.value),
      multipv: 3
    });
    if (requestId !== state.analysisRequest) return result;
    state.bestMove = result.bestMove || "";
    state.suggestionOptions = buildSuggestionOptions(result, boardBefore);
    state.suggestions = state.suggestionOptions[0] || [];
    state.lastAnalysis = { result, board: boardBefore, side: sideBefore };
    renderAnalysis(result, boardBefore, sideBefore, { animateScore: true });
    draw();
    return result;
  } catch (err) {
    if (requestId === state.analysisRequest) analysisEl.textContent = err.message;
    throw err;
  }
}

async function playBestMove() {
  const result = state.bestMove ? { bestMove: state.bestMove } : await runAnalysis({ activateMode: state.analysisMode });
  if (result.bestMove && result.bestMove !== "(none)" && result.bestMove !== "0000") {
    makeMove(result.bestMove);
  }
}

function toggleAuto() {
  stopScoreAnimation();
  state.auto = !state.auto;
  if (state.auto) {
    state.analysisMode = false;
    state.suggestions = [];
    state.suggestionOptions = [];
    state.bestMove = "";
    state.lastAnalysis = null;
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
    const result = await runAnalysis();
    if (result.bestMove && result.bestMove !== "(none)") makeMove(result.bestMove, { manual: false });
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
  clearArrow();
  drawArrows(state.suggestions);
}

function scoreForViewer(line, sideToMove) {
  const raw = parseEngineScore(line?.score || "");
  const viewerSide = state.flipped ? "b" : "w";
  const multiplier = sideToMove === viewerSide ? 1 : -1;
  if (raw.kind === "mate") return Math.sign(raw.value || 1) * multiplier * 31999;
  return scaleAdvantageScore(raw.value * multiplier, 2.25, 2000);
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

function makeMove(move, { manual = true } = {}) {
  if (state.gameOver) return;
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return;
  const from = uciToSquare(move.slice(0, 2));
  const to = uciToSquare(move.slice(2, 4));
  const piece = getPiece(from);
  if (!piece) return;
  if (!isLegalMove(move, state.side)) return;
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
  draw();
  refreshCloudBook();
  if (manual && state.analysisMode) {
    setTimeout(() => runAnalysis({ activateMode: true }).catch(() => {}), 0);
  }
}

function undo() {
  if (state.cursor <= 0) return;
  state.cursor -= 1;
  rebuildPosition();
}

function redo() {
  if (state.cursor >= state.moves.length) return;
  state.cursor += 1;
  rebuildPosition();
}

function reset() {
  state.moves = [];
  state.cursor = 0;
  rebuildPosition();
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
      button.style.setProperty("--piece-image", `url("${PIECE_IMAGES[piece]}")`);
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

function updateEditorUi() {
  boardEl.classList.toggle("editing", state.editMode);
  if (editBoardBtn) {
    editBoardBtn.classList.toggle("active", state.editMode);
    editBoardBtn.textContent = state.editMode ? "Đang sửa bàn" : "Sửa bàn cờ";
  }
  if (sideToMoveEl) sideToMoveEl.value = state.side;
  if (piecePaletteEl) {
    [...piecePaletteEl.querySelectorAll(".palette-piece")].forEach((button) => {
      button.classList.toggle("active", button.dataset.piece === state.editorPiece);
    });
  }
}

function toggleEditMode() {
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

function clearBoard() {
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
    const parsed = parseFenInput(input);
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
    draw();
    refreshCloudBook();
    if (state.analysisMode) {
      setTimeout(() => runAnalysis({ activateMode: true }).catch(() => {}), 0);
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
  stopScoreAnimation();
  state.side = sideToMoveEl.value === "b" ? "b" : "w";
  state.moves = [];
  state.cursor = 0;
  state.gameOver = false;
  state.checkmatedSide = null;
  state.analysisRequest++;
  draw();
  refreshCloudBook();
}

function editBoardSquare(square) {
  const piece = state.editorPiece;
  if (piece && !isEditorPieceAllowed(piece, square)) return;
  stopScoreAnimation();
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
  draw();
  refreshCloudBook();
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

function rebuildPosition() {
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
  draw();
  refreshCloudBook();
  if (state.analysisMode) {
    setTimeout(() => runAnalysis({ activateMode: true }).catch(() => {}), 0);
  }
}

function draw() {
  boardEl.classList.toggle("flipped", state.flipped);
  updateEditorUi();
  drawBoard();
  drawPieces();
  renderHistory();
  clearArrow();
  drawArrows(state.suggestions);
}

function drawBoard() {
  const rect = boardEl.getBoundingClientRect();
  for (const canvas of [boardCanvas, arrowCanvas]) {
    canvas.width = Math.round(rect.width * devicePixelRatio);
    canvas.height = Math.round(rect.height * devicePixelRatio);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }
  const ctx = boardCanvas.getContext("2d");
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const g = geometry();
  ctx.strokeStyle = "rgba(65, 62, 47, 0.62)";
  ctx.lineWidth = Math.max(1.5, rect.width / 420);
  for (let x = 0; x < 9; x++) {
    line(ctx, g.x(x), g.y(0), g.x(x), g.y(4));
    line(ctx, g.x(x), g.y(5), g.x(x), g.y(9));
  }
  for (let y = 0; y < 10; y++) line(ctx, g.x(0), g.y(y), g.x(8), g.y(y));
  line(ctx, g.x(3), g.y(0), g.x(5), g.y(2));
  line(ctx, g.x(5), g.y(0), g.x(3), g.y(2));
  line(ctx, g.x(3), g.y(7), g.x(5), g.y(9));
  line(ctx, g.x(5), g.y(7), g.x(3), g.y(9));
  ctx.font = `${Math.max(18, rect.width / 24)}px "Segoe UI"`;
  ctx.fillStyle = "rgba(38, 39, 33, 0.82)";
  ctx.textAlign = "center";
  ctx.fillText("\u695a\u6cb3", g.x(2.2), (g.y(4) + g.y(5)) / 2 + 8);
  ctx.fillText("\u6f22\u754c", g.x(5.8), (g.y(4) + g.y(5)) / 2 + 8);
}

function drawPieces() {
  piecesEl.innerHTML = "";
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = state.board[y][x];
      if (!piece) continue;
      const pos = squareToPixel({ x, y });
      const el = document.createElement("div");
      el.className = `piece image-piece ${piece === piece.toUpperCase() ? "red" : "black"}`;
      if (piece.toLowerCase() === "k" && pieceColor(piece) === state.checkmatedSide) {
        el.classList.add("checkmated");
      }
      if (state.selected && state.selected.x === x && state.selected.y === y) el.classList.add("selected");
      el.style.setProperty("--piece-image", `url("${PIECE_IMAGES[piece]}")`);
      el.setAttribute("aria-label", PIECE_NAMES[piece] || piece);
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      piecesEl.appendChild(el);
    }
  }
  state.hints.forEach((hint) => {
    const pos = squareToPixel(hint);
    const el = document.createElement("div");
    el.className = "hint";
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    piecesEl.appendChild(el);
  });
}

function drawArrows(suggestions) {
  suggestions.forEach((suggestion) => drawArrow(suggestion.move, suggestion.color));
}

function drawArrow(move, color = "rgba(23, 126, 137, 0.88)") {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return;
  const from = squareToPixel(uciToSquare(move.slice(0, 2)));
  const toSquare = uciToSquare(move.slice(2, 4));
  const to = squareToPixel(toSquare);
  const ctx = arrowCanvas.getContext("2d");
  const rect = boardEl.getBoundingClientRect();
  const pieceRatio = Number.parseFloat(getComputedStyle(boardEl).getPropertyValue("--piece-size")) / 100 || 0.086;
  const isMobileBoard = rect.width <= 460;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = isMobileBoard ? Math.max(7, rect.width * pieceRatio * 0.18) : Math.max(11, rect.width / 66);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const capturesPiece = Boolean(state.board[toSquare.y]?.[toSquare.x]);
  const pieceRadius = rect.width * pieceRatio / 2;
  const stopBeforeTarget = capturesPiece ? pieceRadius + Math.max(4, ctx.lineWidth * 0.5) : 0;
  const tip = { x: to.x - dir.x * stopBeforeTarget, y: to.y - dir.y * stopBeforeTarget };
  const head = isMobileBoard ? Math.max(34, rect.width * pieceRatio * 0.92) : Math.max(58, rect.width / 12);
  const halfWidth = isMobileBoard ? Math.max(9, head * 0.18) : Math.max(12, head * 0.2);
  const base = { x: tip.x - dir.x * head, y: tip.y - dir.y * head };
  line(ctx, from.x, from.y, base.x, base.y);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(base.x + normal.x * halfWidth, base.y + normal.y * halfWidth);
  ctx.lineTo(base.x - normal.x * halfWidth, base.y - normal.y * halfWidth);
  ctx.closePath();
  ctx.fill();
}

function clearArrow() {
  const ctx = arrowCanvas.getContext("2d");
  const rect = boardEl.getBoundingClientRect();
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
}

function renderHistory() {
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
  const rows = result.moves.slice(0, 7).map((entry) => {
    const score = scoreFromCloud(entry.score);
    return `<button class="cloud-row" data-move="${entry.move}">
      <span class="cloud-move">${formatMove(entry.move, replay, side)}</span>
      <span class="cloud-score ${scoreClass(score)}">${formatEval(score)}</span>
      <span class="cloud-rank">${escapeHtml(entry.rank || "")}</span>
    </button>`;
  }).join("");
  cloudBookEl.innerHTML = rows;
  cloudBookEl.querySelectorAll(".cloud-row").forEach((row) => {
    row.addEventListener("click", () => makeMove(row.dataset.move));
  });
}

function renderCloudPlaceholders() {
  if (!cloudBookEl) return;
  cloudBookEl.innerHTML = Array.from({ length: 7 }, () => (
    `<div class="cloud-row cloud-placeholder" aria-hidden="true">
      <span class="cloud-move">&nbsp;</span>
      <span class="cloud-score">&nbsp;</span>
      <span class="cloud-rank">&nbsp;</span>
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
  const value = Number.isFinite(score) ? score : 0;
  const viewerSide = state.flipped ? "b" : "w";
  const oriented = state.side === viewerSide ? value : -value;
  return scaleAdvantageScore(oriented, 1.65, 1500);
}

function cloudPlaceholderRows(count) {
  return Array.from({ length: Math.max(0, count) }, () => (
    `<div class="cloud-row cloud-placeholder" aria-hidden="true">
      <span class="cloud-move">&nbsp;</span>
      <span class="cloud-score">&nbsp;</span>
      <span class="cloud-rank">&nbsp;</span>
    </div>`
  )).join("");
}

function renderCloudPlaceholders() {
  if (!cloudBookEl) return;
  cloudBookEl.innerHTML = "";
}

function renderCloudBook(result) {
  if (!cloudBookEl) return;
  const entries = Array.isArray(result?.moves) ? result.moves.filter(isReliableCloudMove).slice(0, 7) : [];
  if (!entries.length) {
    renderCloudPlaceholders();
    return;
  }
  const replay = cloneBoard(state.board);
  const side = state.side;
  const rows = entries.map((entry) => {
    const score = scoreFromCloud(entry.score);
    return `<button class="cloud-row" data-move="${entry.move}">
      <span class="cloud-move">${formatMove(entry.move, replay, side)}</span>
      <span class="cloud-score ${scoreClass(score)}">${formatEval(score)}</span>
      <span class="cloud-rank">${escapeHtml(entry.rank || "")}</span>
    </button>`;
  }).join("") + cloudPlaceholderRows(7 - entries.length);
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
    const color = pieceColor(piece) === "w" ? "rgba(200, 26, 191, 0.94)" : "rgba(36, 93, 210, 0.92)";
    applyMoveToBoard(replay, move);
    return { move, color };
  }).filter(Boolean);
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
  const rect = boardEl.getBoundingClientRect();
  const pad = rect.width * 0.07;
  const usableW = rect.width - pad * 2;
  const usableH = rect.height - pad * 2;
  return {
    x: (file) => pad + (state.flipped ? 8 - file : file) * usableW / 8,
    y: (rank) => pad + (state.flipped ? rank : 9 - rank) * usableH / 9
  };
}

function squareToPixel(square) {
  const g = geometry();
  return { x: g.x(square.x), y: g.y(square.y) };
}

function eventToSquare(event) {
  const rect = boardEl.getBoundingClientRect();
  const g = geometry();
  let best = null, bestDistance = Infinity;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const px = g.x(x), py = g.y(y);
      const d = Math.hypot(event.clientX - rect.left - px, event.clientY - rect.top - py);
      if (d < bestDistance) {
        bestDistance = d;
        best = { x, y };
      }
    }
  }
  return bestDistance < rect.width / 13 ? best : null;
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

async function api(url, body) {
  const base = String(window.DMAIHXCAI_API_BASE || "").replace(/\/$/, "");
  const target = base && url.startsWith("/") ? `${base}${url}` : url;
  const response = await fetch(target, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || "Request failed");
  return data;
}
