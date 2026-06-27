(function () {
  "use strict";

  const API_RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
  const STORAGE_TOKEN = "dmaihxcai-auth-token";
  const STORAGE_ROOM = "dmaihxcai-room-key";
  const START_FEN = XiangqiCore.START_FEN;
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

  const state = {
    token: localStorage.getItem(STORAGE_TOKEN) || "",
    user: null,
    history: [],
    route: "auth",
    lobbyMode: "join",
    createSide: "w",
    room: null,
    roomKey: localStorage.getItem(STORAGE_ROOM) || "",
    roomBoard: XiangqiCore.parseFenState(START_FEN).board,
    reviewGame: null,
    reviewCursor: 0,
    reviewBoard: XiangqiCore.parseFenState(START_FEN).board,
    reviewContextBoard: XiangqiCore.parseFenState(START_FEN).board,
    reviewSideToMove: "w",
    reviewAnalysis: [],
    reviewAnalyzing: false,
    reviewLastBoardFrame: "",
    reviewLastPieceFrame: "",
    selectedSquare: null,
    hints: [],
    roomSyncedAt: 0,
    roomPollTimer: null,
    roomClockTimer: null,
    roomPollBusy: false,
    roomActionBusy: false,
    modalConfirm: null,
    lastBoardFrame: "",
    lastPieceFrame: "",
    lastChatSignature: "",
    resizeTimer: null,
    lastBoardSizeKey: ""
  };

  const dom = {
    globalBackBtn: byId("globalBackBtn"),
    authView: byId("authView"),
    homeView: byId("homeView"),
    matchHubView: byId("matchHubView"),
    libraryView: byId("libraryView"),
    roomView: byId("roomView"),
    reviewView: byId("reviewView"),
    headerProfile: byId("headerProfile"),
    resumeRoomBtn: byId("resumeRoomBtn"),
    profileButton: byId("profileButton"),
    profileAvatar: byId("profileAvatar"),
    profileName: byId("profileName"),
    profileUsername: byId("profileUsername"),
    loginTab: byId("loginTab"),
    registerTab: byId("registerTab"),
    loginForm: byId("loginForm"),
    registerForm: byId("registerForm"),
    authMessage: byId("authMessage"),
    loginAccount: byId("loginAccount"),
    loginPassword: byId("loginPassword"),
    registerEmail: byId("registerEmail"),
    registerUsername: byId("registerUsername"),
    registerPassword: byId("registerPassword"),
    openMatchHub: byId("openMatchHub"),
    openAnalysisBtn: byId("openAnalysisBtn"),
    openLibraryBtn: byId("openLibraryBtn"),
    showJoinRoom: byId("showJoinRoom"),
    showCreateRoom: byId("showCreateRoom"),
    joinRoomForm: byId("joinRoomForm"),
    createRoomForm: byId("createRoomForm"),
    joinRoomKey: byId("joinRoomKey"),
    timeRange: byId("timeRange"),
    timeRangeValue: byId("timeRangeValue"),
    pickRed: byId("pickRed"),
    pickBlack: byId("pickBlack"),
    matchHubMessage: byId("matchHubMessage"),
    roomKeyLabel: byId("roomKeyLabel"),
    copyRoomKeyBtn: byId("copyRoomKeyBtn"),
    roomStatusBadge: byId("roomStatusBadge"),
    roomSummary: byId("roomSummary"),
    topPlayerAvatar: byId("topPlayerAvatar"),
    topPlayerName: byId("topPlayerName"),
    topSideLabel: byId("topSideLabel"),
    topClock: byId("topClock"),
    bottomPlayerAvatar: byId("bottomPlayerAvatar"),
    bottomPlayerName: byId("bottomPlayerName"),
    bottomSideLabel: byId("bottomSideLabel"),
    bottomClock: byId("bottomClock"),
    roomBoard: byId("roomBoard"),
    roomBoardCanvas: byId("roomBoardCanvas"),
    roomMarks: byId("roomMarks"),
    roomPieces: byId("roomPieces"),
    undoRequestBtn: byId("undoRequestBtn"),
    drawRequestBtn: byId("drawRequestBtn"),
    resignBtn: byId("resignBtn"),
    undoCount: byId("undoCount"),
    drawCount: byId("drawCount"),
    requestState: byId("requestState"),
    resultState: byId("resultState"),
    viewerSummary: byId("viewerSummary"),
    viewerList: byId("viewerList"),
    chatList: byId("chatList"),
    chatForm: byId("chatForm"),
    chatInput: byId("chatInput"),
    roomMoveList: byId("roomMoveList"),
    reviewTitle: byId("reviewTitle"),
    reviewMeta: byId("reviewMeta"),
    reviewResultBadge: byId("reviewResultBadge"),
    reviewPrevBtn: byId("reviewPrevBtn"),
    reviewNextBtn: byId("reviewNextBtn"),
    reviewAnalyzeBtn: byId("reviewAnalyzeBtn"),
    reviewInsight: byId("reviewInsight"),
    reviewMoveMeta: byId("reviewMoveMeta"),
    reviewBoard: byId("reviewBoard"),
    reviewBoardCanvas: byId("reviewBoardCanvas"),
    reviewArrowCanvas: byId("reviewArrowCanvas"),
    reviewPieces: byId("reviewPieces"),
    reviewMoveList: byId("reviewMoveList"),
    profileModal: byId("profileModal"),
    closeProfileBtn: byId("closeProfileBtn"),
    profileAvatarLarge: byId("profileAvatarLarge"),
    displayNameInput: byId("displayNameInput"),
    avatarUrlInput: byId("avatarUrlInput"),
    readonlyUsername: byId("readonlyUsername"),
    saveProfileBtn: byId("saveProfileBtn"),
    logoutBtn: byId("logoutBtn"),
    profileMessage: byId("profileMessage"),
    historyList: byId("historyList"),
    modal: byId("modal"),
    modalTitle: byId("modalTitle"),
    modalText: byId("modalText"),
    modalCancel: byId("modalCancel"),
    modalConfirm: byId("modalConfirm")
  };

  bindEvents();
  preventDoubleTapZoom();
  preloadPieceImages();
  setAuthMode("login");
  setLobbyMode("join");
  updateTimeLabel();
  syncRoute(true);
  bootstrap().catch(() => syncRoute(true));

  function byId(id) {
    return document.getElementById(id);
  }

  function bindEvents() {
    window.addEventListener("resize", scheduleResizeRender, { passive: true });
    window.addEventListener("hashchange", () => syncRoute(false));
    dom.globalBackBtn.addEventListener("click", handleBack);
    dom.loginTab.addEventListener("click", () => setAuthMode("login"));
    dom.registerTab.addEventListener("click", () => setAuthMode("register"));
    dom.loginForm.addEventListener("submit", onLoginSubmit);
    dom.registerForm.addEventListener("submit", onRegisterSubmit);
    dom.openMatchHub.addEventListener("click", () => goRoute("match"));
    dom.openAnalysisBtn.addEventListener("click", () => {
      window.location.href = "/analysis";
    });
    dom.openLibraryBtn.addEventListener("click", () => goRoute("library"));
    dom.showJoinRoom.addEventListener("click", () => setLobbyMode("join"));
    dom.showCreateRoom.addEventListener("click", () => setLobbyMode("create"));
    dom.joinRoomForm.addEventListener("submit", onJoinRoom);
    dom.createRoomForm.addEventListener("submit", onCreateRoom);
    dom.timeRange.addEventListener("input", updateTimeLabel);
    dom.pickRed.addEventListener("click", () => setCreateSide("w"));
    dom.pickBlack.addEventListener("click", () => setCreateSide("b"));
    dom.resumeRoomBtn.addEventListener("click", () => {
      if (state.room) goRoute("room");
      else void resumeStoredRoom();
    });
    dom.profileButton.addEventListener("click", openProfileModal);
    dom.closeProfileBtn.addEventListener("click", closeProfileModal);
    dom.saveProfileBtn.addEventListener("click", saveProfile);
    dom.logoutBtn.addEventListener("click", logout);
    dom.copyRoomKeyBtn.addEventListener("click", () => copyText(state.room?.key || ""));
    dom.undoRequestBtn.addEventListener("click", () => requestRoomAction("undo"));
    dom.drawRequestBtn.addEventListener("click", () => requestRoomAction("draw"));
    dom.resignBtn.addEventListener("click", confirmResign);
    dom.roomBoard.addEventListener("pointerdown", onBoardPointerDown);
    dom.reviewPrevBtn.addEventListener("click", () => stepReview(-1));
    dom.reviewNextBtn.addEventListener("click", () => stepReview(1));
    dom.reviewAnalyzeBtn.addEventListener("click", analyzeReviewGame);
    dom.chatForm.addEventListener("submit", onChatSubmit);
    dom.modalCancel.addEventListener("click", closeModal);
    dom.modalConfirm.addEventListener("click", async () => {
      const action = state.modalConfirm;
      closeModal();
      if (typeof action === "function") await action();
    });
    dom.profileModal.addEventListener("click", (event) => {
      if (event.target === dom.profileModal) closeProfileModal();
    });
    dom.modal.addEventListener("click", (event) => {
      if (event.target === dom.modal) closeModal();
    });
  }

  async function bootstrap() {
    if (!state.token) {
      syncRoute(true);
      return;
    }

    try {
      const [session, historyPayload, currentRoom] = await Promise.all([
        api("/api/auth/me"),
        api("/api/history"),
        api("/api/rooms/current")
      ]);
      applySession(session.user);
      state.history = normalizeHistoryList(historyPayload.history);
      renderHistory();
      if (currentRoom.room) applyRoomState(currentRoom.room, { forceBoard: true, keepSelection: false });
      syncRoute(true);
    } catch (error) {
      clearSession();
      setMessage(dom.authMessage, error.message || "Không thể khôi phục phiên đăng nhập.");
      syncRoute(true);
    }
  }

  function setAuthMode(mode) {
    const authMode = mode === "register" ? "register" : "login";
    dom.loginTab.classList.toggle("active", authMode === "login");
    dom.registerTab.classList.toggle("active", authMode === "register");
    dom.loginForm.classList.toggle("hidden", authMode !== "login");
    dom.registerForm.classList.toggle("hidden", authMode !== "register");
    setMessage(dom.authMessage, "");
  }

  function setLobbyMode(mode) {
    state.lobbyMode = mode === "create" ? "create" : "join";
    dom.showJoinRoom.classList.toggle("active", state.lobbyMode === "join");
    dom.showCreateRoom.classList.toggle("active", state.lobbyMode === "create");
    dom.joinRoomForm.classList.toggle("hidden", state.lobbyMode !== "join");
    dom.createRoomForm.classList.toggle("hidden", state.lobbyMode !== "create");
    setMessage(dom.matchHubMessage, "");
  }

  function setCreateSide(side) {
    state.createSide = side === "b" ? "b" : "w";
    dom.pickRed.classList.toggle("active", state.createSide === "w");
    dom.pickBlack.classList.toggle("active", state.createSide === "b");
  }

  function updateTimeLabel() {
    const minutes = Number(dom.timeRange.value || 10);
    dom.timeRangeValue.textContent = `${minutes} phút`;
  }

  function normalizeRoute(hash) {
    const value = String(hash || location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (["auth", "home", "match", "library", "room", "review"].includes(value)) return value;
    return state.user ? "home" : "auth";
  }

  function goRoute(route, replace = false) {
    const target = `#${route}`;
    if (replace) {
      history.replaceState(null, "", target);
      syncRoute(false);
      return;
    }
    if (location.hash === target) {
      syncRoute(false);
      return;
    }
    location.hash = target;
  }

  function syncRoute(replaceIfNeeded) {
    let route = normalizeRoute(location.hash);
    if (!state.user) route = "auth";
    else if (route === "auth") route = state.room ? "room" : "home";
    else if (route === "room" && !state.room) route = "match";
    else if (route === "review" && !state.reviewGame) route = "home";

    state.route = route;
    if (replaceIfNeeded || location.hash !== `#${route}`) {
      history.replaceState(null, "", `#${route}`);
    }

    dom.authView.classList.toggle("hidden", route !== "auth");
    dom.homeView.classList.toggle("hidden", route !== "home");
    dom.matchHubView.classList.toggle("hidden", route !== "match");
    dom.libraryView.classList.toggle("hidden", route !== "library");
    dom.roomView.classList.toggle("hidden", route !== "room");
    dom.reviewView.classList.toggle("hidden", route !== "review");
    dom.headerProfile.classList.toggle("hidden", !state.user);

    if (route === "room" && state.room) {
      startRoomPolling();
      renderRoomState({ forceBoard: true, keepSelection: true });
    } else {
      stopRoomPolling();
    }

    if (route === "review") {
      renderReviewState(true);
    }

    updateResumeButton();
    renderProfile();
  }

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    if (state.user) {
      goRoute(state.room ? "room" : "home", true);
      return;
    }
    goRoute("auth", true);
  }

  async function onLoginSubmit(event) {
    event.preventDefault();
    setMessage(dom.authMessage, "Đang đăng nhập...", "info");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: {
          account: dom.loginAccount.value.trim(),
          password: dom.loginPassword.value
        }
      });
      applySession(data.user, data.token);
      await afterAuthSuccess("Đăng nhập thành công.");
    } catch (error) {
      setMessage(dom.authMessage, error.message || "Đăng nhập thất bại.");
    }
  }

  async function onRegisterSubmit(event) {
    event.preventDefault();
    setMessage(dom.authMessage, "Đang tạo tài khoản...", "info");
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: {
          email: dom.registerEmail.value.trim(),
          username: dom.registerUsername.value.trim(),
          password: dom.registerPassword.value
        }
      });
      applySession(data.user, data.token);
      await afterAuthSuccess("Đăng ký thành công.");
    } catch (error) {
      setMessage(dom.authMessage, error.message || "Đăng ký thất bại.");
    }
  }

  async function afterAuthSuccess(message) {
    const [historyPayload, currentRoom] = await Promise.all([
      api("/api/history"),
      api("/api/rooms/current")
    ]);
    state.history = normalizeHistoryList(historyPayload.history);
    renderHistory();
    if (currentRoom.room) {
      applyRoomState(currentRoom.room, { forceBoard: true, keepSelection: false });
      goRoute("room", true);
    } else {
      goRoute("home", true);
    }
    showToast(message);
  }

  function applySession(user, token) {
    state.user = user;
    if (token) {
      state.token = token;
      localStorage.setItem(STORAGE_TOKEN, token);
    }
    if (state.room) patchLocalUserIntoRoom();
    renderProfile();
  }

  function patchLocalUserIntoRoom() {
    if (!state.room || !state.user) return;
    ["w", "b"].forEach((side) => {
      if (state.room.players?.[side]?.id === state.user.id) {
        state.room.players[side] = {
          ...state.room.players[side],
          displayName: state.user.displayName,
          username: state.user.username,
          avatarSeed: state.user.avatarSeed,
          avatarUrl: state.user.avatarUrl || ""
        };
      }
    });
    state.room.spectators = (state.room.spectators || []).map((item) => (
      item.id === state.user.id
        ? {
            ...item,
            displayName: state.user.displayName,
            username: state.user.username,
            avatarSeed: state.user.avatarSeed,
            avatarUrl: state.user.avatarUrl || ""
          }
        : item
    ));
  }

  function clearSession() {
    stopRoomPolling();
    state.user = null;
    state.token = "";
    state.history = [];
    state.room = null;
    state.roomKey = "";
    state.reviewGame = null;
    state.reviewCursor = 0;
    state.reviewAnalysis = [];
    state.reviewAnalyzing = false;
    state.reviewBoard = XiangqiCore.parseFenState(START_FEN).board;
    state.reviewContextBoard = XiangqiCore.parseFenState(START_FEN).board;
    state.reviewSideToMove = "w";
    state.selectedSquare = null;
    state.hints = [];
    state.lastBoardFrame = "";
    state.lastPieceFrame = "";
    state.reviewLastBoardFrame = "";
    state.reviewLastPieceFrame = "";
    state.lastChatSignature = "";
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_ROOM);
    closeProfileModal();
    renderHistory();
    renderProfile();
  }

  async function logout() {
    clearSession();
    goRoute("auth", true);
    showToast("Đã đăng xuất.");
  }

  function openProfileModal() {
    if (!state.user) return;
    renderProfile();
    renderHistory();
    dom.profileModal.classList.remove("hidden");
  }

  function closeProfileModal() {
    dom.profileModal.classList.add("hidden");
  }

  async function saveProfile() {
    const displayName = dom.displayNameInput.value.trim();
    const avatarUrl = dom.avatarUrlInput.value.trim();
    setMessage(dom.profileMessage, "Đang lưu...", "info");
    try {
      const data = await api("/api/profile", {
        method: "POST",
        body: { displayName, avatarUrl }
      });
      state.user = data.user;
      patchLocalUserIntoRoom();
      renderProfile();
      if (state.room) renderRoomMeta();
      setMessage(dom.profileMessage, "Đã lưu hồ sơ.", "success");
      showToast("Đã cập nhật hồ sơ.");
    } catch (error) {
      setMessage(dom.profileMessage, error.message || "Không thể lưu hồ sơ.");
    }
  }

  async function refreshHistory() {
    if (!state.token) return;
    try {
      const payload = await api("/api/history");
      state.history = normalizeHistoryList(payload.history);
      renderHistory();
    } catch {}
  }

  function renderProfile() {
    if (!state.user) {
      dom.profileName.textContent = "Kỳ thủ";
      dom.profileUsername.textContent = "@guest";
      paintAvatar(dom.profileAvatar, null, "D");
      paintAvatar(dom.profileAvatarLarge, null, "D");
      dom.displayNameInput.value = "";
      dom.avatarUrlInput.value = "";
      dom.readonlyUsername.value = "";
      return;
    }

    dom.profileName.textContent = state.user.displayName || state.user.username;
    dom.profileUsername.textContent = `@${state.user.username}`;
    dom.displayNameInput.value = state.user.displayName || "";
    dom.avatarUrlInput.value = state.user.avatarUrl || "";
    dom.readonlyUsername.value = state.user.username || "";
    paintAvatar(dom.profileAvatar, state.user);
    paintAvatar(dom.profileAvatarLarge, state.user);
  }

  function renderHistory() {
    dom.historyList.innerHTML = "";
    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "Chưa có ván nào được lưu.";
      dom.historyList.appendChild(empty);
      return;
    }

    state.history.slice(0, 20).forEach((entry) => {
      const item = document.createElement("article");
      item.className = "history-item";
      item.tabIndex = 0;
      const header = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = `${entry.side || "Đỏ"} vs ${entry.opponent || "Đối thủ"}`;
      const pill = document.createElement("span");
      const resultText = String(entry.result || "");
      pill.className = `result-pill ${
        resultText === "Thắng" ? "win" : resultText === "Thua" ? "loss" : "draw"
      }`;
      pill.textContent = resultText || "Hòa";
      header.append(title, pill);

      const detail = document.createElement("div");
      detail.style.color = "var(--muted)";
      detail.style.fontSize = "13px";
      const timeLabel = entry.startedAt ? formatDate(entry.startedAt) : formatDate(entry.endedAt);
      detail.textContent = `${entry.reason || "Kết thúc"} • ${timeLabel}`;

      const moves = document.createElement("div");
      moves.style.marginTop = "8px";
      moves.style.fontSize = "13px";
      moves.textContent = Array.isArray(entry.moves) && entry.moves.length ? entry.moves.slice(0, 4).join(" • ") : "Không có biên bản.";

      item.append(header, detail, moves);
      item.addEventListener("click", () => openHistoryReview(entry));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openHistoryReview(entry);
        }
      });
      dom.historyList.appendChild(item);
    });
  }

  function openHistoryReview(entry) {
    const reviewEntry = normalizeHistoryEntry(entry);
    if (!reviewEntry.plies.length) {
      showToast("Ván này chưa có đủ dữ liệu để xem lại.");
      return;
    }
    state.reviewGame = reviewEntry;
    state.reviewCursor = 0;
    state.reviewAnalysis = [];
    state.reviewAnalyzing = false;
    state.reviewLastBoardFrame = "";
    state.reviewLastPieceFrame = "";
    rebuildReviewBoard();
    closeProfileModal();
    goRoute("review");
  }

  function normalizeHistoryEntry(entry) {
    return {
      ...entry,
      startFen: entry?.startFen || START_FEN,
      sideCode: entry?.sideCode === "b" ? "b" : "w",
      plies: Array.isArray(entry?.plies)
        ? entry.plies.filter((item) => /^[a-i][0-9][a-i][0-9]$/.test(String(item?.move || "")))
        : []
    };
  }

  function normalizeHistoryList(history) {
    return Array.isArray(history) ? history.map(normalizeHistoryEntry).slice(0, 20) : [];
  }

  function rebuildReviewBoard() {
    if (!state.reviewGame) {
      const parsedStart = XiangqiCore.parseFenState(START_FEN);
      state.reviewBoard = parsedStart.board;
      state.reviewContextBoard = parsedStart.board.map((row) => row.slice());
      state.reviewSideToMove = "w";
      return;
    }

    const parsed = XiangqiCore.parseFenState(state.reviewGame.startFen || START_FEN);
    const board = parsed.board;
    let side = parsed.side;
    let contextBoard = board.map((row) => row.slice());
    const limit = Math.max(0, Math.min(state.reviewCursor, state.reviewGame.plies.length));
    for (let index = 0; index < limit; index += 1) {
      const ply = state.reviewGame.plies[index];
      if (index === limit - 1) {
        contextBoard = board.map((row) => row.slice());
      }
      if (!XiangqiCore.isLegalMove(board, ply.move, side)) break;
      XiangqiCore.applyMoveToBoard(board, ply.move);
      side = oppositeSide(side);
    }
    state.reviewBoard = board;
    state.reviewContextBoard = contextBoard;
    state.reviewSideToMove = side;
  }

  function setReviewCursor(cursor) {
    if (!state.reviewGame) return;
    const clamped = Math.max(0, Math.min(state.reviewGame.plies.length, cursor));
    if (clamped === state.reviewCursor && state.route === "review") return;
    state.reviewCursor = clamped;
    rebuildReviewBoard();
    renderReviewState(true);
  }

  function stepReview(delta) {
    if (!state.reviewGame) return;
    setReviewCursor(state.reviewCursor + delta);
  }

  async function analyzeReviewGame() {
    if (!state.reviewGame || state.reviewAnalyzing) return;
    state.reviewAnalyzing = true;
    renderReviewState(false);
    try {
      const payload = await api("/api/history/analyze", {
        method: "POST",
        body: {
          startFen: state.reviewGame.startFen || START_FEN,
          plies: state.reviewGame.plies,
          depth: 8,
          movetime: 180
        }
      });
      state.reviewAnalysis = Array.isArray(payload.items) ? payload.items : [];
      renderReviewState(true);
      showToast("Pikafish đã phân tích xong ván cờ.");
    } catch (error) {
      showToast(error.message || "Không thể phân tích ván cờ này.");
    } finally {
      state.reviewAnalyzing = false;
      renderReviewState(true);
    }
  }

  function renderReviewState(forceBoard = false) {
    renderReviewMeta();
    renderReviewMoveList();
    drawReviewScene(forceBoard);
  }

  function renderReviewMeta() {
    const game = state.reviewGame;
    if (!game) {
      dom.reviewTitle.textContent = "Xem lại ván đấu";
      dom.reviewMeta.textContent = "Chọn một ván trong lịch sử để tua lại.";
      dom.reviewResultBadge.textContent = "Lịch sử";
      dom.reviewMoveMeta.textContent = "Mỗi nước sẽ được gắn nhãn sau khi Pikafish quét toàn ván.";
      dom.reviewInsight.textContent = "Tua lại từng nước để xem diễn biến của ván cờ.";
      dom.reviewPrevBtn.disabled = true;
      dom.reviewNextBtn.disabled = true;
      dom.reviewAnalyzeBtn.disabled = true;
      dom.reviewMoveList.innerHTML = "";
      return;
    }

    dom.reviewTitle.textContent = `${game.side || "Đỏ"} vs ${game.opponent || "Đối thủ"}`;
    dom.reviewMeta.textContent = `Bắt đầu: ${formatDate(game.startedAt || game.endedAt)} • Kết thúc: ${formatDate(game.endedAt)}`;
    dom.reviewResultBadge.textContent = game.result || "Lịch sử";
    dom.reviewMoveMeta.textContent = state.reviewAnalysis.length
      ? "Bấm vào từng nước để xem nhãn chất lượng và gợi ý tốt hơn của Pikafish."
      : "Mỗi nước sẽ được gắn nhãn sau khi Pikafish quét toàn ván.";
    dom.reviewPrevBtn.disabled = state.reviewCursor <= 0 || state.reviewAnalyzing;
    dom.reviewNextBtn.disabled = state.reviewCursor >= game.plies.length || state.reviewAnalyzing;
    dom.reviewAnalyzeBtn.disabled = state.reviewAnalyzing;
    dom.reviewAnalyzeBtn.textContent = state.reviewAnalyzing
      ? "Đang phân tích..."
      : state.reviewAnalysis.length
        ? "Phân tích lại"
        : "Phân tích";

    const currentIndex = state.reviewCursor - 1;
    if (currentIndex < 0) {
      dom.reviewInsight.innerHTML = "<strong>Bắt đầu ván cờ</strong><div>Hãy bấm Làm lại để đi từng nước, hoặc bấm Phân tích để Pikafish quét toàn bộ ván.</div>";
      return;
    }

    const currentPly = game.plies[currentIndex];
    const analysis = state.reviewAnalysis[currentIndex] || null;
    const moveTitle = currentPly?.notation || currentPly?.move || `Nước ${currentIndex + 1}`;
    if (!analysis) {
      dom.reviewInsight.innerHTML = `<strong>Nước ${currentIndex + 1}: ${moveTitle}</strong><div>Ván đang ở sau nước này. Bấm Phân tích để xem chất lượng và nước đề xuất.</div>`;
      return;
    }

    const recommendText = analysis.grade === "brilliant"
      ? "Nước đi này gần như trùng khớp với phương án mạnh nhất của Pikafish."
      : `Pikafish đề xuất: ${analysis.bestNotation || analysis.bestMove || "không rõ"}.`;
    dom.reviewInsight.innerHTML = `<strong>Nước ${currentIndex + 1}: ${moveTitle} · ${analysis.gradeLabel}</strong><div>${recommendText}</div>`;
  }

  function renderReviewMoveList() {
    dom.reviewMoveList.innerHTML = "";
    const plies = Array.isArray(state.reviewGame?.plies) ? state.reviewGame.plies : [];
    if (!plies.length) {
      const item = document.createElement("li");
      item.innerHTML = '<span class="move-number">-</span><span class="move-cell red">Chưa có dữ liệu</span><span class="move-cell black"></span>';
      dom.reviewMoveList.appendChild(item);
      return;
    }

    for (let index = 0; index < plies.length; index += 2) {
      const row = document.createElement("li");
      if (state.reviewCursor - 1 === index || state.reviewCursor - 1 === index + 1) {
        row.classList.add("active");
      }
      const number = document.createElement("span");
      number.className = "move-number";
      number.textContent = `${Math.floor(index / 2) + 1}.`;
      row.appendChild(number);
      row.appendChild(buildReviewMoveCell(plies[index], index));
      row.appendChild(buildReviewMoveCell(plies[index + 1], index + 1));
      dom.reviewMoveList.appendChild(row);
    }
  }

  function buildReviewMoveCell(ply, index) {
    const cell = document.createElement("span");
    cell.className = `move-cell ${index % 2 === 0 ? "red" : "black"}`;
    if (!ply) return cell;

    const button = document.createElement("button");
    button.type = "button";
    button.className = `review-move-button ${state.reviewCursor - 1 === index ? "active" : ""}`;
    button.addEventListener("click", () => setReviewCursor(index + 1));

    const text = document.createElement("span");
    text.className = "review-move-text";
    text.textContent = ply.notation || ply.move;
    button.appendChild(text);

    const analysis = state.reviewAnalysis[index];
    if (analysis) {
      const badge = document.createElement("span");
      badge.className = `review-grade ${analysis.grade}`;
      badge.textContent = analysis.gradeLabel;
      button.appendChild(badge);
    }

    cell.appendChild(button);
    return cell;
  }

  async function onCreateRoom(event) {
    event.preventDefault();
    setMessage(dom.matchHubMessage, "Đang tạo phòng...", "info");
    try {
      const payload = await api("/api/rooms/create", {
        method: "POST",
        body: {
          minutes: Number(dom.timeRange.value || 10),
          side: state.createSide
        }
      });
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
      goRoute("room");
      setMessage(dom.matchHubMessage, "");
      showToast("Đã tạo phòng đấu.");
    } catch (error) {
      setMessage(dom.matchHubMessage, error.message || "Không thể tạo phòng.");
    }
  }

  async function onJoinRoom(event) {
    event.preventDefault();
    const key = dom.joinRoomKey.value.trim().toUpperCase();
    setMessage(dom.matchHubMessage, "Đang vào phòng...", "info");
    try {
      const payload = await api("/api/rooms/join", {
        method: "POST",
        body: { key }
      });
      dom.joinRoomKey.value = "";
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
      goRoute("room");
      setMessage(dom.matchHubMessage, "");
      showToast(payload.room.role === "spectator" ? "Đã vào phòng với vai trò người xem." : "Đã vào phòng đấu.");
    } catch (error) {
      setMessage(dom.matchHubMessage, error.message || "Không thể vào phòng.");
    }
  }

  async function resumeStoredRoom() {
    const key = state.room?.key || state.roomKey || localStorage.getItem(STORAGE_ROOM) || "";
    if (!key || !state.token) {
      updateResumeButton();
      return;
    }
    try {
      const payload = await api(`/api/rooms/state?key=${encodeURIComponent(key)}`);
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
      goRoute("room");
    } catch (error) {
      if (/ROOM_NOT_FOUND|Không tìm thấy phòng/i.test(error.message || "")) {
        state.room = null;
        state.roomKey = "";
        localStorage.removeItem(STORAGE_ROOM);
        updateResumeButton();
      } else {
        setMessage(dom.matchHubMessage, error.message || "Không thể khôi phục phòng.");
      }
    }
  }

  function applyRoomState(room, { forceBoard = false, keepSelection = false } = {}) {
    const previous = state.room;
    const wasFinished = Boolean(previous?.result);
    const isFinished = Boolean(room?.result);

    state.room = room || null;
    if (!room) {
      state.roomKey = "";
      localStorage.removeItem(STORAGE_ROOM);
      state.selectedSquare = null;
      state.hints = [];
      state.roomBoard = XiangqiCore.parseFenState(START_FEN).board;
      renderRoomState({ forceBoard: true, keepSelection: false });
      updateResumeButton();
      return;
    }

    state.roomKey = room.key;
    state.roomSyncedAt = Date.now();
    localStorage.setItem(STORAGE_ROOM, room.key);
    state.roomBoard = XiangqiCore.parseFenState(room.boardFen || START_FEN).board;

    if (!keepSelection || previous?.boardFen !== room.boardFen || previous?.role !== room.role) {
      state.selectedSquare = null;
      state.hints = [];
    }

    updateResumeButton();
    renderRoomState({ forceBoard, keepSelection });

    if (!wasFinished && isFinished) {
      void refreshHistory();
    }
  }

  function updateResumeButton() {
    const key = state.room?.key || state.roomKey || localStorage.getItem(STORAGE_ROOM) || "";
    const hiddenOnHome = state.route === "home" || state.route === "auth";
    dom.resumeRoomBtn.classList.toggle("hidden", !key || !state.user || hiddenOnHome);
    if (key) dom.resumeRoomBtn.textContent = `Phòng ${key}`;
  }

  function renderRoomState({ forceBoard = false } = {}) {
    renderRoomMeta();
    renderRequestState();
    renderResultState();
    renderViewerList();
    renderChat();
    renderMoveList();
    drawRoomScene(forceBoard);
  }

  function renderRoomMeta() {
    const room = state.room;
    if (!room) {
      dom.roomKeyLabel.textContent = "------";
      dom.roomStatusBadge.textContent = "Chưa vào phòng";
      dom.roomSummary.textContent = "Phòng đang được chuẩn bị.";
      dom.undoCount.textContent = "0";
      dom.drawCount.textContent = "0";
      paintAvatar(dom.topPlayerAvatar, null, "?");
      paintAvatar(dom.bottomPlayerAvatar, null, "?");
      dom.topPlayerName.textContent = "Đang chờ đối thủ";
      dom.bottomPlayerName.textContent = "Bạn";
      dom.topSideLabel.textContent = "Đen";
      dom.bottomSideLabel.textContent = "Đỏ";
      renderRoomClocks();
      return;
    }

    const bottomSide = room.role === "player" ? room.yourSide : "w";
    const topSide = oppositeSide(bottomSide);
    const topPlayer = room.players?.[topSide] || null;
    const bottomPlayer = room.players?.[bottomSide] || null;

    dom.roomKeyLabel.textContent = room.key;
    dom.roomStatusBadge.textContent = roomStatusText(room);
    dom.roomSummary.textContent = roomSummaryText(room);
    dom.undoCount.textContent = String(room.allowances?.undoRemaining ?? 0);
    dom.drawCount.textContent = String(room.allowances?.drawRemaining ?? 0);

    dom.topSideLabel.textContent = topSide === "w" ? "Đỏ" : "Đen";
    dom.topSideLabel.classList.toggle("side-red", topSide === "w");
    dom.bottomSideLabel.textContent = bottomSide === "w" ? "Đỏ" : "Đen";
    dom.bottomSideLabel.classList.toggle("side-red", bottomSide === "w");

    paintAvatar(dom.topPlayerAvatar, topPlayer, topSide === "w" ? "Đ" : "B");
    paintAvatar(dom.bottomPlayerAvatar, bottomPlayer || state.user, bottomSide === "w" ? "Đ" : "B");
    dom.topPlayerName.textContent = topPlayer ? topPlayer.displayName || topPlayer.username : "Đang chờ đối thủ";
    dom.bottomPlayerName.textContent = bottomPlayer ? bottomPlayer.displayName || bottomPlayer.username : "Đang chờ người chơi";

    const canAct = room.role === "player" && room.status === "active" && !state.roomActionBusy;
    dom.undoRequestBtn.disabled = !canAct || Number(room.allowances?.undoRemaining || 0) <= 0 || Boolean(room.pendingRequest);
    dom.drawRequestBtn.disabled = !canAct || Number(room.allowances?.drawRemaining || 0) <= 0 || Boolean(room.pendingRequest);
    dom.resignBtn.disabled = !canAct;

    renderRoomClocks();
  }

  function renderRequestState() {
    const room = state.room;
    dom.requestState.innerHTML = "";
    if (!room) return;

    if (room.waitingForOpponent) {
      dom.requestState.appendChild(makeNotice("Đang chờ đối thủ", "Bàn cờ đã sẵn sàng. Khi đối thủ nhập đúng Key, ván đấu sẽ tự bắt đầu."));
      return;
    }

    if (room.role === "spectator") {
      if (room.pendingRequest) {
        dom.requestState.appendChild(makeNotice(
          room.pendingRequest.type === "undo" ? "Người chơi đang xin đi lại" : "Người chơi đang cầu hòa",
          "Bạn đang ở chế độ người xem nên chỉ có thể quan sát và chat."
        ));
      } else {
        dom.requestState.appendChild(makeNotice("Chế độ người xem", "Bạn đang theo dõi ván cờ. Hãy dùng khung chat để trò chuyện."));
      }
      return;
    }

    if (room.pendingRequest?.fromYou) {
      dom.requestState.appendChild(makeNotice("Đang chờ đối thủ xác nhận...", room.pendingRequest.type === "undo" ? "Yêu cầu đi lại đã được gửi." : "Yêu cầu hòa đã được gửi."));
      return;
    }

    if (room.pendingRequest?.toYou) {
      const notice = makeNotice(
        room.pendingRequest.type === "undo" ? "Đối thủ yêu cầu đi lại" : "Đối thủ yêu cầu hòa",
        room.pendingRequest.type === "undo" ? "Nếu đồng ý, nước cờ gần nhất sẽ được thực hiện lại." : "Nếu đồng ý, ván cờ sẽ được xử hòa."
      );
      const actions = document.createElement("div");
      actions.className = "notice-actions";
      const accept = document.createElement("button");
      accept.className = "primary-button";
      accept.type = "button";
      accept.textContent = "Đồng ý";
      accept.addEventListener("click", () => respondRequest(true));
      const decline = document.createElement("button");
      decline.className = "secondary-button";
      decline.type = "button";
      decline.textContent = "Không";
      decline.addEventListener("click", () => respondRequest(false));
      actions.append(accept, decline);
      notice.appendChild(actions);
      dom.requestState.appendChild(notice);
      return;
    }

    dom.requestState.appendChild(makeNotice(
      room.yourTurn ? "Đến lượt bạn" : "Đến lượt đối thủ",
      room.yourTurn ? "Bạn chỉ có thể đi quân thuộc bên mình." : "Đồng hồ bên đối thủ đang chạy."
    ));
  }

  function renderResultState() {
    const room = state.room;
    dom.resultState.innerHTML = "";
    dom.resultState.classList.toggle("hidden", !room?.result);
    if (!room?.result) return;

    const notice = makeNotice(resultTitle(room), resultDetail(room));
    if (room.role === "player") {
      const ready = document.createElement("button");
      ready.className = room.rematchReady?.you ? "primary-button" : "secondary-button";
      ready.type = "button";
      ready.textContent = room.rematchReady?.you ? "Đã sẵn sàng ván mới" : "Sẵn sàng ván mới";
      ready.disabled = state.roomActionBusy;
      ready.addEventListener("click", toggleRematch);
      notice.appendChild(ready);
      if (room.rematchReady?.opponent) {
        const detail = document.createElement("div");
        detail.style.marginTop = "8px";
        detail.style.color = "var(--muted)";
        detail.textContent = "Đối thủ đã sẵn sàng.";
        notice.appendChild(detail);
      }
    }
    dom.resultState.appendChild(notice);
  }

  function renderViewerList() {
    const room = state.room;
    dom.viewerList.innerHTML = "";
    if (!room) return;

    const viewers = Array.isArray(room.spectators) ? room.spectators : [];
    dom.viewerSummary.textContent = viewers.length ? `${viewers.length} người đang xem` : "Chưa có người xem.";
    if (!viewers.length) {
      const empty = document.createElement("div");
      empty.className = "viewer-empty";
      empty.textContent = "Hiện chưa có người xem nào trong phòng.";
      dom.viewerList.appendChild(empty);
      return;
    }

    viewers.forEach((viewer) => {
      const item = document.createElement("div");
      item.className = "viewer-item";
      const avatar = document.createElement("span");
      avatar.className = "avatar";
      paintAvatar(avatar, viewer, "X");
      const meta = document.createElement("div");
      meta.className = "viewer-meta";
      const name = document.createElement("strong");
      name.textContent = viewer.displayName || viewer.username;
      const sub = document.createElement("small");
      sub.textContent = `@${viewer.username}`;
      meta.append(name, sub);
      item.append(avatar, meta);
      dom.viewerList.appendChild(item);
    });
  }

  function renderChat() {
    const room = state.room;
    dom.chatList.innerHTML = "";
    if (!room) return;

    const messages = Array.isArray(room.chat) ? room.chat : [];
    const signature = messages.map((entry) => `${entry.id}:${entry.createdAt}`).join("|");
    const previousSignature = state.lastChatSignature;
    if (!messages.length) {
      const empty = document.createElement("div");
      empty.className = "chat-empty";
      empty.textContent = "Chưa có tin nhắn nào.";
      dom.chatList.appendChild(empty);
      state.lastChatSignature = signature;
      return;
    }

    const shouldStick = Math.abs(dom.chatList.scrollHeight - dom.chatList.scrollTop - dom.chatList.clientHeight) < 20;
    messages.forEach((entry) => {
      const item = document.createElement("div");
      item.className = `chat-item ${entry.userId === state.user?.id ? "mine" : ""}`;
      const avatar = document.createElement("span");
      avatar.className = "avatar";
      paintAvatar(avatar, entry, "C");

      const body = document.createElement("div");
      body.style.minWidth = "0";
      const meta = document.createElement("div");
      meta.className = "chat-meta";
      const name = document.createElement("strong");
      name.textContent = entry.displayName || entry.username;
      const time = document.createElement("small");
      time.textContent = formatTime(entry.createdAt);
      meta.append(name, time);
      const text = document.createElement("div");
      text.className = "chat-text";
      text.textContent = entry.text;
      body.append(meta, text);
      item.append(avatar, body);
      dom.chatList.appendChild(item);
    });
    state.lastChatSignature = signature;
    if (shouldStick || signature !== previousSignature) {
      dom.chatList.scrollTop = dom.chatList.scrollHeight;
    }
  }

  function renderMoveList() {
    dom.roomMoveList.innerHTML = "";
    const moves = Array.isArray(state.room?.moves) ? state.room.moves : [];
    if (!moves.length) {
      const item = document.createElement("li");
      item.innerHTML = '<span class="move-number">-</span><span class="move-cell red">Chưa có nước nào</span><span class="move-cell black"></span>';
      dom.roomMoveList.appendChild(item);
      return;
    }

    for (let index = 0; index < moves.length; index += 2) {
      const row = document.createElement("li");
      const number = document.createElement("span");
      number.className = "move-number";
      number.textContent = `${Math.floor(index / 2) + 1}.`;
      const red = document.createElement("span");
      red.className = "move-cell red";
      red.textContent = moves[index]?.notation || "";
      const black = document.createElement("span");
      black.className = "move-cell black";
      black.textContent = moves[index + 1]?.notation || "";
      row.append(number, red, black);
      dom.roomMoveList.appendChild(row);
    }
  }

  function drawRoomScene(forceBoard) {
    drawRoomBoard(forceBoard);
    drawRoomPieces(forceBoard);
  }

  function drawReviewScene(forceBoard) {
    drawReviewBoard(forceBoard);
    drawReviewPieces(forceBoard);
    drawReviewArrow();
  }

  function drawRoomBoard(force) {
    if (dom.roomView.classList.contains("hidden")) return;
    const rect = dom.roomBoard.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    state.lastBoardSizeKey = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    const signature = `${Math.round(rect.width)}x${Math.round(rect.height)}|${viewSide()}`;
    if (!force && signature === state.lastBoardFrame) return;
    state.lastBoardFrame = signature;

    const canvas = dom.roomBoardCanvas;
    canvas.width = Math.round(rect.width * devicePixelRatio);
    canvas.height = Math.round(rect.height * devicePixelRatio);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const g = geometry();
    ctx.strokeStyle = "rgba(65, 62, 47, 0.62)";
    ctx.lineWidth = Math.max(1.5, rect.width / 420);

    for (let x = 0; x < 9; x += 1) {
      line(ctx, g.x(x), g.y(0), g.x(x), g.y(4));
      line(ctx, g.x(x), g.y(5), g.x(x), g.y(9));
    }
    for (let y = 0; y < 10; y += 1) {
      line(ctx, g.x(0), g.y(y), g.x(8), g.y(y));
    }
    line(ctx, g.x(3), g.y(0), g.x(5), g.y(2));
    line(ctx, g.x(5), g.y(0), g.x(3), g.y(2));
    line(ctx, g.x(3), g.y(7), g.x(5), g.y(9));
    line(ctx, g.x(5), g.y(7), g.x(3), g.y(9));
    ctx.font = `${Math.max(18, rect.width / 24)}px "Segoe UI"`;
    ctx.fillStyle = "rgba(38, 39, 33, 0.82)";
    ctx.textAlign = "center";
    ctx.fillText("楚河", g.x(2.2), (g.y(4) + g.y(5)) / 2 + 8);
    ctx.fillText("漢界", g.x(5.8), (g.y(4) + g.y(5)) / 2 + 8);
  }

  function drawRoomPieces(force) {
    if (dom.roomView.classList.contains("hidden")) return;
    const board = state.roomBoard;
    const checkedSides = getCheckedSides(board);
    const selectionKey = state.selectedSquare ? XiangqiCore.squareToUci(state.selectedSquare) : "";
    const hintKey = state.hints.map(XiangqiCore.squareToUci).join(",");
    const signature = `${state.room?.boardFen || START_FEN}|${viewSide()}|${selectionKey}|${hintKey}|${checkedSides.w ? "1" : "0"}${checkedSides.b ? "1" : "0"}`;
    if (!force && signature === state.lastPieceFrame) return;
    state.lastPieceFrame = signature;
    const pieceFragment = document.createDocumentFragment();
    const markFragment = document.createDocumentFragment();

    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const piece = board[y]?.[x] || "";
        if (!piece) continue;
        const pixel = squareToPixel({ x, y });
        const el = document.createElement("div");
        el.className = "piece image-piece";
        if (state.selectedSquare && state.selectedSquare.x === x && state.selectedSquare.y === y) {
          el.classList.add("selected");
        }
        if (piece.toLowerCase() === "k" && checkedSides[XiangqiCore.pieceColor(piece)]) {
          el.classList.add("in-check");
        }
        el.style.left = `${pixel.x}px`;
        el.style.top = `${pixel.y}px`;
        el.style.setProperty("--piece-image", `url("${PIECE_IMAGES[piece]}")`);
        pieceFragment.appendChild(el);
      }
    }

    state.hints.forEach((square) => {
      const pixel = squareToPixel(square);
      const mark = document.createElement("div");
      mark.className = "hint";
      mark.style.left = `${pixel.x}px`;
      mark.style.top = `${pixel.y}px`;
      markFragment.appendChild(mark);
    });

    dom.roomPieces.replaceChildren(pieceFragment);
    dom.roomMarks.replaceChildren(markFragment);
  }

  function drawReviewBoard(force) {
    if (dom.reviewView.classList.contains("hidden")) return;
    const rect = dom.reviewBoard.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const signature = `${Math.round(rect.width)}x${Math.round(rect.height)}|${reviewViewSide()}`;
    if (!force && signature === state.reviewLastBoardFrame) return;
    state.reviewLastBoardFrame = signature;

    const canvas = dom.reviewBoardCanvas;
    const arrowCanvas = dom.reviewArrowCanvas;
    for (const item of [canvas, arrowCanvas]) {
      item.width = Math.round(rect.width * devicePixelRatio);
      item.height = Math.round(rect.height * devicePixelRatio);
      item.style.width = `${rect.width}px`;
      item.style.height = `${rect.height}px`;
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const g = reviewGeometry();
    ctx.strokeStyle = "rgba(65, 62, 47, 0.62)";
    ctx.lineWidth = Math.max(1.5, rect.width / 420);

    for (let x = 0; x < 9; x += 1) {
      line(ctx, g.x(x), g.y(0), g.x(x), g.y(4));
      line(ctx, g.x(x), g.y(5), g.x(x), g.y(9));
    }
    for (let y = 0; y < 10; y += 1) {
      line(ctx, g.x(0), g.y(y), g.x(8), g.y(y));
    }
    line(ctx, g.x(3), g.y(0), g.x(5), g.y(2));
    line(ctx, g.x(5), g.y(0), g.x(3), g.y(2));
    line(ctx, g.x(3), g.y(7), g.x(5), g.y(9));
    line(ctx, g.x(5), g.y(7), g.x(3), g.y(9));
    ctx.font = `${Math.max(18, rect.width / 24)}px "Segoe UI"`;
    ctx.fillStyle = "rgba(38, 39, 33, 0.82)";
    ctx.textAlign = "center";
    ctx.fillText("楚河", g.x(2.2), (g.y(4) + g.y(5)) / 2 + 8);
    ctx.fillText("漢界", g.x(5.8), (g.y(4) + g.y(5)) / 2 + 8);
  }

  function drawReviewPieces(force) {
    if (dom.reviewView.classList.contains("hidden")) return;
    const board = state.reviewBoard;
    const checkedSides = getCheckedSides(board);
    const currentIndex = state.reviewCursor - 1;
    const currentAnalysis = currentIndex >= 0 ? state.reviewAnalysis[currentIndex] : null;
    const currentPly = currentIndex >= 0 ? state.reviewGame?.plies?.[currentIndex] : null;
    const signature = `${boardSignature(board)}|${reviewViewSide()}|${currentIndex}|${currentAnalysis?.grade || ""}|${currentPly?.move || ""}|${checkedSides.w ? "1" : "0"}${checkedSides.b ? "1" : "0"}`;
    if (!force && signature === state.reviewLastPieceFrame) return;
    state.reviewLastPieceFrame = signature;

    const fragment = document.createDocumentFragment();
    let starSquare = null;
    if (currentAnalysis?.grade === "brilliant" && currentPly?.move) {
      starSquare = uciToSquare(currentPly.move.slice(2, 4));
    }

    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const piece = board[y]?.[x] || "";
        if (!piece) continue;
        const pixel = reviewSquareToPixel({ x, y });
        const el = document.createElement("div");
        el.className = "piece image-piece";
        if (piece.toLowerCase() === "k" && checkedSides[XiangqiCore.pieceColor(piece)]) {
          el.classList.add("in-check");
        }
        if (starSquare && starSquare.x === x && starSquare.y === y) {
          el.classList.add("review-star");
        }
        el.style.left = `${pixel.x}px`;
        el.style.top = `${pixel.y}px`;
        el.style.setProperty("--piece-image", `url("${PIECE_IMAGES[piece]}")`);
        fragment.appendChild(el);
      }
    }

    dom.reviewPieces.replaceChildren(fragment);
  }

  function drawReviewArrow() {
    clearReviewArrow();
    const currentIndex = state.reviewCursor - 1;
    if (currentIndex < 0) return;
    const analysis = state.reviewAnalysis[currentIndex];
    if (!analysis || analysis.grade === "brilliant" || !/^[a-i][0-9][a-i][0-9]$/.test(analysis.bestMove || "")) return;

    const canvas = dom.reviewArrowCanvas;
    const ctx = canvas.getContext("2d");
    const rect = dom.reviewBoard.getBoundingClientRect();
    const from = reviewSquareToPixel(uciToSquare(analysis.bestMove.slice(0, 2)));
    const toSquare = uciToSquare(analysis.bestMove.slice(2, 4));
    const to = reviewSquareToPixel(toSquare);
    const contextBoard = state.reviewContextBoard || state.reviewBoard;
    const pieceRatio = Number.parseFloat(getComputedStyle(dom.reviewBoard).getPropertyValue("--piece-size")) / 100 || 0.086;
    const isMobileBoard = rect.width <= 460;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.strokeStyle = "rgba(23, 126, 137, 0.88)";
    ctx.fillStyle = "rgba(23, 126, 137, 0.88)";
    ctx.lineWidth = isMobileBoard ? Math.max(7, rect.width * pieceRatio * 0.18) : Math.max(11, rect.width / 66);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
    const capturesPiece = Boolean(contextBoard[toSquare.y]?.[toSquare.x]);
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

  function clearReviewArrow() {
    const rect = dom.reviewBoard.getBoundingClientRect();
    const ctx = dom.reviewArrowCanvas.getContext("2d");
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  function onBoardPointerDown(event) {
    const room = state.room;
    if (!room || room.role !== "player" || room.status !== "active" || !room.yourTurn || state.roomActionBusy) return;
    event.preventDefault();
    const square = eventToSquare(event);
    if (!square) return;

    const piece = state.roomBoard[square.y]?.[square.x] || "";
    const side = room.yourSide;

    if (state.selectedSquare && state.selectedSquare.x === square.x && state.selectedSquare.y === square.y) {
      clearSelection();
      return;
    }

    if (state.selectedSquare) {
      const valid = state.hints.some((hint) => hint.x === square.x && hint.y === square.y);
      if (valid) {
        const move = XiangqiCore.squareToUci(state.selectedSquare) + XiangqiCore.squareToUci(square);
        void sendMove(move);
        return;
      }
    }

    if (piece && XiangqiCore.pieceColor(piece) === side) {
      state.selectedSquare = square;
      state.hints = XiangqiCore.getLegalMovesForSquare(state.roomBoard, side, square);
    } else {
      clearSelection();
      return;
    }

    drawRoomPieces(true);
  }

  function clearSelection() {
    state.selectedSquare = null;
    state.hints = [];
    drawRoomPieces(true);
  }

  async function sendMove(move) {
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      const payload = await api("/api/rooms/move", {
        method: "POST",
        body: { key: state.room.key, move }
      });
      state.selectedSquare = null;
      state.hints = [];
      state.roomActionBusy = false;
      applyRoomState(payload.room, { forceBoard: false, keepSelection: false });
    } catch (error) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(error.message || "Không thể đi nước này.");
    }
  }

  async function requestRoomAction(type) {
    if (!state.room || state.roomActionBusy) return;
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      const payload = await api("/api/rooms/request", {
        method: "POST",
        body: { key: state.room.key, type }
      });
      state.roomActionBusy = false;
      applyRoomState(payload.room, { forceBoard: false, keepSelection: true });
      showToast(type === "undo" ? "Đã gửi yêu cầu đi lại." : "Đã gửi yêu cầu hòa.");
    } catch (error) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(error.message || "Không thể gửi yêu cầu.");
    }
  }

  async function respondRequest(accept) {
    if (!state.room || state.roomActionBusy) return;
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      const payload = await api("/api/rooms/respond", {
        method: "POST",
        body: { key: state.room.key, accept }
      });
      state.roomActionBusy = false;
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
      showToast(accept ? "Đã xác nhận yêu cầu." : "Đã từ chối yêu cầu.");
    } catch (error) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(error.message || "Không thể xử lý yêu cầu.");
    }
  }

  function confirmResign() {
    openModal({
      title: "Bạn chắc chắn chịu thua chứ?",
      text: "Nếu đồng ý, ván cờ sẽ kết thúc ngay và máy sẽ xử thua cho bạn.",
      confirmText: "Đồng ý",
      onConfirm: resignGame
    });
  }

  async function resignGame() {
    if (!state.room || state.roomActionBusy) return;
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      const payload = await api("/api/rooms/resign", {
        method: "POST",
        body: { key: state.room.key }
      });
      state.roomActionBusy = false;
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
    } catch (error) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(error.message || "Không thể xin thua.");
    }
  }

  async function toggleRematch() {
    if (!state.room || state.roomActionBusy) return;
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      const payload = await api("/api/rooms/rematch", {
        method: "POST",
        body: { key: state.room.key, ready: !state.room.rematchReady?.you }
      });
      state.roomActionBusy = false;
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
      showToast(payload.room.status === "active" ? "Ván mới đã bắt đầu." : "Đã cập nhật trạng thái sẵn sàng.");
    } catch (error) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(error.message || "Không thể đổi trạng thái sẵn sàng.");
    }
  }

  async function onChatSubmit(event) {
    event.preventDefault();
    const text = dom.chatInput.value.trim();
    if (!text || !state.room) return;
    try {
      const payload = await api("/api/rooms/chat", {
        method: "POST",
        body: { key: state.room.key, text }
      });
      dom.chatInput.value = "";
      applyRoomState(payload.room, { forceBoard: false, keepSelection: true });
    } catch (error) {
      showToast(error.message || "Không thể gửi tin nhắn.");
    }
  }

  function startRoomPolling() {
    if (state.roomPollTimer) return;
    state.roomPollTimer = window.setInterval(() => {
      void pollRoomState();
    }, 1200);
    state.roomClockTimer = window.setInterval(renderRoomClocks, 250);
    void pollRoomState();
  }

  function stopRoomPolling() {
    if (state.roomPollTimer) clearInterval(state.roomPollTimer);
    if (state.roomClockTimer) clearInterval(state.roomClockTimer);
    state.roomPollTimer = null;
    state.roomClockTimer = null;
  }

  async function pollRoomState() {
    if (!state.roomKey || !state.token || state.roomPollBusy || state.route !== "room") return;
    state.roomPollBusy = true;
    try {
      const payload = await api(`/api/rooms/state?key=${encodeURIComponent(state.roomKey)}`);
      applyRoomState(payload.room, { forceBoard: false, keepSelection: true });
    } catch (error) {
      if (/ROOM_NOT_FOUND|Không tìm thấy phòng/i.test(error.message || "")) {
        state.room = null;
        state.roomKey = "";
        localStorage.removeItem(STORAGE_ROOM);
        goRoute("match", true);
      }
    } finally {
      state.roomPollBusy = false;
    }
  }

  function renderRoomClocks() {
    const room = state.room;
    if (!room) {
      dom.topClock.textContent = "10:00";
      dom.bottomClock.textContent = "10:00";
      dom.topClock.classList.remove("active", "low");
      dom.bottomClock.classList.remove("active", "low");
      return;
    }
    const bottomSide = room.role === "player" ? room.yourSide : "w";
    const topSide = oppositeSide(bottomSide);
    paintClock(dom.topClock, liveClockFor(topSide), room.status === "active" && room.sideToMove === topSide);
    paintClock(dom.bottomClock, liveClockFor(bottomSide), room.status === "active" && room.sideToMove === bottomSide);
  }

  function paintClock(element, milliseconds, active) {
    const ms = Math.max(0, milliseconds);
    element.textContent = formatClock(ms);
    element.classList.toggle("active", !!active);
    element.classList.toggle("low", ms <= 60000);
  }

  function liveClockFor(side) {
    if (!state.room) return 0;
    let value = Number(state.room.clocks?.[side] || 0);
    if (state.room.status === "active" && state.room.sideToMove === side && !state.room.result) {
      value -= Date.now() - state.roomSyncedAt;
    }
    return Math.max(0, value);
  }

  function renderProfileAfterApiFailure() {
    renderProfile();
    if (state.room) renderRoomMeta();
  }

  function roomStatusText(room) {
    if (room.status === "waiting") return "Đang chờ đối thủ";
    if (room.status === "finished") return "Ván cờ kết thúc";
    if (room.role === "spectator") return "Bạn đang xem";
    return room.yourTurn ? "Tới lượt bạn" : "Tới lượt đối thủ";
  }

  function roomSummaryText(room) {
    if (room.status === "waiting") {
      return `Mỗi bên có ${room.timeControlMinutes} phút. Hệ thống đang chờ đủ hai người chơi.`;
    }
    if (room.status === "finished") {
      return resultDetail(room);
    }
    if (room.role === "spectator") {
      return "Bạn đang ở chế độ người xem. Người xem có thể theo dõi và chat, nhưng không thể can thiệp ván đấu.";
    }
    return room.yourTurn
      ? `Bạn đang cầm bên ${room.yourSide === "w" ? "Đỏ" : "Đen"} và đồng hồ của bạn đang chạy.`
      : `Bạn đang cầm bên ${room.yourSide === "w" ? "Đỏ" : "Đen"} và đang chờ đối thủ đi.`;
  }

  function resultTitle(room) {
    if (!room?.result) return "";
    if (room.role === "spectator") {
      if (!room.result.winnerSide) return "Ván cờ hòa";
      return `${room.result.winnerSide === "w" ? "Đỏ" : "Đen"} thắng`;
    }
    if (!room.result.winnerSide) return "Ván cờ hòa";
    return room.result.winnerSide === room.yourSide ? "Bạn thắng" : "Bạn thua";
  }

  function resultDetail(room) {
    if (!room?.result) return "";
    return {
      checkmate: "Chiếu bí tướng.",
      "no-moves": "Bên thua không còn nước đi hợp lệ.",
      timeout: "Một bên đã hết giờ.",
      resign: "Có người xin thua.",
      draw: "Hai bên chấp nhận hòa."
    }[room.result.reason] || "Ván cờ đã kết thúc.";
  }

  function makeNotice(title, text) {
    const box = document.createElement("div");
    box.className = "notice-card";
    const head = document.createElement("strong");
    head.textContent = title;
    const body = document.createElement("div");
    body.textContent = text;
    body.style.color = "var(--muted)";
    body.style.lineHeight = "1.5";
    box.append(head, body);
    return box;
  }

  function openModal({ title, text, confirmText = "Đồng ý", onConfirm }) {
    state.modalConfirm = onConfirm || null;
    dom.modalTitle.textContent = title;
    dom.modalText.textContent = text;
    dom.modalConfirm.textContent = confirmText;
    dom.modal.classList.remove("hidden");
  }

  function closeModal() {
    state.modalConfirm = null;
    dom.modal.classList.add("hidden");
  }

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement("textarea");
      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    showToast("Đã sao chép.");
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
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 1800);
  }

  function setMessage(element, text, tone = "error") {
    element.textContent = text || "";
    element.style.color = tone === "success" ? "#1c7a4c" : tone === "info" ? "#7a4b17" : "#7b2218";
  }

  function paintAvatar(element, userLike, fallbackLetter) {
    const label = userLike?.displayName || userLike?.username || fallbackLetter || "D";
    const seed = userLike?.avatarSeed || userLike?.username || label;
    const avatarUrl = userLike?.avatarUrl || "";
    if (avatarUrl) {
      element.classList.add("has-image");
      element.textContent = label.charAt(0).toUpperCase() || fallbackLetter || "D";
      element.style.backgroundImage = `url("${avatarUrl.replace(/"/g, '\\"')}")`;
      return;
    }
    const hue = hashCode(String(seed)) % 360;
    const hue2 = (hue + 34) % 360;
    element.classList.remove("has-image");
    element.style.backgroundImage = "";
    element.style.background = `linear-gradient(135deg, hsl(${hue} 62% 38%), hsl(${hue2} 68% 48%))`;
    element.textContent = label.charAt(0).toUpperCase() || fallbackLetter || "D";
  }

  function scheduleResizeRender() {
    if (state.resizeTimer) clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(() => {
      state.resizeTimer = null;
      onResize();
    }, 120);
  }

  function onResize() {
    const targetBoard = dom.roomView.classList.contains("hidden") ? null : dom.roomBoard;
    const rect = targetBoard ? targetBoard.getBoundingClientRect() : null;
    const boardSizeKey = rect ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : "";
    const reviewRect = dom.reviewView.classList.contains("hidden") ? null : dom.reviewBoard.getBoundingClientRect();
    const reviewBoardSizeKey = reviewRect ? `${Math.round(reviewRect.width)}x${Math.round(reviewRect.height)}` : "";
    if (boardSizeKey && boardSizeKey === state.lastBoardSizeKey && (!reviewBoardSizeKey || reviewBoardSizeKey === state.reviewLastBoardFrame.split("|")[0])) return;
    state.lastBoardSizeKey = boardSizeKey;
    state.lastBoardFrame = "";
    state.lastPieceFrame = "";
    if (!dom.roomView.classList.contains("hidden")) drawRoomScene(true);
    state.reviewLastBoardFrame = "";
    state.reviewLastPieceFrame = "";
    if (!dom.reviewView.classList.contains("hidden")) drawReviewScene(true);
  }

  function viewSide() {
    return state.room?.viewSide === "b" ? "b" : "w";
  }

  function reviewViewSide() {
    return state.reviewGame?.sideCode === "b" ? "b" : "w";
  }

  function geometry() {
    const rect = dom.roomBoard.getBoundingClientRect();
    const pad = rect.width * 0.07;
    const usableW = rect.width - pad * 2;
    const usableH = rect.height - pad * 2;
    const flipped = viewSide() === "b";
    return {
      rect,
      x: (file) => pad + (flipped ? 8 - file : file) * usableW / 8,
      y: (rank) => pad + (flipped ? rank : 9 - rank) * usableH / 9
    };
  }

  function reviewGeometry() {
    const rect = dom.reviewBoard.getBoundingClientRect();
    const pad = rect.width * 0.07;
    const usableW = rect.width - pad * 2;
    const usableH = rect.height - pad * 2;
    const flipped = reviewViewSide() === "b";
    return {
      rect,
      x: (file) => pad + (flipped ? 8 - file : file) * usableW / 8,
      y: (rank) => pad + (flipped ? rank : 9 - rank) * usableH / 9
    };
  }

  function squareToPixel(square) {
    const g = geometry();
    return { x: g.x(square.x), y: g.y(square.y) };
  }

  function reviewSquareToPixel(square) {
    const g = reviewGeometry();
    return { x: g.x(square.x), y: g.y(square.y) };
  }

  function uciToSquare(uci) {
    const text = String(uci || "").trim().toLowerCase();
    if (!/^[a-i][0-9]$/.test(text)) return { x: 0, y: 0 };
    return {
      x: text.charCodeAt(0) - 97,
      y: Number(text[1])
    };
  }

  function boardSignature(board) {
    return (board || []).map((row) => row.join("")).join("/");
  }

  function eventToSquare(event) {
    const rect = dom.roomBoard.getBoundingClientRect();
    const g = geometry();
    let best = null;
    let bestDistance = Infinity;
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const px = g.x(x);
        const py = g.y(y);
        const distance = Math.hypot(event.clientX - rect.left - px, event.clientY - rect.top - py);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    return bestDistance < rect.width / 9.4 ? best : null;
  }

  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function getCheckedSides(board) {
    return {
      w: Boolean(XiangqiCore.findKing(board, "w")) && XiangqiCore.isKingInCheck(board, "w"),
      b: Boolean(XiangqiCore.findKing(board, "b")) && XiangqiCore.isKingInCheck(board, "b")
    };
  }

  function oppositeSide(side) {
    return side === "w" ? "b" : "w";
  }

  function formatClock(milliseconds) {
    const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatDate(dateText) {
    if (!dateText) return "";
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function formatTime(dateText) {
    if (!dateText) return "";
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function hashCode(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  function preloadPieceImages() {
    Object.values(PIECE_IMAGES).forEach((src) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
    });
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

  async function api(url, options = {}) {
    const method = options.method || (options.body !== undefined ? "POST" : "GET");
    const headers = {};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    let body;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) {
          throw Object.assign(new Error(data.error || `HTTP ${response.status}`), { status: response.status });
        }
        return data;
      } catch (error) {
        lastError = error;
        if (!API_RETRYABLE_STATUS.has(Number(error.status)) || attempt === 3) break;
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }

    if (lastError && /UNAUTHORIZED/i.test(lastError.message || "")) {
      clearSession();
      goRoute("auth", true);
      setMessage(dom.authMessage, "Phiên đăng nhập đã hết hạn.");
    }
    renderProfileAfterApiFailure();
    throw lastError || new Error("Không thể kết nối tới máy chủ.");
  }
})();
