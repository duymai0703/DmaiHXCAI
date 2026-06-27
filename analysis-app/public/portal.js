(function () {
  "use strict";

  const API_RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
  const STORAGE_TOKEN = "dmaihxcai-auth-token";
  const STORAGE_ROOM = "dmaihxcai-room-key";
  const BOARD_START_FEN = XiangqiCore.START_FEN;
  const FILES = XiangqiCore.FILES;
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
    authMode: "login",
    lobbyMode: "join",
    createSide: "w",
    room: null,
    roomKey: localStorage.getItem(STORAGE_ROOM) || "",
    roomBoard: XiangqiCore.parseFenState(BOARD_START_FEN).board,
    selectedSquare: null,
    hints: [],
    roomSyncedAt: 0,
    roomPollTimer: null,
    roomClockTimer: null,
    roomPollBusy: false,
    roomActionBusy: false,
    modalConfirm: null
  };

  const dom = {
    authView: byId("authView"),
    homeView: byId("homeView"),
    roomView: byId("roomView"),
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
    headerProfile: byId("headerProfile"),
    profileButton: byId("profileButton"),
    profileAvatar: byId("profileAvatar"),
    profileName: byId("profileName"),
    profileUsername: byId("profileUsername"),
    profileAvatarLarge: byId("profileAvatarLarge"),
    welcomeName: byId("welcomeName"),
    displayNameInput: byId("displayNameInput"),
    readonlyUsername: byId("readonlyUsername"),
    saveProfileBtn: byId("saveProfileBtn"),
    profileMessage: byId("profileMessage"),
    logoutBtn: byId("logoutBtn"),
    historyList: byId("historyList"),
    openMatchHub: byId("openMatchHub"),
    openLibraryBtn: byId("openLibraryBtn"),
    matchHubPanel: byId("matchHubPanel"),
    libraryPanel: byId("libraryPanel"),
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
    resumeRoomBtn: byId("resumeRoomBtn"),
    backHomeBtn: byId("backHomeBtn"),
    roomKeyLabel: byId("roomKeyLabel"),
    copyRoomKeyBtn: byId("copyRoomKeyBtn"),
    roomStatusBadge: byId("roomStatusBadge"),
    roomSummary: byId("roomSummary"),
    topSideLabel: byId("topSideLabel"),
    bottomSideLabel: byId("bottomSideLabel"),
    topPlayerName: byId("topPlayerName"),
    bottomPlayerName: byId("bottomPlayerName"),
    topClock: byId("topClock"),
    bottomClock: byId("bottomClock"),
    roomBoard: byId("roomBoard"),
    roomBoardCanvas: byId("roomBoardCanvas"),
    roomPieces: byId("roomPieces"),
    roomMarks: byId("roomMarks"),
    undoRequestBtn: byId("undoRequestBtn"),
    drawRequestBtn: byId("drawRequestBtn"),
    resignBtn: byId("resignBtn"),
    undoCount: byId("undoCount"),
    drawCount: byId("drawCount"),
    requestState: byId("requestState"),
    resultState: byId("resultState"),
    roomMoveList: byId("roomMoveList"),
    modal: byId("modal"),
    modalTitle: byId("modalTitle"),
    modalText: byId("modalText"),
    modalCancel: byId("modalCancel"),
    modalConfirm: byId("modalConfirm")
  };

  bindEvents();
  preventDoubleTapZoom();
  setAuthMode("login");
  setLobbyMode("join");
  updateTimeLabel();
  drawRoomScene();
  bootstrap().catch(() => showView("auth"));

  function byId(id) {
    return document.getElementById(id);
  }

  function bindEvents() {
    window.addEventListener("resize", drawRoomScene);
    dom.loginTab.addEventListener("click", () => setAuthMode("login"));
    dom.registerTab.addEventListener("click", () => setAuthMode("register"));
    dom.loginForm.addEventListener("submit", onLoginSubmit);
    dom.registerForm.addEventListener("submit", onRegisterSubmit);
    dom.logoutBtn.addEventListener("click", logout);
    dom.profileButton.addEventListener("click", () => {
      if (!dom.homeView.classList.contains("hidden")) {
        dom.displayNameInput.focus();
      } else {
        goHome();
      }
    });
    dom.saveProfileBtn.addEventListener("click", saveProfile);
    dom.openMatchHub.addEventListener("click", () => {
      openPanel("match");
      setLobbyMode("join");
    });
    dom.openLibraryBtn.addEventListener("click", () => openPanel("library"));
    dom.showJoinRoom.addEventListener("click", () => setLobbyMode("join"));
    dom.showCreateRoom.addEventListener("click", () => setLobbyMode("create"));
    dom.joinRoomForm.addEventListener("submit", onJoinRoom);
    dom.createRoomForm.addEventListener("submit", onCreateRoom);
    dom.timeRange.addEventListener("input", updateTimeLabel);
    dom.pickRed.addEventListener("click", () => setCreateSide("w"));
    dom.pickBlack.addEventListener("click", () => setCreateSide("b"));
    dom.resumeRoomBtn.addEventListener("click", resumeStoredRoom);
    dom.backHomeBtn.addEventListener("click", goHome);
    dom.copyRoomKeyBtn.addEventListener("click", () => copyText(state.room?.key || ""));
    dom.undoRequestBtn.addEventListener("click", () => requestRoomAction("undo"));
    dom.drawRequestBtn.addEventListener("click", () => requestRoomAction("draw"));
    dom.resignBtn.addEventListener("click", confirmResign);
    dom.roomBoard.addEventListener("click", onBoardClick);
    dom.modalCancel.addEventListener("click", closeModal);
    dom.modalConfirm.addEventListener("click", async () => {
      const action = state.modalConfirm;
      closeModal();
      if (typeof action === "function") await action();
    });
  }

  async function bootstrap() {
    if (!state.token) {
      showView("auth");
      return;
    }

    try {
      const [session, history, currentRoom] = await Promise.all([
        api("/api/auth/me"),
        api("/api/history"),
        api("/api/rooms/current")
      ]);
      applySession(session.user);
      state.history = Array.isArray(history.history) ? history.history : [];
      renderHistory();
      showView("home");
      openPanel("match");
      if (currentRoom.room) {
        enterRoom(currentRoom.room, { restartPolling: true });
        return;
      }
      await resumeStoredRoom();
    } catch (err) {
      clearSession();
      setMessage(dom.authMessage, err.message || "Không thể khôi phục phiên đăng nhập.");
      showView("auth");
    }
  }

  function setAuthMode(mode) {
    state.authMode = mode === "register" ? "register" : "login";
    dom.loginTab.classList.toggle("active", state.authMode === "login");
    dom.registerTab.classList.toggle("active", state.authMode === "register");
    dom.loginForm.classList.toggle("hidden", state.authMode !== "login");
    dom.registerForm.classList.toggle("hidden", state.authMode !== "register");
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

  function openPanel(panel) {
    const match = panel === "match";
    dom.matchHubPanel.classList.toggle("hidden", !match);
    dom.libraryPanel.classList.toggle("hidden", match);
  }

  function updateTimeLabel() {
    const minutes = Number(dom.timeRange.value || 10);
    dom.timeRangeValue.textContent = `${minutes} phút`;
  }

  function setCreateSide(side) {
    state.createSide = side === "b" ? "b" : "w";
    dom.pickRed.classList.toggle("active", state.createSide === "w");
    dom.pickBlack.classList.toggle("active", state.createSide === "b");
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
    } catch (err) {
      setMessage(dom.authMessage, err.message || "Đăng nhập thất bại.");
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
    } catch (err) {
      setMessage(dom.authMessage, err.message || "Đăng ký thất bại.");
    }
  }

  async function afterAuthSuccess(message) {
    const [history, currentRoom] = await Promise.all([
      api("/api/history"),
      api("/api/rooms/current")
    ]);
    state.history = Array.isArray(history.history) ? history.history : [];
    renderHistory();
    showView("home");
    openPanel("match");
    setMessage(dom.profileMessage, "");
    showToast(message);
    if (currentRoom.room) {
      enterRoom(currentRoom.room, { restartPolling: true });
      return;
    }
    await resumeStoredRoom();
  }

  function applySession(user, token) {
    state.user = user;
    if (token) {
      state.token = token;
      localStorage.setItem(STORAGE_TOKEN, token);
    }
    renderProfile();
  }

  function clearSession() {
    stopRoomPolling();
    state.user = null;
    state.token = "";
    state.history = [];
    state.room = null;
    state.roomKey = "";
    state.selectedSquare = null;
    state.hints = [];
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_ROOM);
    renderProfile();
    renderHistory();
    renderRoomState();
  }

  async function logout() {
    clearSession();
    showView("auth");
    setAuthMode("login");
    dom.loginPassword.value = "";
    dom.registerPassword.value = "";
    showToast("Đã đăng xuất.");
  }

  async function saveProfile() {
    const displayName = dom.displayNameInput.value.trim();
    setMessage(dom.profileMessage, "Đang lưu...", "info");
    try {
      const data = await api("/api/profile", {
        method: "POST",
        body: { displayName }
      });
      state.user = data.user;
      renderProfile();
      setMessage(dom.profileMessage, "Đã lưu tên hiển thị.", "success");
      showToast("Đã cập nhật tên hiển thị.");
    } catch (err) {
      setMessage(dom.profileMessage, err.message || "Không thể lưu tên.");
    }
  }

  async function onCreateRoom(event) {
    event.preventDefault();
    setMessage(dom.matchHubMessage, "Đang tạo phòng...", "info");
    try {
      const data = await api("/api/rooms/create", {
        method: "POST",
        body: {
          minutes: Number(dom.timeRange.value || 10),
          side: state.createSide
        }
      });
      enterRoom(data.room, { restartPolling: true });
      setMessage(dom.matchHubMessage, "");
      showToast("Đã tạo phòng đấu.");
    } catch (err) {
      setMessage(dom.matchHubMessage, err.message || "Không thể tạo phòng.");
    }
  }

  async function onJoinRoom(event) {
    event.preventDefault();
    const key = dom.joinRoomKey.value.trim().toUpperCase();
    setMessage(dom.matchHubMessage, "Đang vào phòng...", "info");
    try {
      const data = await api("/api/rooms/join", {
        method: "POST",
        body: { key }
      });
      dom.joinRoomKey.value = "";
      enterRoom(data.room, { restartPolling: true });
      setMessage(dom.matchHubMessage, "");
      showToast("Đã vào phòng đấu.");
    } catch (err) {
      setMessage(dom.matchHubMessage, err.message || "Không thể vào phòng.");
    }
  }

  async function resumeStoredRoom() {
    const key = state.room?.key || state.roomKey || localStorage.getItem(STORAGE_ROOM) || "";
    if (!key || !state.token) {
      updateResumeButton();
      return;
    }
    try {
      const data = await api(`/api/rooms/state?key=${encodeURIComponent(key)}`);
      enterRoom(data.room, { restartPolling: true });
    } catch (err) {
      if (/Không tìm thấy phòng|ROOM_NOT_FOUND/i.test(err.message || "")) {
        state.roomKey = "";
        localStorage.removeItem(STORAGE_ROOM);
        updateResumeButton();
      } else if (!dom.homeView.classList.contains("hidden")) {
        setMessage(dom.matchHubMessage, err.message || "Không thể khôi phục phòng.");
      }
    }
  }

  function enterRoom(room, { restartPolling = false } = {}) {
    if (!room) return;
    const previousFen = state.room?.boardFen || "";
    state.room = room;
    state.roomKey = room.key;
    localStorage.setItem(STORAGE_ROOM, room.key);
    state.roomSyncedAt = Date.now();
    state.roomBoard = XiangqiCore.parseFenState(room.boardFen || BOARD_START_FEN).board;
    if (room.boardFen !== previousFen) {
      state.selectedSquare = null;
      state.hints = [];
    }
    updateResumeButton();
    showView("room");
    renderRoomState();
    if (restartPolling) startRoomPolling();
  }

  function goHome() {
    stopRoomPolling();
    showView("home");
    openPanel("match");
    updateResumeButton();
  }

  function updateResumeButton() {
    const key = state.room?.key || state.roomKey || localStorage.getItem(STORAGE_ROOM) || "";
    dom.resumeRoomBtn.classList.toggle("hidden", !key || !state.user);
    if (key) dom.resumeRoomBtn.textContent = `Quay lại phòng ${key}`;
  }

  function showView(view) {
    dom.authView.classList.toggle("hidden", view !== "auth");
    dom.homeView.classList.toggle("hidden", view !== "home");
    dom.roomView.classList.toggle("hidden", view !== "room");
    dom.headerProfile.classList.toggle("hidden", !state.user);
  }

  function renderProfile() {
    const user = state.user;
    if (!user) {
      dom.headerProfile.classList.add("hidden");
      dom.profileName.textContent = "Kỳ thủ";
      dom.profileUsername.textContent = "@guest";
      dom.welcomeName.textContent = "Kỳ thủ";
      dom.displayNameInput.value = "";
      dom.readonlyUsername.value = "";
      applyAvatar(dom.profileAvatar, "D", "guest");
      applyAvatar(dom.profileAvatarLarge, "D", "guest");
      return;
    }

    dom.headerProfile.classList.remove("hidden");
    dom.profileName.textContent = user.displayName || user.username;
    dom.profileUsername.textContent = `@${user.username}`;
    dom.welcomeName.textContent = user.displayName || user.username;
    dom.displayNameInput.value = user.displayName || "";
    dom.readonlyUsername.value = user.username || "";
    applyAvatar(dom.profileAvatar, user.displayName || user.username || "D", user.avatarSeed || user.username);
    applyAvatar(dom.profileAvatarLarge, user.displayName || user.username || "D", user.avatarSeed || user.username);
  }

  function applyAvatar(element, name, seed) {
    const label = String(name || "D").trim();
    const first = label.charAt(0).toUpperCase() || "D";
    const hue = hashCode(String(seed || label)) % 360;
    const hue2 = (hue + 34) % 360;
    element.textContent = first;
    element.style.background = `linear-gradient(135deg, hsl(${hue} 62% 38%), hsl(${hue2} 68% 48%))`;
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
      const header = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = `${entry.side || "Đỏ"} vs ${entry.opponent || "Đối thủ"}`;
      const pill = document.createElement("span");
      const outcome = String(entry.result || "").toLowerCase();
      pill.className = `result-pill ${outcome.includes("thắng") ? "win" : outcome.includes("thua") ? "loss" : "draw"}`;
      pill.textContent = entry.result || "Hòa";
      header.append(title, pill);

      const reason = document.createElement("div");
      reason.textContent = `${entry.reason || "Kết thúc"} • ${formatDate(entry.endedAt)}`;
      reason.style.color = "var(--muted)";
      reason.style.fontSize = "13px";

      const moves = document.createElement("div");
      moves.style.marginTop = "8px";
      moves.style.color = "var(--ink)";
      moves.style.fontSize = "13px";
      const movePreview = Array.isArray(entry.moves) ? entry.moves.slice(0, 4).join(" • ") : "";
      moves.textContent = movePreview || "Không có biên bản.";

      item.append(header, reason, moves);
      dom.historyList.appendChild(item);
    });
  }

  function renderRoomState() {
    const room = state.room;
    state.roomBoard = XiangqiCore.parseFenState(room?.boardFen || BOARD_START_FEN).board;
    renderRoomMeta();
    renderRequestState();
    renderResultState();
    renderMoveList();
    drawRoomScene();
  }

  function renderRoomMeta() {
    const room = state.room;
    if (!room) {
      dom.roomKeyLabel.textContent = "------";
      dom.roomSummary.textContent = "Phòng đang được chuẩn bị.";
      dom.roomStatusBadge.textContent = "Chưa vào phòng";
      dom.topPlayerName.textContent = "Đang chờ đối thủ";
      dom.bottomPlayerName.textContent = "Bạn";
      dom.undoCount.textContent = "2";
      dom.drawCount.textContent = "2";
      renderRoomClocks();
      return;
    }

    const topSide = room.yourSide === "w" ? "b" : "w";
    const bottomSide = room.yourSide;
    const topPlayer = room.players?.[topSide];
    const bottomPlayer = room.players?.[bottomSide];

    dom.roomKeyLabel.textContent = room.key;
    dom.topSideLabel.textContent = topSide === "w" ? "Đỏ" : "Đen";
    dom.bottomSideLabel.textContent = bottomSide === "w" ? "Đỏ" : "Đen";
    dom.topSideLabel.classList.toggle("side-red", topSide === "w");
    dom.bottomSideLabel.classList.toggle("side-red", bottomSide === "w");
    dom.topPlayerName.textContent = topPlayer ? topPlayer.displayName || topPlayer.username : "Đang chờ đối thủ";
    dom.bottomPlayerName.textContent = bottomPlayer ? bottomPlayer.displayName || bottomPlayer.username : "Bạn";
    dom.undoCount.textContent = String(room.allowances?.undoRemaining ?? 0);
    dom.drawCount.textContent = String(room.allowances?.drawRemaining ?? 0);
    dom.roomStatusBadge.textContent = roomStatusText(room);
    dom.roomSummary.textContent = roomSummaryText(room);
    renderRoomClocks();

    const disabledRoomActions = room.waitingForOpponent || room.status !== "active" || state.roomActionBusy;
    dom.undoRequestBtn.disabled = disabledRoomActions || Number(room.allowances?.undoRemaining || 0) <= 0 || Boolean(room.pendingRequest);
    dom.drawRequestBtn.disabled = disabledRoomActions || Number(room.allowances?.drawRemaining || 0) <= 0 || Boolean(room.pendingRequest);
    dom.resignBtn.disabled = room.status !== "active" || state.roomActionBusy;
  }

  function renderRequestState() {
    const room = state.room;
    dom.requestState.innerHTML = "";
    if (!room) return;

    if (room.waitingForOpponent) {
      dom.requestState.appendChild(makeNotice("Đang chờ đối thủ", "Bàn cờ đã sẵn sàng. Khi đối thủ nhập đúng Key, ván đấu sẽ tự bắt đầu."));
      return;
    }

    if (room.pendingRequest?.fromYou) {
      dom.requestState.appendChild(makeNotice("Đang chờ đối thủ xác nhận...", pendingRequestLabel(room.pendingRequest.type)));
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

    if (room.status === "active") {
      dom.requestState.appendChild(makeNotice(
        room.yourTurn ? "Đến lượt bạn" : "Đến lượt đối thủ",
        room.yourTurn ? "Bạn chỉ được đi quân thuộc bên mình." : "Đồng hồ bên đối thủ đang chạy."
      ));
    }
  }

  function renderResultState() {
    const room = state.room;
    dom.resultState.innerHTML = "";
    dom.resultState.classList.toggle("hidden", !room?.result);
    if (!room?.result) return;

    const notice = makeNotice(resultTitle(room), resultDetail(room));
    const ready = document.createElement("button");
    ready.className = room.rematchReady?.you ? "primary-button" : "secondary-button";
    ready.type = "button";
    ready.textContent = room.rematchReady?.you ? "Đã sẵn sàng ván mới" : "Sẵn sàng ván mới";
    ready.disabled = state.roomActionBusy;
    ready.addEventListener("click", toggleRematch);
    notice.appendChild(ready);

    if (room.rematchReady?.opponent) {
      const sub = document.createElement("div");
      sub.style.marginTop = "8px";
      sub.style.color = "var(--muted)";
      sub.textContent = "Đối thủ đã sẵn sàng.";
      notice.appendChild(sub);
    }

    dom.resultState.appendChild(notice);
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
      const moveNumber = document.createElement("span");
      moveNumber.className = "move-number";
      moveNumber.textContent = `${Math.floor(index / 2) + 1}.`;
      const red = document.createElement("span");
      red.className = "move-cell red";
      red.textContent = moves[index]?.notation || "";
      const black = document.createElement("span");
      black.className = "move-cell black";
      black.textContent = moves[index + 1]?.notation || "";
      row.append(moveNumber, red, black);
      dom.roomMoveList.appendChild(row);
    }
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

  function roomStatusText(room) {
    if (room.status === "waiting") return "Đang chờ đối thủ";
    if (room.status === "finished") return "Ván cờ kết thúc";
    return room.yourTurn ? "Tới lượt bạn" : "Tới lượt đối thủ";
  }

  function roomSummaryText(room) {
    if (room.status === "waiting") {
      return `Bạn đang chờ đối thủ vào phòng. Mỗi bên có ${room.timeControlMinutes} phút.`;
    }
    if (room.status === "finished") {
      return resultDetail(room);
    }
    return room.yourTurn
      ? `Bạn đang cầm bên ${room.yourSide === "w" ? "Đỏ" : "Đen"} và đồng hồ của bạn đang chạy.`
      : `Bạn đang cầm bên ${room.yourSide === "w" ? "Đỏ" : "Đen"} và đang chờ đối thủ đi.`;
  }

  function resultTitle(room) {
    if (!room?.result) return "";
    const winner = room.result.winnerSide;
    if (!winner) return "Ván cờ hòa";
    return winner === room.yourSide ? "Bạn thắng" : "Bạn thua";
  }

  function resultDetail(room) {
    if (!room?.result) return "";
    const reason = {
      checkmate: "Chiếu bí tướng.",
      "no-moves": "Bên thua không còn nước đi hợp lệ.",
      timeout: "Một bên đã hết giờ.",
      resign: "Có người xin thua.",
      draw: "Hai bên chấp nhận hòa."
    }[room.result.reason] || "Ván cờ đã kết thúc.";
    return reason;
  }

  function pendingRequestLabel(type) {
    return type === "undo"
      ? "Yêu cầu đi lại đã được gửi tới đối thủ."
      : "Yêu cầu hòa đã được gửi tới đối thủ.";
  }

  function renderRoomClocks() {
    const room = state.room;
    const empty = "10:00";
    if (!room) {
      dom.topClock.textContent = empty;
      dom.bottomClock.textContent = empty;
      dom.topClock.classList.remove("active", "low");
      dom.bottomClock.classList.remove("active", "low");
      return;
    }

    const topSide = room.yourSide === "w" ? "b" : "w";
    const bottomSide = room.yourSide;
    const topMs = liveClockFor(topSide);
    const bottomMs = liveClockFor(bottomSide);

    paintClock(dom.topClock, topMs, room.status === "active" && room.sideToMove === topSide);
    paintClock(dom.bottomClock, bottomMs, room.status === "active" && room.sideToMove === bottomSide);
  }

  function paintClock(element, milliseconds, active) {
    const ms = Math.max(0, milliseconds);
    element.textContent = formatClock(ms);
    element.classList.toggle("active", !!active);
    element.classList.toggle("low", ms <= 60000);
  }

  function liveClockFor(side) {
    const room = state.room;
    if (!room) return 0;
    let ms = Number(room.clocks?.[side] || 0);
    if (room.status === "active" && room.sideToMove === side && !room.result) {
      ms -= Date.now() - state.roomSyncedAt;
    }
    return Math.max(0, ms);
  }

  function formatClock(ms) {
    const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function drawRoomScene() {
    drawRoomBoard();
    drawRoomPieces();
  }

  function drawRoomBoard() {
    const rect = dom.roomBoard.getBoundingClientRect();
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

  function drawRoomPieces() {
    dom.roomPieces.innerHTML = "";
    dom.roomMarks.innerHTML = "";
    const board = state.roomBoard;
    const loserSide = state.room?.result && ["checkmate", "no-moves"].includes(state.room.result.reason)
      ? state.room.result.loserSide
      : "";

    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const piece = board[y]?.[x] || "";
        if (!piece) continue;
        const square = { x, y };
        const pixel = squareToPixel(square);
        const el = document.createElement("div");
        el.className = "piece image-piece";
        if (state.selectedSquare && state.selectedSquare.x === x && state.selectedSquare.y === y) {
          el.classList.add("selected");
        }
        if (piece.toLowerCase() === "k" && XiangqiCore.pieceColor(piece) === loserSide) {
          el.classList.add("checkmated");
        }
        el.style.left = `${pixel.x}px`;
        el.style.top = `${pixel.y}px`;
        el.style.setProperty("--piece-image", `url("${PIECE_IMAGES[piece]}")`);
        dom.roomPieces.appendChild(el);
      }
    }

    state.hints.forEach((square) => {
      const pixel = squareToPixel(square);
      const el = document.createElement("div");
      el.className = "hint";
      el.style.left = `${pixel.x}px`;
      el.style.top = `${pixel.y}px`;
      dom.roomMarks.appendChild(el);
    });
  }

  function onBoardClick(event) {
    const room = state.room;
    if (!room || room.status !== "active" || !room.yourTurn || state.roomActionBusy) return;
    const square = eventToSquare(event);
    if (!square) return;

    const board = state.roomBoard;
    const piece = board[square.y]?.[square.x] || "";
    const side = room.yourSide;

    if (state.selectedSquare && state.selectedSquare.x === square.x && state.selectedSquare.y === square.y) {
      clearSelection();
      return;
    }

    if (state.selectedSquare) {
      const isHint = state.hints.some((hint) => hint.x === square.x && hint.y === square.y);
      if (isHint) {
        const move = XiangqiCore.squareToUci(state.selectedSquare) + XiangqiCore.squareToUci(square);
        void sendMove(move);
        return;
      }
    }

    if (piece && XiangqiCore.pieceColor(piece) === side) {
      state.selectedSquare = square;
      state.hints = XiangqiCore.getLegalMovesForSquare(board, side, square);
    } else {
      clearSelection();
    }
    drawRoomPieces();
  }

  function clearSelection() {
    state.selectedSquare = null;
    state.hints = [];
    drawRoomPieces();
  }

  async function sendMove(move) {
    if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return;
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      const data = await api("/api/rooms/move", {
        method: "POST",
        body: { key: state.room.key, move }
      });
      state.selectedSquare = null;
      state.hints = [];
      applyRoomUpdate(data.room);
    } catch (err) {
      showToast(err.message || "Không thể đi nước này.");
      state.roomActionBusy = false;
      renderRoomMeta();
    }
  }

  async function requestRoomAction(type) {
    if (!state.room || state.room.status !== "active" || state.roomActionBusy) return;
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      const data = await api("/api/rooms/request", {
        method: "POST",
        body: { key: state.room.key, type }
      });
      applyRoomUpdate(data.room);
      showToast(type === "undo" ? "Đã gửi yêu cầu đi lại." : "Đã gửi yêu cầu hòa.");
    } catch (err) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(err.message || "Không thể gửi yêu cầu.");
    }
  }

  async function respondRequest(accept) {
    if (!state.room || state.roomActionBusy) return;
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      const data = await api("/api/rooms/respond", {
        method: "POST",
        body: { key: state.room.key, accept }
      });
      applyRoomUpdate(data.room);
      showToast(accept ? "Đã xác nhận yêu cầu." : "Đã từ chối yêu cầu.");
    } catch (err) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(err.message || "Không thể xử lý yêu cầu.");
    }
  }

  function confirmResign() {
    if (!state.room || state.room.status !== "active") return;
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
      const data = await api("/api/rooms/resign", {
        method: "POST",
        body: { key: state.room.key }
      });
      applyRoomUpdate(data.room);
    } catch (err) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(err.message || "Không thể xin thua.");
    }
  }

  async function toggleRematch() {
    if (!state.room || state.room.status !== "finished" || state.roomActionBusy) return;
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      const data = await api("/api/rooms/rematch", {
        method: "POST",
        body: { key: state.room.key, ready: !state.room.rematchReady?.you }
      });
      applyRoomUpdate(data.room);
      showToast(data.room.status === "active" ? "Ván mới đã bắt đầu." : "Đã cập nhật trạng thái sẵn sàng.");
    } catch (err) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(err.message || "Không thể đổi trạng thái sẵn sàng.");
    }
  }

  function applyRoomUpdate(room) {
    state.roomActionBusy = false;
    if (!room) {
      state.room = null;
      state.roomKey = "";
      localStorage.removeItem(STORAGE_ROOM);
      updateResumeButton();
      renderRoomState();
      return;
    }
    enterRoom(room, { restartPolling: false });
  }

  function startRoomPolling() {
    stopRoomPolling();
    state.roomPollTimer = window.setInterval(() => {
      void pollRoomState();
    }, 1000);
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
    if (!state.roomKey || state.roomPollBusy || !state.token) return;
    state.roomPollBusy = true;
    try {
      const data = await api(`/api/rooms/state?key=${encodeURIComponent(state.roomKey)}`);
      applyRoomUpdate(data.room);
    } catch (err) {
      if (/Không tìm thấy phòng|ROOM_NOT_FOUND/i.test(err.message || "")) {
        state.room = null;
        state.roomKey = "";
        localStorage.removeItem(STORAGE_ROOM);
        updateResumeButton();
        renderRoomState();
        goHome();
      }
    } finally {
      state.roomPollBusy = false;
    }
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
    if (!element) return;
    element.textContent = text || "";
    element.style.color = tone === "success" ? "#1c7a4c" : tone === "info" ? "#7a4b17" : "#7b2218";
  }

  function geometry() {
    const rect = dom.roomBoard.getBoundingClientRect();
    const pad = rect.width * 0.07;
    const usableW = rect.width - pad * 2;
    const usableH = rect.height - pad * 2;
    const flipped = state.room?.yourSide === "b";
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
    return bestDistance < rect.width / 13 ? best : null;
  }

  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
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

  function hashCode(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return hash;
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
      } catch (err) {
        lastError = err;
        if (!API_RETRYABLE_STATUS.has(Number(err.status)) || attempt === 3) break;
        await sleep(250 * (attempt + 1));
      }
    }
    if (lastError && /UNAUTHORIZED/i.test(lastError.message || "")) {
      clearSession();
      showView("auth");
      setMessage(dom.authMessage, "Phiên đăng nhập đã hết hạn.");
    }
    throw lastError || new Error("Không thể kết nối tới máy chủ.");
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
