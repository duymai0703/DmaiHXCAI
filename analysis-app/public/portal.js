(function () {
  "use strict";

  const API_RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
  const STORAGE_TOKEN = "dmaihxcai-auth-token";
  const STORAGE_USER = "dmaihxcai-auth-user";
  const STORAGE_ROOM = "dmaihxcai-room-key";
  const STORAGE_DEVICE_ID = "dmaihxcai-device-id";
  const STORAGE_DEVICE_AVATAR = "dmaihxcai-device-avatar";
  const STORAGE_DEVICE_AVATAR_VERSION = "dmaihxcai-device-avatar-version";
  const STORAGE_DEVICE_HISTORY = "dmaihxcai-device-history";
  const STORAGE_ASSET_WARMUP_VERSION = "dmaihxcai-portal-assets-version";
  const DEVICE_AVATAR_VERSION = "20260628-v2";
  const ASSET_WARMUP_VERSION = "20260630-v12";
  const START_FEN = XiangqiCore.START_FEN;
  const DEVICE_AVATARS = [
    "/assets/device-avatars/goku.png",
    "/assets/device-avatars/vegeta.png",
    "/assets/device-avatars/naruto.png",
    "/assets/device-avatars/luffy.png",
    "/assets/device-avatars/ichigo.png",
    "/assets/device-avatars/gojo.png",
    "/assets/device-avatars/sungjinwoo.png"
  ];
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
  const REVIEW_BADGES = {
    brilliant: { key: "brilliant", label: "Ưu việt", image: "/assets/review-badges/sao.png" },
    good: { key: "good", label: "Tốt", image: "/assets/review-badges/like.png" },
    okay: { key: "okay", label: "Tạm", image: "/assets/review-badges/bang.png" },
    bad: { key: "bad", label: "Tệ", image: "/assets/review-badges/x.png" }
  };
  const PORTAL_PRELOAD_ASSETS = [
    "/assets/icons/back.png",
    "/assets/icons/header-logo.png",
    "/assets/icons/icon-192.png",
    "/assets/posters/xeposter.png",
    "/assets/posters/phaoposter.png",
    "/assets/posters/maposter.png",
    ...DEVICE_AVATARS,
    ...Object.values(REVIEW_BADGES).map((entry) => entry.image),
    ...Object.values(PIECE_IMAGES)
  ];

  const initialToken = localStorage.getItem(STORAGE_TOKEN) || "";
  const initialDeviceId = readOrCreateDeviceId();
  const initialDeviceAvatar = readOrCreateDeviceAvatar(initialDeviceId);
  const state = {
    token: initialToken,
    user: initialToken ? readStoredUser() : null,
    deviceId: initialDeviceId,
    deviceAvatarUrl: initialDeviceAvatar,
    history: readStoredHistory(),
    route: "home",
    booting: true,
    lobbyMode: "join",
    createSide: "w",
    room: null,
    roomKey: localStorage.getItem(STORAGE_ROOM) || "",
    roomBoard: XiangqiCore.parseFenState(START_FEN).board,
    reviewGame: null,
    reviewCursor: 0,
    reviewBoard: XiangqiCore.parseFenState(START_FEN).board,
    reviewContextBoard: XiangqiCore.parseFenState(START_FEN).board,
    reviewLastMoveSquare: null,
    reviewSideToMove: "w",
    reviewAnalysis: [],
    reviewAnalyzing: false,
    reviewLastBoardFrame: "",
    reviewLastPieceFrame: "",
    reviewPieceSlots: null,
    reviewSlotLayoutKey: "",
    adminUsers: [],
    adminSelectedUserId: "",
    adminLoading: false,
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
    roomDrawFrame: 0,
    roomDrawForce: false,
    roomPieceSlots: null,
    roomHintSlots: null,
    roomSlotLayoutKey: "",
    reviewDrawFrame: 0,
    reviewDrawForce: false,
    lastChatSignature: "",
    resizeTimer: null,
    lastBoardSizeKey: "",
    roomMobilePanel: "control",
    roomTurnFlashTimer: 0,
    assetWarmupPending: false
  };

  const dom = {
    globalBackBtn: byId("globalBackBtn"),
    authView: byId("authView"),
    homeView: byId("homeView"),
    matchHubView: byId("matchHubView"),
    libraryView: byId("libraryView"),
    adminView: byId("adminView"),
    roomView: byId("roomView"),
    reviewView: byId("reviewView"),
    assetPreloadOverlay: byId("assetPreloadOverlay"),
    assetPreloadText: byId("assetPreloadText"),
    opponentBadge: byId("opponentBadge"),
    selfBadge: byId("selfBadge"),
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
    joinDisplayName: byId("joinDisplayName"),
    joinRoomKey: byId("joinRoomKey"),
    createDisplayName: byId("createDisplayName"),
    yourTimeRange: byId("yourTimeRange"),
    yourTimeRangeValue: byId("yourTimeRangeValue"),
    opponentTimeRange: byId("opponentTimeRange"),
    opponentTimeRangeValue: byId("opponentTimeRangeValue"),
    incrementSelect: byId("incrementSelect"),
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
    roomBoardOverlay: byId("roomBoardOverlay"),
    roomOverlayTitle: byId("roomOverlayTitle"),
    roomOverlayText: byId("roomOverlayText"),
    roomOverlayActions: byId("roomOverlayActions"),
    undoRequestBtn: byId("undoRequestBtn"),
    drawRequestBtn: byId("drawRequestBtn"),
    resignBtn: byId("resignBtn"),
    roomReadyBtn: byId("roomReadyBtn"),
    leaveRoomBtn: byId("leaveRoomBtn"),
    roomUndoDockCount: byId("roomUndoDockCount"),
    roomDrawDockCount: byId("roomDrawDockCount"),
    undoCount: byId("undoCount"),
    drawCount: byId("drawCount"),
    requestState: byId("requestState"),
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
    openAdminBtn: byId("openAdminBtn"),
    logoutBtn: byId("logoutBtn"),
    libraryHistoryList: byId("libraryHistoryList"),
    adminRefreshBtn: byId("adminRefreshBtn"),
    adminUsersMeta: byId("adminUsersMeta"),
    adminUsersList: byId("adminUsersList"),
    adminSelectedTitle: byId("adminSelectedTitle"),
    adminSelectedMeta: byId("adminSelectedMeta"),
    adminHistoryList: byId("adminHistoryList"),
    modal: byId("modal"),
    modalTitle: byId("modalTitle"),
    modalText: byId("modalText"),
    modalCancel: byId("modalCancel"),
    modalConfirm: byId("modalConfirm")
  };
  const roomMobilePanelButtons = [...document.querySelectorAll("[data-room-mobile-mode]")];
  const roomMobileActionButtons = [...document.querySelectorAll("[data-room-mobile-action]")];
  const roomMobilePanels = [...document.querySelectorAll("[data-room-mobile-panel]")];

  const mobileUserAgent = navigator.userAgent || "";
  const isIpadDesktop = /macintosh/i.test(mobileUserAgent) && Number(navigator.maxTouchPoints || 0) > 1;
  const isMobileDevice = /android|iphone|ipad|ipod|mobile|windows phone/i.test(mobileUserAgent) || isIpadDesktop;
  if (isMobileDevice) {
    window.location.replace("/analysis");
    return;
  }

  bindEvents();
  preventDoubleTapZoom();
  const assetWarmupPromise = warmPortalAssets();
  syncViewportHeight();
  setupRoomMobileDock();
  setLobbyMode("join");
  updateTimeLabels();
  bootstrap()
    .catch(() => {})
    .finally(() => {
      state.booting = false;
      syncRoute(true);
    });
  assetWarmupPromise.catch(() => {}).finally(() => {
    state.assetWarmupPending = false;
    renderAssetPreloadOverlay();
  });

  function byId(id) {
    return document.getElementById(id);
  }

  function bindEvents() {
    window.addEventListener("resize", scheduleResizeRender, { passive: true });
    window.addEventListener("hashchange", () => syncRoute(false));
    dom.globalBackBtn.addEventListener("click", handleBack);
    dom.openMatchHub.addEventListener("click", () => goRoute("match"));
    dom.openAnalysisBtn.addEventListener("click", () => {
      window.location.href = "/analysis";
    });
    dom.openLibraryBtn.addEventListener("click", () => goRoute("library"));
    dom.showJoinRoom.addEventListener("click", () => setLobbyMode("join"));
    dom.showCreateRoom.addEventListener("click", () => setLobbyMode("create"));
    dom.joinRoomForm.addEventListener("submit", onJoinRoom);
    dom.createRoomForm.addEventListener("submit", onCreateRoom);
    dom.yourTimeRange.addEventListener("input", updateTimeLabels);
    dom.opponentTimeRange.addEventListener("input", updateTimeLabels);
    dom.pickRed.addEventListener("click", () => setCreateSide("w"));
    dom.pickBlack.addEventListener("click", () => setCreateSide("b"));
    dom.resumeRoomBtn.addEventListener("click", () => {
      if (state.room) goRoute("room");
      else void resumeStoredRoom();
    });
    dom.profileButton.addEventListener("click", openProfileModal);
    dom.closeProfileBtn.addEventListener("click", closeProfileModal);
    if (dom.openAdminBtn) dom.openAdminBtn.addEventListener("click", openAdminPanel);
    if (dom.logoutBtn) dom.logoutBtn.addEventListener("click", logout);
    dom.adminRefreshBtn.addEventListener("click", () => {
      void loadAdminUsers(true);
    });
    dom.copyRoomKeyBtn.addEventListener("click", () => copyText(state.room?.key || ""));
    dom.undoRequestBtn.addEventListener("click", () => requestRoomAction("undo"));
    dom.drawRequestBtn.addEventListener("click", () => requestRoomAction("draw"));
    dom.resignBtn.addEventListener("click", confirmResign);
    dom.roomReadyBtn.addEventListener("click", onRoomReadyClick);
    dom.leaveRoomBtn.addEventListener("click", onLeaveRoomClick);
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

  async function warmPortalAssets() {
    const warmedVersion = readPersistentValue(STORAGE_ASSET_WARMUP_VERSION);
    const needsBlockingWarmup = warmedVersion !== ASSET_WARMUP_VERSION;
    state.assetWarmupPending = needsBlockingWarmup;
    renderAssetPreloadOverlay();

    const normalizedAssets = [...new Set(PORTAL_PRELOAD_ASSETS)];
    if (!normalizedAssets.length) return;

    const tasks = [
      cacheStaticAssets(normalizedAssets),
      decodeImageAssets(normalizedAssets)
    ];

    if (!needsBlockingWarmup) {
      await Promise.allSettled(tasks);
      return;
    }

    try {
      await Promise.all(tasks);
      writePersistentValue(STORAGE_ASSET_WARMUP_VERSION, ASSET_WARMUP_VERSION);
    } catch {}
  }

  function renderAssetPreloadOverlay() {
    if (!dom.assetPreloadOverlay) return;
    const visible = Boolean(state.assetWarmupPending);
    dom.assetPreloadOverlay.classList.toggle("hidden", !visible);
    document.body.classList.toggle("asset-preload-active", visible);
    if (visible && dom.assetPreloadText) {
      dom.assetPreloadText.textContent = "Đang tải tài nguyên lần đầu để bàn cờ hiển thị mượt hơn...";
    }
  }

  async function cacheStaticAssets(assets) {
    if (!("caches" in window)) return;
    const cache = await caches.open(`dmaihxcai-portal-runtime-${ASSET_WARMUP_VERSION}`);
    await Promise.all(assets.map(async (asset) => {
      try {
        const existing = await cache.match(asset);
        if (existing) return;
        const response = await fetch(asset, { cache: "force-cache" });
        if (response && response.ok) await cache.put(asset, response.clone());
      } catch {}
    }));
  }

  async function decodeImageAssets(assets) {
    const imageAssets = assets.filter((asset) => /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(asset));
    await Promise.all(imageAssets.map((asset) => decodeImageAsset(asset)));
  }

  function decodeImageAsset(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = src;
      const finish = () => resolve();
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

  async function bootstrap() {
    try {
      if (!state.token) {
        await ensureGuestSession(state.user?.displayName || "");
      }
      const [session, historyPayload, currentRoom] = await Promise.all([
        api("/api/auth/me"),
        api("/api/history"),
        api("/api/rooms/current")
      ]);
      applySession(session.user, session.token);
      state.history = mergeHistoryLists(historyPayload.history, state.history);
      renderHistory();
      if (currentRoom.room) applyRoomState(currentRoom.room, { forceBoard: true, keepSelection: false });
    } catch (error) {
      if (!/UNAUTHORIZED/i.test(String(error?.message || ""))) throw error;
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      state.token = "";
      state.user = null;
      await ensureGuestSession("");
      const [historyPayload, currentRoom] = await Promise.all([
        api("/api/history"),
        api("/api/rooms/current")
      ]);
      state.history = mergeHistoryLists(historyPayload.history, state.history);
      renderHistory();
      if (currentRoom.room) applyRoomState(currentRoom.room, { forceBoard: true, keepSelection: false });
    }
  }

  async function ensureGuestSession(displayName) {
    let safeDisplayName = "";
    if (displayName) {
      const checked = validateDisplayNameInput(displayName);
      if (!checked.ok) throw new Error(checked.message);
      safeDisplayName = checked.value;
    }
    const payload = await api("/api/auth/guest", {
      method: "POST",
      body: {
        deviceId: state.deviceId,
        avatarUrl: state.deviceAvatarUrl,
        ...(safeDisplayName ? { displayName: safeDisplayName } : {})
      }
    });
    applySession(payload.user, payload.token);
    return payload.user;
  }

  function syncViewportHeight() {
    document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
  }

  function isCompactMobile() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  function setupRoomMobileDock() {
    roomMobilePanelButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setRoomMobilePanel(button.dataset.roomMobileMode || "control");
      });
    });
    roomMobileActionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        handleRoomMobileAction(button.dataset.roomMobileAction || "");
      });
    });
  }

  function handleRoomMobileAction(action) {
    switch (action) {
      case "ready":
        dom.roomReadyBtn.click();
        break;
      case "undo":
        dom.undoRequestBtn.click();
        break;
      case "draw":
        dom.drawRequestBtn.click();
        break;
      case "resign":
        dom.resignBtn.click();
        break;
      case "leave":
        dom.leaveRoomBtn.click();
        break;
      default:
        break;
    }
  }

  function setRoomMobilePanel(panel) {
    state.roomMobilePanel = panel || "control";
    renderRoomMobilePanels();
  }

  function renderRoomMobilePanels() {
    const compact = isCompactMobile();
    document.body.classList.toggle("portal-mobile-mode", compact);
    document.body.dataset.route = state.route || "home";
    roomMobilePanels.forEach((panel) => {
      const mode = panel.dataset.roomMobilePanel || "control";
      panel.classList.toggle("is-mobile-active", !compact || mode === state.roomMobilePanel);
    });
    roomMobilePanelButtons.forEach((button) => {
      button.classList.toggle("active", compact && button.dataset.roomMobileMode === state.roomMobilePanel);
    });
  }

  function syncRoomMobileActionState() {
    const readyButton = document.querySelector("[data-room-mobile-action='ready']");
    const undoButton = document.querySelector("[data-room-mobile-action='undo']");
    const drawButton = document.querySelector("[data-room-mobile-action='draw']");
    const resignButton = document.querySelector("[data-room-mobile-action='resign']");
    const leaveButton = document.querySelector("[data-room-mobile-action='leave']");

    if (dom.roomUndoDockCount) dom.roomUndoDockCount.textContent = dom.undoCount.textContent || "0";
    if (dom.roomDrawDockCount) dom.roomDrawDockCount.textContent = dom.drawCount.textContent || "0";
    if (readyButton) readyButton.disabled = dom.roomReadyBtn.classList.contains("hidden") || dom.roomReadyBtn.disabled;
    if (undoButton) undoButton.disabled = dom.undoRequestBtn.disabled;
    if (drawButton) drawButton.disabled = dom.drawRequestBtn.disabled;
    if (resignButton) resignButton.disabled = dom.resignBtn.disabled;
    if (leaveButton) leaveButton.disabled = dom.leaveRoomBtn.disabled;
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

  function updateTimeLabels() {
    const yourMinutes = Number(dom.yourTimeRange.value || 10);
    const opponentMinutes = Number(dom.opponentTimeRange.value || 10);
    dom.yourTimeRangeValue.textContent = `${yourMinutes} phút`;
    dom.opponentTimeRangeValue.textContent = `${opponentMinutes} phút`;
  }

  function normalizeRoute(hash) {
    const value = String(hash || location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (["home", "match", "library", "admin", "room", "review"].includes(value)) return value;
    return "home";
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
    if (state.booting) route = "home";
    else if (route === "room" && !state.room) route = "match";
    else if (route === "admin" && !isAdmin()) route = "home";
    else if (route === "review" && !state.reviewGame) route = "library";

    state.route = route;
    document.body.dataset.route = route;
    if (replaceIfNeeded || location.hash !== `#${route}`) {
      history.replaceState(null, "", `#${route}`);
    }

    dom.authView.classList.add("hidden");
    dom.homeView.classList.toggle("hidden", route !== "home");
    dom.matchHubView.classList.toggle("hidden", route !== "match");
    dom.libraryView.classList.toggle("hidden", route !== "library");
    dom.adminView.classList.toggle("hidden", route !== "admin");
    dom.roomView.classList.toggle("hidden", route !== "room");
    dom.reviewView.classList.toggle("hidden", route !== "review");
    dom.headerProfile.classList.remove("hidden");

    if (route === "room" && state.room) {
      startRoomPolling();
      renderRoomState({ forceBoard: true, keepSelection: true });
    } else {
      stopRoomPolling();
    }

    if (route === "review") {
      renderReviewState(true);
    }
    if (route === "admin") {
      renderAdminState();
      if (isAdmin() && !state.adminUsers.length && !state.adminLoading) {
        void loadAdminUsers();
      }
    }

    updateResumeButton();
    renderProfile();
    renderRoomMobilePanels();
  }

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    goRoute(state.room ? "room" : "home", true);
  }

  function applySession(user, token) {
    state.user = user ? {
      ...user,
      avatarUrl: user.avatarUrl || state.deviceAvatarUrl
    } : null;
    if (token) {
      state.token = token;
      localStorage.setItem(STORAGE_TOKEN, token);
    }
    persistStoredUser(state.user);
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
    state.history = readStoredHistory();
    state.room = null;
    state.roomKey = "";
    state.reviewGame = null;
    state.reviewCursor = 0;
    state.reviewAnalysis = [];
    state.reviewAnalyzing = false;
    state.reviewBoard = XiangqiCore.parseFenState(START_FEN).board;
    state.reviewContextBoard = XiangqiCore.parseFenState(START_FEN).board;
    state.reviewLastMoveSquare = null;
    state.reviewSideToMove = "w";
    state.selectedSquare = null;
    state.hints = [];
    state.roomPieceSlots = null;
    state.roomHintSlots = null;
    state.roomSlotLayoutKey = "";
    state.lastBoardFrame = "";
    state.lastPieceFrame = "";
    state.reviewLastBoardFrame = "";
    state.reviewLastPieceFrame = "";
    state.reviewPieceSlots = null;
    state.reviewSlotLayoutKey = "";
    state.adminUsers = [];
    state.adminSelectedUserId = "";
    state.adminLoading = false;
    state.lastChatSignature = "";
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_ROOM);
    closeProfileModal();
    renderHistory();
    renderAdminState();
    renderProfile();
  }

  async function logout() {
    clearSession();
    try {
      await ensureGuestSession("");
    } catch {}
    goRoute("home", true);
    showToast("Đã chuyển sang phiên thiết bị mới.");
  }

  function openProfileModal() {
    if (!state.user) return;
    renderProfile();
    dom.profileModal.classList.remove("hidden");
  }

  function closeProfileModal() {
    dom.profileModal.classList.add("hidden");
  }

  async function openAdminPanel() {
    if (!isAdmin()) return;
    closeProfileModal();
    goRoute("admin");
    await loadAdminUsers(true);
  }

  async function refreshHistory() {
    if (!state.token) return;
    try {
      const payload = await api("/api/history");
      state.history = mergeHistoryLists(payload.history, state.history);
      renderHistory();
    } catch {}
  }

  function renderProfile() {
    if (!state.user) {
      const deviceAvatar = {
        displayName: "Thiết bị",
        avatarSeed: state.deviceId,
        avatarUrl: state.deviceAvatarUrl
      };
      if (dom.profileName) dom.profileName.textContent = "";
      if (dom.profileUsername) dom.profileUsername.textContent = "";
      dom.profileButton.title = "Ảnh đại diện thiết bị";
      dom.profileButton.setAttribute("aria-label", "Ảnh đại diện thiết bị");
      paintAvatar(dom.profileAvatar, deviceAvatar, "D");
      paintAvatar(dom.profileAvatarLarge, deviceAvatar, "D");
      if (dom.openAdminBtn) dom.openAdminBtn.classList.add("hidden");
      if (dom.logoutBtn) dom.logoutBtn.classList.add("hidden");
      return;
    }

    const displayName = state.user.displayName || state.user.username || "Thiết bị";
    if (dom.profileName) dom.profileName.textContent = "";
    if (dom.profileUsername) dom.profileUsername.textContent = "";
    dom.profileButton.title = state.user.role === "admin" ? `${displayName} (@${state.user.username})` : displayName;
    dom.profileButton.setAttribute("aria-label", `Ảnh đại diện của ${displayName}`);
    if (dom.openAdminBtn) dom.openAdminBtn.classList.toggle("hidden", !isAdmin());
    if (dom.logoutBtn) dom.logoutBtn.classList.toggle("hidden", !isAdmin());
    paintAvatar(dom.profileAvatar, state.user);
    paintAvatar(dom.profileAvatarLarge, state.user);
  }

  function renderHistory() {
    persistStoredHistory(state.history);
    const options = {
      emptyText: "Chưa có ván nào được lưu.",
      onOpen: openHistoryReview
    };
    renderHistoryCollection(dom.libraryHistoryList, state.history, options);
  }

  async function loadAdminUsers(force = false) {
    if (!isAdmin()) return;
    if (state.adminLoading && !force) return;
    state.adminLoading = true;
    renderAdminState();
    try {
      const payload = await api("/api/admin/users");
      state.adminUsers = Array.isArray(payload.users) ? payload.users.map((user) => ({
        ...user,
        history: normalizeHistoryList(user.history)
      })) : [];
      if (!state.adminUsers.some((user) => user.id === state.adminSelectedUserId)) {
        state.adminSelectedUserId = state.adminUsers[0]?.id || "";
      }
    } catch (error) {
      showToast(error.message || "Không thể tải danh sách thành viên.");
    } finally {
      state.adminLoading = false;
      renderAdminState();
    }
  }

  function renderAdminState() {
    if (!dom.adminUsersList || !dom.adminHistoryList) return;
    if (!isAdmin()) {
      dom.adminUsersMeta.textContent = "Chỉ tài khoản quản trị mới xem được khu này.";
      dom.adminSelectedTitle.textContent = "Lịch sử thành viên";
      dom.adminSelectedMeta.textContent = "Bạn không có quyền truy cập.";
      dom.adminUsersList.innerHTML = "";
      dom.adminHistoryList.innerHTML = "";
      return;
    }

    dom.adminRefreshBtn.disabled = state.adminLoading;
    dom.adminRefreshBtn.textContent = state.adminLoading ? "Đang tải..." : "Làm mới";
    dom.adminUsersMeta.textContent = state.adminUsers.length
      ? `${state.adminUsers.length} tài khoản đã đăng ký.`
      : state.adminLoading
        ? "Đang tải danh sách tài khoản đã đăng ký."
        : "Chưa có tài khoản nào.";

    dom.adminUsersList.innerHTML = "";
    if (!state.adminUsers.length) {
      const emptyUsers = document.createElement("div");
      emptyUsers.className = "history-empty";
      emptyUsers.textContent = state.adminLoading ? "Đang tải..." : "Chưa có tài khoản nào.";
      dom.adminUsersList.appendChild(emptyUsers);
    } else {
      state.adminUsers.forEach((user) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `admin-user-card ${state.adminSelectedUserId === user.id ? "active" : ""}`;
        button.addEventListener("click", () => {
          state.adminSelectedUserId = user.id;
          renderAdminState();
        });

        const avatar = document.createElement("span");
        avatar.className = "avatar";
        paintAvatar(avatar, user, "U");

        const meta = document.createElement("div");
        meta.className = "admin-user-meta";
        const name = document.createElement("strong");
        name.textContent = user.displayName || user.username;
        const username = document.createElement("small");
        username.textContent = `@${user.username}`;
        const detail = document.createElement("span");
        const roleLabel = user.role === "admin" ? " • Quản trị" : "";
        detail.textContent = `${user.historyCount || 0} ván${roleLabel}`;
        meta.append(name, username, detail);
        button.append(avatar, meta);
        dom.adminUsersList.appendChild(button);
      });
    }

    const selected = state.adminUsers.find((user) => user.id === state.adminSelectedUserId) || null;
    dom.adminSelectedTitle.textContent = selected
      ? `Lịch sử của ${selected.displayName || selected.username}`
      : "Lịch sử thành viên";
    dom.adminSelectedMeta.textContent = selected
      ? `${selected.email || `@${selected.username}`} • Tham gia ${formatDate(selected.createdAt)}`
      : "Chọn một tài khoản để xem các ván đã lưu.";
    renderHistoryCollection(dom.adminHistoryList, selected?.history || [], {
      emptyText: selected ? "Tài khoản này chưa có ván nào được lưu." : "Chọn một tài khoản để xem lịch sử đấu.",
      onOpen: openHistoryReview
    });
  }

  function renderHistoryCollection(container, entries, { emptyText, onOpen }) {
    if (!container) return;
    container.innerHTML = "";
    const list = Array.isArray(entries) ? entries.slice(0, 20) : [];
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }

    list.forEach((entry) => {
      container.appendChild(buildHistoryItem(entry, onOpen));
    });
  }

  function buildHistoryItem(entry, onOpen) {
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
    item.addEventListener("click", () => onOpen(entry));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen(entry);
      }
    });
    return item;
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
    state.reviewPieceSlots = null;
    state.reviewSlotLayoutKey = "";
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
      state.reviewLastMoveSquare = null;
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
    state.reviewLastMoveSquare = limit > 0 ? uciToSquare(state.reviewGame.plies[limit - 1].move.slice(2, 4)) : null;
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
      dom.reviewInsight.innerHTML = "<strong>Bắt đầu ván cờ</strong><div>Hãy bấm Tiếp theo để đi từng nước, hoặc bấm Phân tích để Pikafish quét toàn bộ ván.</div>";
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
    const badge = reviewBadgeForGrade(analysis.grade);
    dom.reviewInsight.innerHTML = `<strong>Nước ${currentIndex + 1}: ${moveTitle} - ${analysis.gradeLabel || badge.label || "Đã phân tích"}</strong><div>${recommendText}</div>`;
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
      button.appendChild(createReviewBadgeChip(analysis.grade, analysis.gradeLabel));
    }

    cell.appendChild(button);
    return cell;
  }

  function createReviewBadgeChip(grade, label) {
    const badgeInfo = reviewBadgeForGrade(grade);
    const badge = document.createElement("span");
    badge.className = `review-grade ${badgeInfo.key || ""}`.trim();

    if (badgeInfo.image) {
      const icon = document.createElement("span");
      icon.className = "review-grade-icon";
      icon.style.backgroundImage = `url("${badgeInfo.image}")`;
      badge.appendChild(icon);
    }

    const text = document.createElement("span");
    text.textContent = label || badgeInfo.label || "";
    badge.appendChild(text);
    return badge;
  }

  function createReviewPieceBadge(grade) {
    const badgeInfo = reviewBadgeForGrade(grade);
    if (!badgeInfo.image) return null;
    const icon = document.createElement("span");
    icon.className = `review-badge-icon ${badgeInfo.key || ""}`.trim();
    icon.style.backgroundImage = `url("${badgeInfo.image}")`;
    return icon;
  }

  async function onCreateRoom(event) {
    event.preventDefault();
    const checkedName = validateDisplayNameInput(dom.createDisplayName.value);
    if (!checkedName.ok) {
      setMessage(dom.matchHubMessage, checkedName.message);
      return;
    }
    const displayName = checkedName.value;
    dom.createDisplayName.value = displayName;
    setMessage(dom.matchHubMessage, "Đang tạo phòng...", "info");
    try {
      await ensureGuestSession(displayName);
      const payload = await api("/api/rooms/create", {
        method: "POST",
        body: {
          displayName,
          yourMinutes: Number(dom.yourTimeRange.value || 10),
          opponentMinutes: Number(dom.opponentTimeRange.value || 10),
          incrementSeconds: Number(dom.incrementSelect.value || 0),
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
    const checkedName = validateDisplayNameInput(dom.joinDisplayName.value);
    const key = dom.joinRoomKey.value.trim().toUpperCase();
    if (!checkedName.ok) {
      setMessage(dom.matchHubMessage, checkedName.message);
      return;
    }
    const displayName = checkedName.value;
    dom.joinDisplayName.value = displayName;
    setMessage(dom.matchHubMessage, "Đang vào phòng...", "info");
    try {
      await ensureGuestSession(displayName);
      const payload = await api("/api/rooms/join", {
        method: "POST",
        body: { key, displayName }
      });
      dom.joinDisplayName.value = "";
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
    const shouldFlashTurn = shouldTriggerTurnFlash(previous, room);

    state.room = room || null;
    if (!room) {
      state.roomKey = "";
      localStorage.removeItem(STORAGE_ROOM);
      state.selectedSquare = null;
      state.hints = [];
      state.roomBoard = XiangqiCore.parseFenState(START_FEN).board;
      state.roomPieceSlots = null;
      state.roomHintSlots = null;
      state.roomSlotLayoutKey = "";
      clearTurnFlash();
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
    if (shouldFlashTurn) triggerTurnFlash();
    else if (room.role !== "player" || !room.yourTurn || room.status !== "active" || room.result) clearTurnFlash();

    if (!wasFinished && isFinished) {
      void refreshHistory();
    }
  }

  function shouldTriggerTurnFlash(previousRoom, nextRoom) {
    if (!previousRoom || !nextRoom || nextRoom.role !== "player") return false;
    if (previousRoom.key !== nextRoom.key) return false;
    if (nextRoom.status !== "active" || nextRoom.result) return false;
    const yourSide = nextRoom.yourSide;
    if (!yourSide) return false;
    const previousMoveCount = Array.isArray(previousRoom.moves) ? previousRoom.moves.length : 0;
    const nextMoveCount = Array.isArray(nextRoom.moves) ? nextRoom.moves.length : 0;
    const boardChanged = previousRoom.boardFen !== nextRoom.boardFen || previousMoveCount !== nextMoveCount;
    if (!boardChanged) return false;
    return previousRoom.sideToMove !== yourSide && nextRoom.sideToMove === yourSide;
  }

  function clearTurnFlash() {
    if (state.roomTurnFlashTimer) {
      clearTimeout(state.roomTurnFlashTimer);
      state.roomTurnFlashTimer = 0;
    }
    [dom.selfBadge, dom.bottomPlayerAvatar, dom.bottomClock].forEach((element) => {
      if (element) element.classList.remove("turn-flash");
    });
  }

  function triggerTurnFlash() {
    clearTurnFlash();
    const targets = [dom.selfBadge, dom.bottomPlayerAvatar, dom.bottomClock].filter(Boolean);
    if (!targets.length) return;
    void dom.selfBadge?.offsetWidth;
    targets.forEach((element) => element.classList.add("turn-flash"));
    state.roomTurnFlashTimer = window.setTimeout(() => {
      clearTurnFlash();
    }, 2050);
  }

  function updateResumeButton() {
    const key = state.room?.key || state.roomKey || localStorage.getItem(STORAGE_ROOM) || "";
    const hiddenOnHome = state.route === "home";
    dom.resumeRoomBtn.classList.toggle("hidden", !key || !state.user || hiddenOnHome);
    if (key) dom.resumeRoomBtn.textContent = `Phòng ${key}`;
  }

  function renderRoomState({ forceBoard = false } = {}) {
    materializeLocalRoomPhase();
    renderRoomMeta();
    renderRequestState();
    renderViewerList();
    renderChat();
    renderMoveList();
    renderRoomOverlay();
    renderRoomMobilePanels();
    drawRoomScene(forceBoard);
  }

  function materializeLocalRoomPhase() {
    const room = state.room;
    if (!room) return;
    const countdownEndsAt = Number(room.countdownEndsAt || 0);
    if (room.status === "starting" && countdownEndsAt > 0 && Date.now() >= countdownEndsAt) {
      room.status = "active";
      room.sideToMove = "w";
      room.countdownEndsAt = 0;
      room.yourTurn = room.role === "player" && room.yourSide === "w";
      state.roomSyncedAt = countdownEndsAt;
    }
  }

  function renderRoomMeta() {
    const room = state.room;
    if (!room) {
      dom.roomKeyLabel.textContent = "------";
      dom.roomStatusBadge.textContent = "Chưa vào phòng";
      dom.roomSummary.textContent = "Phòng đang được chuẩn bị.";
      dom.undoCount.textContent = "0";
      dom.drawCount.textContent = "0";
      dom.requestState.innerHTML = "";
      dom.requestState.classList.add("hidden");
      dom.roomReadyBtn.classList.add("hidden");
      dom.roomReadyBtn.disabled = true;
      dom.leaveRoomBtn.disabled = true;
      paintAvatar(dom.topPlayerAvatar, null, "?");
      paintAvatar(dom.bottomPlayerAvatar, null, "?");
      dom.topPlayerName.textContent = "Đang chờ đối thủ";
      dom.bottomPlayerName.textContent = "Bạn";
      dom.topSideLabel.textContent = "Đen";
      dom.bottomSideLabel.textContent = "Đỏ";
      renderRoomClocks();
      syncRoomMobileActionState();
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

    const showReadyButton = room.role === "player" && (room.status === "ready" || room.status === "finished");
    dom.roomReadyBtn.classList.toggle("hidden", !showReadyButton);
    if (room.status === "finished") {
      dom.roomReadyBtn.textContent = room.rematchReady?.you ? "Đã sẵn sàng ván mới" : "Sẵn sàng ván mới";
      dom.roomReadyBtn.disabled = !!state.roomActionBusy;
    } else {
      dom.roomReadyBtn.textContent = room.startReady?.you ? "Đã sẵn sàng" : "Sẵn sàng";
      dom.roomReadyBtn.disabled = !!state.roomActionBusy || !room.bothPlayersJoined;
    }
    dom.leaveRoomBtn.disabled = !!state.roomActionBusy;

    renderRoomClocks();
    syncRoomMobileActionState();
  }

  function renderRequestState() {
    dom.requestState.innerHTML = "";
    dom.requestState.classList.add("hidden");
  }

  function renderRoomOverlay() {
    const room = state.room;
    dom.roomOverlayActions.innerHTML = "";
    dom.roomOverlayTitle.textContent = "";
    dom.roomOverlayText.textContent = "";
    dom.roomBoardOverlay.classList.add("hidden");
    if (!room) return;

    if (room.status === "starting") {
      dom.roomOverlayTitle.textContent = "Bắt đầu!";
      dom.roomOverlayText.textContent = "Đỏ đi trước. Đồng hồ sẽ chạy ngay sau khi bảng này biến mất.";
      dom.roomBoardOverlay.classList.remove("hidden");
      return;
    }

    if (room.pendingRequest?.fromYou) {
      dom.roomOverlayTitle.textContent = "Đang chờ đối thủ xác nhận...";
      dom.roomOverlayText.textContent = room.pendingRequest.type === "undo"
        ? "Yêu cầu đi lại của bạn đã được gửi. Bàn cờ sẽ tiếp tục ngay khi đối thủ phản hồi."
        : "Yêu cầu hòa của bạn đã được gửi. Bàn cờ sẽ tiếp tục ngay khi đối thủ phản hồi.";
      dom.roomBoardOverlay.classList.remove("hidden");
      return;
    }

    if (room.pendingRequest?.toYou) {
      dom.roomOverlayTitle.textContent = room.pendingRequest.type === "undo" ? "Đối thủ xin đi lại" : "Đối thủ cầu hòa";
      dom.roomOverlayText.textContent = room.pendingRequest.type === "undo"
        ? "Nếu đồng ý, nước cờ gần nhất sẽ được thực hiện lại."
        : "Nếu đồng ý, ván cờ sẽ được xử hòa ngay.";

      const accept = document.createElement("button");
      accept.className = "primary-button";
      accept.type = "button";
      accept.textContent = "Đồng ý";
      accept.disabled = !!state.roomActionBusy;
      accept.addEventListener("click", () => respondRequest(true));

      const decline = document.createElement("button");
      decline.className = "secondary-button";
      decline.type = "button";
      decline.textContent = "Không";
      decline.disabled = !!state.roomActionBusy;
      decline.addEventListener("click", () => respondRequest(false));

      dom.roomOverlayActions.append(accept, decline);
      dom.roomBoardOverlay.classList.remove("hidden");
      return;
    }

    if (room.role === "spectator" && room.pendingRequest) {
      dom.roomOverlayTitle.textContent = "Hai người chơi đang xử lý yêu cầu";
      dom.roomOverlayText.textContent = room.pendingRequest.type === "undo"
        ? "Một người chơi đang xin đi lại."
        : "Một người chơi đang cầu hòa.";
      dom.roomBoardOverlay.classList.remove("hidden");
      return;
    }

    if (!room.result) return;

    dom.roomOverlayTitle.textContent = resultTitle(room);
    dom.roomOverlayText.textContent = resultDetail(room);

    if (room.role === "player") {
      const ready = document.createElement("button");
      ready.className = room.rematchReady?.you ? "primary-button" : "secondary-button";
      ready.type = "button";
      ready.textContent = room.rematchReady?.you ? "Đã sẵn sàng ván mới" : "Sẵn sàng ván mới";
      ready.disabled = !!state.roomActionBusy;
      ready.addEventListener("click", toggleRematch);
      dom.roomOverlayActions.appendChild(ready);
    }

    const leave = document.createElement("button");
    leave.className = "ghost-button";
    leave.type = "button";
    leave.textContent = "Out phòng";
    leave.disabled = !!state.roomActionBusy;
    leave.addEventListener("click", onLeaveRoomClick);
    dom.roomOverlayActions.appendChild(leave);

    dom.roomBoardOverlay.classList.remove("hidden");
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
      sub.textContent = "Người xem";
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

  function renderRoomAfterLocalMove() {
    materializeLocalRoomPhase();
    renderRoomMeta();
    renderRequestState();
    renderMoveList();
    renderRoomOverlay();
    renderRoomMobilePanels();
    drawRoomPieces(true);
  }

  function drawRoomScene(forceBoard) {
    state.roomDrawForce = state.roomDrawForce || Boolean(forceBoard);
    if (state.roomDrawFrame) return;
    state.roomDrawFrame = window.requestAnimationFrame(() => {
      const force = state.roomDrawForce;
      state.roomDrawFrame = 0;
      state.roomDrawForce = false;
      drawRoomBoard(force);
      drawRoomPieces(force);
    });
  }

  function ensureRoomSlots() {
    if (dom.roomView.classList.contains("hidden")) return { pieceSlots: [], hintSlots: [] };
    const rect = dom.roomBoard.getBoundingClientRect();
    if (!rect.width || !rect.height) return { pieceSlots: [], hintSlots: [] };
    const layoutKey = `${Math.round(rect.width)}x${Math.round(rect.height)}|${viewSide()}`;
    if (
      state.roomPieceSlots &&
      state.roomHintSlots &&
      state.roomPieceSlots.length === 90 &&
      state.roomHintSlots.length === 90 &&
      state.roomSlotLayoutKey === layoutKey
    ) {
      return { pieceSlots: state.roomPieceSlots, hintSlots: state.roomHintSlots };
    }

    state.roomSlotLayoutKey = layoutKey;
    state.roomPieceSlots = [];
    state.roomHintSlots = [];

    const pieceFragment = document.createDocumentFragment();
    const hintFragment = document.createDocumentFragment();
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const pixel = squareToPixel({ x, y });

        const hint = document.createElement("div");
        hint.className = "hint";
        hint.style.left = `${pixel.x}px`;
        hint.style.top = `${pixel.y}px`;
        hint.setAttribute("aria-hidden", "true");
        hintFragment.appendChild(hint);
        state.roomHintSlots.push(hint);

        const piece = document.createElement("div");
        piece.className = "piece image-piece";
        piece.style.left = `${pixel.x}px`;
        piece.style.top = `${pixel.y}px`;
        piece.setAttribute("aria-hidden", "true");
        const image = document.createElement("img");
        image.className = "piece-skin";
        image.alt = "";
        image.decoding = "async";
        image.loading = "eager";
        image.draggable = false;
        piece.appendChild(image);
        pieceFragment.appendChild(piece);
        state.roomPieceSlots.push(piece);
      }
    }

    dom.roomMarks.replaceChildren(hintFragment);
    dom.roomPieces.replaceChildren(pieceFragment);
    return { pieceSlots: state.roomPieceSlots, hintSlots: state.roomHintSlots };
  }

  function drawReviewScene(forceBoard) {
    state.reviewDrawForce = state.reviewDrawForce || Boolean(forceBoard);
    if (state.reviewDrawFrame) return;
    state.reviewDrawFrame = window.requestAnimationFrame(() => {
      const force = state.reviewDrawForce;
      state.reviewDrawFrame = 0;
      state.reviewDrawForce = false;
      drawReviewBoard(force);
      drawReviewPieces(force);
      drawReviewArrow();
    });
  }

  function ensureReviewSlots() {
    if (dom.reviewView.classList.contains("hidden")) return [];
    const rect = dom.reviewBoard.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];
    const layoutKey = `${Math.round(rect.width)}x${Math.round(rect.height)}|${reviewViewSide()}`;
    if (state.reviewPieceSlots && state.reviewPieceSlots.length === 90 && state.reviewSlotLayoutKey === layoutKey) {
      return state.reviewPieceSlots;
    }

    state.reviewSlotLayoutKey = layoutKey;
    state.reviewPieceSlots = [];
    const fragment = document.createDocumentFragment();
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const pixel = reviewSquareToPixel({ x, y });
        const piece = document.createElement("div");
        piece.className = "piece image-piece";
        piece.style.left = `${pixel.x}px`;
        piece.style.top = `${pixel.y}px`;
        piece.setAttribute("aria-hidden", "true");
        const image = document.createElement("img");
        image.className = "piece-skin";
        image.alt = "";
        image.decoding = "async";
        image.loading = "eager";
        image.draggable = false;
        piece.appendChild(image);
        fragment.appendChild(piece);
        state.reviewPieceSlots.push(piece);
      }
    }
    dom.reviewPieces.replaceChildren(fragment);
    return state.reviewPieceSlots;
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
    ctx.strokeStyle = "rgba(82, 53, 25, 0.78)";
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
    ctx.fillStyle = "rgba(102, 57, 15, 0.86)";
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
    const { pieceSlots, hintSlots } = ensureRoomSlots();
    if (!pieceSlots.length || !hintSlots.length) return;
    const hintIndexes = new Set(state.hints.map((square) => square.y * 9 + square.x));

    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const index = y * 9 + x;
        const piece = board[y]?.[x] || "";
        const el = pieceSlots[index];
        if (!piece) {
          el.classList.remove("is-visible");
          el.classList.remove("selected", "in-check");
          if (el.dataset.piece) {
            el.dataset.piece = "";
            el.removeAttribute("aria-label");
          }
          el.setAttribute("aria-hidden", "true");
        } else {
          el.classList.add("is-visible");
          el.classList.toggle("selected", Boolean(state.selectedSquare && state.selectedSquare.x === x && state.selectedSquare.y === y));
          el.classList.toggle("in-check", piece.toLowerCase() === "k" && checkedSides[XiangqiCore.pieceColor(piece)]);
          if (el.dataset.piece !== piece) {
            el.dataset.piece = piece;
            const image = el.querySelector(".piece-skin");
            if (image) {
              image.src = PIECE_IMAGES[piece];
              image.alt = piece;
            }
            el.setAttribute("aria-label", piece);
          }
          el.setAttribute("aria-hidden", "false");
        }

        const mark = hintSlots[index];
        const showHint = hintIndexes.has(index);
        mark.classList.toggle("is-visible", showHint);
        mark.setAttribute("aria-hidden", showHint ? "false" : "true");
      }
    }
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
    ctx.strokeStyle = "rgba(82, 53, 25, 0.78)";
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
    ctx.fillStyle = "rgba(102, 57, 15, 0.86)";
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
    const slots = ensureReviewSlots();
    if (!slots.length) return;
    const movedSquare = state.reviewLastMoveSquare;
    const badge = reviewBadgeForGrade(currentAnalysis?.grade || "");

    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const index = y * 9 + x;
        const piece = board[y]?.[x] || "";
        const el = slots[index];
        if (!piece) {
          el.classList.remove("is-visible");
          el.classList.remove("in-check", "review-current", "review-badge", "review-grade-brilliant", "review-grade-good", "review-grade-okay", "review-grade-bad");
          if (el.dataset.piece) {
            el.dataset.piece = "";
            el.removeAttribute("aria-label");
          }
          [...el.childNodes]
            .filter((node) => !node.classList || !node.classList.contains("piece-skin"))
            .forEach((node) => node.remove());
          el.setAttribute("aria-hidden", "true");
          continue;
        }

        el.classList.add("is-visible");
        el.classList.remove("review-current", "review-badge", "review-grade-brilliant", "review-grade-good", "review-grade-okay", "review-grade-bad");
        if (el.dataset.piece !== piece) {
          el.dataset.piece = piece;
          const image = el.querySelector(".piece-skin");
          if (image) {
            image.src = PIECE_IMAGES[piece];
            image.alt = piece;
          }
          el.setAttribute("aria-label", piece);
        }
        el.classList.toggle("in-check", piece.toLowerCase() === "k" && checkedSides[XiangqiCore.pieceColor(piece)]);
        el.setAttribute("aria-hidden", "false");
        [...el.childNodes]
          .filter((node) => !node.classList || !node.classList.contains("piece-skin"))
          .forEach((node) => node.remove());
        if (movedSquare && movedSquare.x === x && movedSquare.y === y) {
          el.classList.add("review-current");
          if (badge.image) {
            el.classList.add("review-badge", `review-grade-${badge.key}`);
            const badgeIcon = createReviewPieceBadge(badge.key);
            if (badgeIcon) el.appendChild(badgeIcon);
          }
        }
      }
    }
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
    const palette = arrowPalette("rgba(164, 55, 205, 0.94)");
    drawStyledArrow(ctx, from, base, tip, normal, halfWidth, palette);
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
    if (!state.room) return;
    const side = state.room.yourSide;
    const previousRoom = cloneJsonValue(state.room);
    const previousBoard = state.roomBoard.map((row) => row.slice());
    const previousSyncedAt = state.roomSyncedAt;
    const localBoard = state.roomBoard.map((row) => row.slice());
    const notation = XiangqiCore.formatMoveNotation(move, state.roomBoard, side);
    const remaining = liveClockFor(side);
    XiangqiCore.applyMoveToBoard(localBoard, move);
    const localGameState = XiangqiCore.determineGameState(localBoard, oppositeSide(side));
    state.selectedSquare = null;
    state.hints = [];
    state.roomBoard = localBoard;
    state.room.boardFen = XiangqiCore.boardToFen(localBoard, oppositeSide(side));
    state.room.sideToMove = oppositeSide(side);
    state.room.yourTurn = false;
    state.room.pendingRequest = null;
    state.room.rematchReady = { you: false, opponent: false };
    state.room.clocks = {
      ...(state.room.clocks || {}),
      [side]: remaining + Number(state.room.incrementSeconds || 0) * 1000
    };
    state.room.moves = [...(state.room.moves || []), { side, move, notation }];
    if (localGameState.finished) {
      state.room.status = "finished";
      state.room.result = {
        winnerSide: localGameState.winnerSide || null,
        loserSide: localGameState.loserSide || null,
        reason: localGameState.reason || "draw",
        endedAt: new Date().toISOString()
      };
    } else {
      state.room.status = "active";
      state.room.result = null;
    }
    state.roomSyncedAt = Date.now();
    state.roomActionBusy = true;
    renderRoomAfterLocalMove();
    try {
      const payload = await api("/api/rooms/move", {
        method: "POST",
        body: { key: state.room.key, move }
      });
      state.roomActionBusy = false;
      applyRoomState(payload.room, { forceBoard: false, keepSelection: false });
    } catch (error) {
      state.room = previousRoom;
      state.roomBoard = previousBoard;
      state.roomSyncedAt = previousSyncedAt;
      state.selectedSquare = null;
      state.hints = [];
      state.roomActionBusy = false;
      renderRoomState({ forceBoard: true, keepSelection: false });
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

  function onRoomReadyClick() {
    if (!state.room || state.roomActionBusy) return;
    if (state.room.status === "finished") {
      void toggleRematch();
      return;
    }
    if (state.room.status === "ready") {
      void toggleRoomReady();
    }
  }

  async function toggleRoomReady() {
    if (!state.room || state.roomActionBusy) return;
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      const payload = await api("/api/rooms/ready", {
        method: "POST",
        body: { key: state.room.key, ready: !state.room.startReady?.you }
      });
      state.roomActionBusy = false;
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
      showToast(payload.room.status === "starting" || payload.room.status === "active" ? "Hai bên đã sẵn sàng." : "Đã cập nhật trạng thái sẵn sàng.");
    } catch (error) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(error.message || "Không thể đổi trạng thái sẵn sàng.");
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
      showToast(payload.room.status === "starting" || payload.room.status === "active" ? "Ván mới đang bắt đầu." : "Đã cập nhật trạng thái sẵn sàng.");
    } catch (error) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(error.message || "Không thể đổi trạng thái sẵn sàng.");
    }
  }

  function onLeaveRoomClick() {
    if (!state.room || state.roomActionBusy) return;
    if (state.room.status === "active" && state.room.role === "player") {
      openModal({
        title: "Rời phòng?",
        text: "Nếu rời phòng giữa ván, hệ thống sẽ xử thua cho bạn ngay lập tức.",
        confirmText: "Rời phòng",
        onConfirm: leaveRoomNow
      });
      return;
    }
    void leaveRoomNow();
  }

  async function leaveRoomNow() {
    if (!state.room || state.roomActionBusy) return;
    const room = state.room;
    if (room.status === "finished") {
      applyRoomState(null, { forceBoard: true, keepSelection: false });
      await refreshHistory();
      goRoute("match", true);
      showToast("Đã rời phòng.");
      return;
    }
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      await api("/api/rooms/leave", {
        method: "POST",
        body: { key: room.key }
      });
      state.roomActionBusy = false;
      applyRoomState(null, { forceBoard: true, keepSelection: false });
      await refreshHistory();
      goRoute("match", true);
      showToast("Đã rời phòng.");
    } catch (error) {
      state.roomActionBusy = false;
      renderRoomMeta();
      showToast(error.message || "Không thể rời phòng.");
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
    }, 600);
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
      dom.topClock.dataset.clockLabel = "10:00";
      dom.bottomClock.dataset.clockLabel = "10:00";
      dom.topClock.dataset.clockActive = "0";
      dom.bottomClock.dataset.clockActive = "0";
      dom.topClock.dataset.clockLow = "0";
      dom.bottomClock.dataset.clockLow = "0";
      dom.topClock.classList.remove("active", "low");
      dom.bottomClock.classList.remove("active", "low");
      return;
    }
    const bottomSide = room.role === "player" ? room.yourSide : "w";
    const topSide = oppositeSide(bottomSide);
    paintClock(dom.topClock, visibleClockFor(topSide), room.status === "active" && room.sideToMove === topSide);
    paintClock(dom.bottomClock, visibleClockFor(bottomSide), room.status === "active" && room.sideToMove === bottomSide);
  }

  function paintClock(element, milliseconds, active) {
    const ms = Math.max(0, milliseconds);
    const label = formatClock(ms);
    if (element.dataset.clockLabel !== label) {
      element.dataset.clockLabel = label;
      element.textContent = label;
    }
    const activeFlag = active ? "1" : "0";
    const lowFlag = ms <= 60000 ? "1" : "0";
    if (element.dataset.clockActive !== activeFlag) {
      element.dataset.clockActive = activeFlag;
      element.classList.toggle("active", !!active);
    }
    if (element.dataset.clockLow !== lowFlag) {
      element.dataset.clockLow = lowFlag;
      element.classList.toggle("low", ms <= 60000);
    }
  }

  function liveClockFor(side) {
    if (!state.room) return 0;
    let value = Number(state.room.clocks?.[side] || 0);
    if (state.room.status === "active" && state.room.sideToMove === side && !state.room.result) {
      value -= Date.now() - state.roomSyncedAt;
    }
    return Math.max(0, value);
  }

  function visibleClockFor(side) {
    if (!state.room) return 0;
    const hiddenBonus = Math.max(0, Number(state.room.hiddenClockBonusMs || 0));
    return Math.max(0, liveClockFor(side) - hiddenBonus);
  }

  function renderProfileAfterApiFailure() {
    renderProfile();
    if (state.room) renderRoomMeta();
  }

  function readOrCreateDeviceId() {
    const existing = String(readPersistentValue(STORAGE_DEVICE_ID) || "").trim();
    if (/^[a-zA-Z0-9:_-]{8,120}$/.test(existing)) return existing;
    const next = `device-${randomToken(10)}${Date.now().toString(36)}`;
    writePersistentValue(STORAGE_DEVICE_ID, next);
    return next;
  }

  function readOrCreateDeviceAvatar(deviceId) {
    const existing = String(readPersistentValue(STORAGE_DEVICE_AVATAR) || "");
    const version = String(readPersistentValue(STORAGE_DEVICE_AVATAR_VERSION) || "");
    if (version === DEVICE_AVATAR_VERSION && DEVICE_AVATARS.includes(existing)) return existing;
    const next = pickRandomDeviceAvatar(deviceId || readOrCreateDeviceId());
    writePersistentValue(STORAGE_DEVICE_AVATAR, next);
    writePersistentValue(STORAGE_DEVICE_AVATAR_VERSION, DEVICE_AVATAR_VERSION);
    return next;
  }

  function readStoredHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_DEVICE_HISTORY);
      if (!raw) return [];
      return normalizeHistoryList(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  function persistStoredHistory(entries) {
    try {
      localStorage.setItem(STORAGE_DEVICE_HISTORY, JSON.stringify(normalizeHistoryList(entries)));
    } catch {}
  }

  function mergeHistoryLists(primary, fallback) {
    const combined = [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(fallback) ? fallback : [])];
    const seen = new Set();
    return normalizeHistoryList(combined.filter((entry) => {
      const key = String(entry?.id || `${entry?.roomKey || ""}:${entry?.endedAt || ""}:${entry?.sideCode || ""}`);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }));
  }

  function readStoredUser() {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      if (!raw) return null;
      const user = JSON.parse(raw);
      if (!user || typeof user !== "object" || !user.id || !user.username) return null;
      return user;
    } catch {
      return null;
    }
  }

  function persistStoredUser(user) {
    if (!user) {
      localStorage.removeItem(STORAGE_USER);
      return;
    }
    localStorage.setItem(STORAGE_USER, JSON.stringify({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarSeed: user.avatarSeed,
      avatarUrl: user.avatarUrl || "",
      role: user.role || "user"
    }));
  }

  function isAdmin() {
    return state.user?.role === "admin";
  }

  function roomStatusText(room) {
    if (room.status === "waiting") return "Đang chờ đối thủ";
    if (room.status === "ready") return "Chờ sẵn sàng";
    if (room.status === "starting") return "Bắt đầu";
    if (room.status === "finished") return "Ván cờ kết thúc";
    if (room.role === "spectator") return "Bạn đang xem";
    return room.yourTurn ? "Tới lượt bạn" : "Tới lượt đối thủ";
  }

  function roomSummaryText(room) {
    const yourSide = room.role === "player" ? room.yourSide : "w";
    const yourClockMs = Number(room.clockSetupMs?.[yourSide] || 0);
    const opponentClockMs = Number(room.clockSetupMs?.[oppositeSide(yourSide)] || 0);
    const incrementLabel = Number(room.incrementSeconds || 0) > 0
      ? `, tích lũy ${room.incrementSeconds} giây/nước`
      : "";

    if (room.status === "waiting") {
      return `Bên ta ${formatClockSetup(yourClockMs)}, bên địch ${formatClockSetup(opponentClockMs)}${incrementLabel}. Hệ thống đang chờ đủ hai người chơi.`;
    }
    if (room.status === "ready") {
      if (room.role === "spectator") {
        return `Hai người chơi đã vào phòng. Ván cờ sẽ bắt đầu khi cả hai cùng bấm Sẵn sàng.`;
      }
      return room.startReady?.you
        ? "Bạn đã sẵn sàng. Chờ đối thủ xác nhận để bắt đầu ván cờ."
        : "Hai người chơi đã vào phòng. Hãy bấm Sẵn sàng để bắt đầu ván cờ.";
    }
    if (room.status === "starting") {
      return "Bảng bắt đầu đang hiển thị. Khi hết 2 giây, đồng hồ bên Đỏ sẽ chạy.";
    }
    if (room.status === "finished") {
      return room.role === "player"
        ? "Ván cờ đã kết thúc. Bạn có thể sẵn sàng ván mới hoặc out phòng."
        : "Ván cờ đã kết thúc.";
    }
    if (room.role === "spectator") {
      return `Bạn đang ở chế độ người xem. Đồng hồ hai bên là ${formatClockSetup(Number(room.clockSetupMs?.w || 0))} và ${formatClockSetup(Number(room.clockSetupMs?.b || 0))}${incrementLabel}.`;
    }
    return room.yourTurn
      ? `Bạn đang cầm bên ${room.yourSide === "w" ? "Đỏ" : "Đen"}. Đồng hồ của bạn là ${formatClockSetup(yourClockMs)}, đối thủ là ${formatClockSetup(opponentClockMs)}${incrementLabel}.`
      : `Bạn đang cầm bên ${room.yourSide === "w" ? "Đỏ" : "Đen"}. Đồng hồ của bạn là ${formatClockSetup(yourClockMs)}, đối thủ là ${formatClockSetup(opponentClockMs)}${incrementLabel}.`;
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
      checkmate: "Chiếu hết.",
      "no-moves": "Không còn nước đi hợp lệ.",
      timeout: "Hết thời gian.",
      resign: "Xin thua.",
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
      syncViewportHeight();
      renderRoomMobilePanels();
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

  function reviewBadgeForGrade(grade) {
    return REVIEW_BADGES[grade] || { key: "", label: "", image: "" };
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

  function drawStyledArrow(ctx, from, base, tip, normal, halfWidth, palette) {
    const gradient = ctx.createLinearGradient(from.x, from.y, tip.x, tip.y);
    gradient.addColorStop(0, palette.start);
    gradient.addColorStop(0.55, palette.mid);
    gradient.addColorStop(1, palette.end);

    ctx.save();
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = Math.max(10, ctx.lineWidth * 1.2);
    ctx.strokeStyle = gradient;
    ctx.fillStyle = gradient;
    line(ctx, from.x, from.y, base.x, base.y);

    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(base.x + normal.x * halfWidth, base.y + normal.y * halfWidth);
    ctx.lineTo(base.x - normal.x * halfWidth, base.y - normal.y * halfWidth);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = palette.highlight;
    ctx.lineWidth = Math.max(1.5, ctx.lineWidth * 0.18);
    line(
      ctx,
      from.x - normal.x * ctx.lineWidth * 0.8,
      from.y - normal.y * ctx.lineWidth * 0.8,
      base.x - normal.x * ctx.lineWidth * 0.8,
      base.y - normal.y * ctx.lineWidth * 0.8
    );

    ctx.beginPath();
    ctx.moveTo(tip.x - normal.x * 1.5, tip.y - normal.y * 1.5);
    ctx.lineTo(base.x, base.y);
    ctx.lineTo(base.x - normal.x * halfWidth * 0.42, base.y - normal.y * halfWidth * 0.42);
    ctx.stroke();
    ctx.restore();
  }

  function arrowPalette(color) {
    const base = parseArrowColor(color);
    return {
      start: rgbaString(mixArrowColor(base, 0.26, 255, 0.85)),
      mid: rgbaString({ ...base, a: 0.96 }),
      end: rgbaString(mixArrowColor(base, 0.18, 0, 0.98)),
      glow: rgbaString({ ...base, a: 0.42 }),
      highlight: "rgba(255, 245, 220, 0.3)"
    };
  }

  function parseArrowColor(color) {
    const match = String(color || "").match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
    if (!match) return { r: 164, g: 55, b: 205, a: 0.94 };
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

  function formatClockSetup(milliseconds) {
    return formatClock(milliseconds || 0).replace(/^0/, "");
  }

  function readPersistentValue(key) {
    try {
      const value = localStorage.getItem(key);
      if (value) return String(value);
    } catch {}
    return readCookieValue(key);
  }

  function writePersistentValue(key, value, days = 3650) {
    const normalized = String(value || "");
    try {
      if (normalized) localStorage.setItem(key, normalized);
      else localStorage.removeItem(key);
    } catch {}
    writeCookieValue(key, normalized, days);
  }

  function readCookieValue(key) {
    const encodedKey = `${encodeURIComponent(key)}=`;
    const match = String(document.cookie || "")
      .split("; ")
      .find((item) => item.startsWith(encodedKey));
    return match ? decodeURIComponent(match.slice(encodedKey.length)) : "";
  }

  function writeCookieValue(key, value, days = 3650) {
    const encodedKey = encodeURIComponent(key);
    if (!value) {
      document.cookie = `${encodedKey}=; Max-Age=0; path=/; SameSite=Lax`;
      return;
    }
    const maxAge = Math.max(86400, Math.floor(days * 86400));
    document.cookie = `${encodedKey}=${encodeURIComponent(value)}; Max-Age=${maxAge}; path=/; SameSite=Lax`;
  }

  function randomIndex(max) {
    if (!Number.isFinite(max) || max <= 1) return 0;
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function randomToken(length = 8) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    if (window.crypto?.getRandomValues) {
      const values = new Uint8Array(length);
      window.crypto.getRandomValues(values);
      return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
    }
    let token = "";
    while (token.length < length) token += Math.random().toString(36).slice(2);
    return token.slice(0, length);
  }

  function pickRandomDeviceAvatar(deviceId) {
    const seed = `${deviceId}|${Date.now().toString(36)}|${performance.now().toString(36)}|${navigator.userAgent}|${randomToken(8)}`;
    const index = Math.abs(hashCode(seed)) % DEVICE_AVATARS.length;
    return DEVICE_AVATARS[index] || DEVICE_AVATARS[randomIndex(DEVICE_AVATARS.length)] || "";
  }

  function cloneJsonValue(value, fallback = null) {
    try {
      if (typeof structuredClone === "function") return structuredClone(value);
    } catch {}
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
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

  function normalizeDisplayNameInput(value) {
    return String(value || "")
      .normalize("NFC")
      .replace(/\s+/gu, " ")
      .trim();
  }

  function validateDisplayNameInput(value) {
    const displayName = normalizeDisplayNameInput(value);
    if (!displayName) {
      return { ok: false, message: "Hãy nhập tên của bạn trước khi vào phòng." };
    }
    if (Array.from(displayName).length > 15) {
      return { ok: false, message: "Tên người dùng tối đa 15 ký tự, tính cả dấu cách." };
    }
    if (!/^(?:\p{L}+(?: \p{L}+)*)$/u.test(displayName)) {
      return { ok: false, message: "Tên chỉ được gồm chữ cái tiếng Việt và dấu cách, không chứa số hay ký tự đặc biệt." };
    }
    return { ok: true, value: displayName };
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
      goRoute("home", true);
      setMessage(dom.matchHubMessage, "Phiên thiết bị đã hết hạn. Hãy thử lại.");
    }
    renderProfileAfterApiFailure();
    throw lastError || new Error("Không thể kết nối tới máy chủ.");
  }
})();

