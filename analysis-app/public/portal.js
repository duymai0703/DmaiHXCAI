(function () {
  "use strict";

  const API_RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
  const STORAGE_TOKEN = "license_token";
  const LEGACY_STORAGE_TOKEN = "dmaihxcai-auth-token";
  const STORAGE_USER = "dmaihxcai-auth-user";
  const STORAGE_ACCESS_KEY = "dmaihxcai-access-key";
  const STORAGE_ROOM = "dmaihxcai-room-key";
  const STORAGE_DEVICE_ID = "dmaihxcai-device-id";
  const STORAGE_DEVICE_AVATAR = "dmaihxcai-device-avatar";
  const STORAGE_DEVICE_AVATAR_VERSION = "dmaihxcai-device-avatar-version";
  const STORAGE_DEVICE_HISTORY = "dmaihxcai-device-history";
  const STORAGE_ASSET_WARMUP_VERSION = "dmaihxcai-portal-assets-version";
  const STORAGE_THEME = "dmaihxcai-theme";
  const STORAGE_BOARD_SKIN = "dmaihxcai-board-skin";
  const STORAGE_PIECE_SKIN = "dmaihxcai-piece-skin";
  const DEVICE_AVATAR_VERSION = "20260715-tv-v1";
  const ASSET_WARMUP_VERSION = "20260717-css-board-v3";
  const PORTAL_ASSET_BLOCK_MS = 1800;
  const PORTAL_ASSET_TIMEOUT_MS = 2400;
  const PORTAL_PRELOAD_TEXT = {
    prepare: "\u0110ang chu\u1ea9n b\u1ecb t\u00e0i nguy\u00ean...",
    cache: "\u0110ang l\u01b0u t\u00e0i nguy\u00ean v\u00e0o tr\u00ecnh duy\u1ec7t...",
    decode: "\u0110ang t\u1ed1i \u01b0u hi\u1ec3n th\u1ecb...",
    done: "\u0110\u00e3 ho\u00e0n t\u1ea5t."
  };
  const START_FEN = XiangqiCore.START_FEN;
  const DEVICE_AVATARS = [
    "/assets/device-avatars/tv1.png",
    "/assets/device-avatars/tv2.png",
    "/assets/device-avatars/tv3.png",
    "/assets/device-avatars/tv4.png",
    "/assets/device-avatars/tv5.png",
    "/assets/device-avatars/tv6.png",
    "/assets/device-avatars/tv7.png",
    "/assets/device-avatars/tv8.png"
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
  const SOUND_ASSET_VERSION = "20260713-audio-v9";
  const MOVE_SOUND_SOURCES = {
    move: `/assets/sounds/diquan.mp3?v=${SOUND_ASSET_VERSION}`,
    capture: `/assets/sounds/an.mp3?v=${SOUND_ASSET_VERSION}`,
    check: `/assets/sounds/chieu.mp3?v=${SOUND_ASSET_VERSION}`,
    checkmate: `/assets/sounds/tuyetsat1.mp3?v=${SOUND_ASSET_VERSION}`
  };
  const REVIEW_BADGES = {
    book: { key: "book", label: "Book", image: "/assets/review-badges/book.png" },
    brilliant: { key: "brilliant", label: "Ưu việt", image: "/assets/review-badges/sao.png" },
    good: { key: "good", label: "Khá ổn", image: "/assets/review-badges/like.png" },
    okay: { key: "okay", label: "Không hay", image: "/assets/review-badges/bang.png" },
    bad: { key: "bad", label: "Rất yếu", image: "/assets/review-badges/x.png" }
  };
  const ANALYSIS_PRELOAD_ASSETS = [
    "/analysis.html",
    "/styles.css?v=20260717-css-board-v3",
    "/app.js?v=20260717-css-board-v3",
    MOVE_SOUND_SOURCES.move,
    MOVE_SOUND_SOURCES.capture,
    MOVE_SOUND_SOURCES.check,
    MOVE_SOUND_SOURCES.checkmate,
    "/assets/icons/mb1-light.png",
    "/assets/icons/mb2-light.png",
    "/assets/icons/mb3-light.png",
    "/assets/icons/mb4-light.png",
    "/assets/icons/mb5-light.png",
    "/assets/icons/cole-light.png",
    "/assets/icons/guom-light.png",
    "/assets/icons/sosach-light.png",
    "/assets/icons/mb1-dark.png",
    "/assets/icons/mb2-dark.png",
    "/assets/icons/mb3-dark.png",
    "/assets/icons/mb4-dark.png",
    "/assets/icons/mb5-dark.png",
    "/assets/icons/cole-dark.png",
    "/assets/icons/guom-dark.png",
    "/assets/icons/sosach-dark.png",
    "/assets/icons/logow.png",
    "/assets/icons/logob.png",
    "/assets/effects/sat-cutout.png",
    ...Object.values(PIECE_IMAGES),
    ...Object.values(MOBILE_RED_PIECE_IMAGES),
    ...Object.values(CUSTOM_PIECE_IMAGES_BY_SET).flatMap((set) => Object.values(set))
  ];
  const THEME_LOGO_ASSETS = [
    "/assets/icons/logow-header.png",
    "/assets/icons/logob-header.png"
  ];
  const REVIEW_BADGE_ASSETS = Object.values(REVIEW_BADGES).map((badge) => badge.image).filter(Boolean);
  const PORTAL_POSTER_ASSETS = [
    "/assets/posters/vancu1.png",
    "/assets/posters/vancu4.png",
    "/assets/posters/vancu2.png",
    "/assets/posters/vancu3.png",
    "/assets/posters/vanca2.png",
    "/assets/posters/vanca1.png",
    "/assets/posters/vanca3.png"
  ];
  const PORTAL_BLOCKING_ASSETS = [];
  const PORTAL_BACKGROUND_ASSETS = [...ANALYSIS_PRELOAD_ASSETS, ...PORTAL_POSTER_ASSETS, ...THEME_LOGO_ASSETS, ...REVIEW_BADGE_ASSETS, ...DEVICE_AVATARS];
  const ROOM_MOVE_ANIMATION_MS = 320;
  const ROOM_MOVE_EASING = "cubic-bezier(0.16, 0.84, 0.22, 1)";
  const OPENING_BOOK_MOVE_ANIMATION_MS = ROOM_MOVE_ANIMATION_MS;
  const CHECKMATE_EFFECT_MS = 3000;
  const REVIEW_EVAL_BAR_LIMIT = 2000;

  const initialToken = readPersistentValue(STORAGE_TOKEN) || readPersistentValue(LEGACY_STORAGE_TOKEN) || "";
  const initialDeviceId = readOrCreateDeviceId();
  const initialDeviceAvatar = readOrCreateDeviceAvatar(initialDeviceId);
  const state = {
    token: initialToken,
    user: initialToken ? readStoredUser() : null,
    savedAccessKey: readPersistentValue(STORAGE_ACCESS_KEY),
    sessionSuspended: false,
    deviceId: initialDeviceId,
    deviceAvatarUrl: initialDeviceAvatar,
    history: readStoredHistory(),
    libraryTab: "history",
    kydaoMasters: [],
    kydaoSelectedMasterPath: "",
    kydaoGames: [],
    kydaoPage: 1,
    kydaoTotalPages: 1,
    kydaoLoading: false,
    kydaoGamesLoading: false,
    kydaoOpeningPath: "",
    openingBooks: [],
    openingBookEditor: createOpeningBookEditorState(),
    openingBookPractice: createOpeningBookPracticeState(),
    openingBookSelectedSquare: null,
    openingBookHints: [],
    openingBookDrawFrame: 0,
    openingBookDrawForce: false,
    openingBookLastBoardFrame: "",
    openingBookLastPieceFrame: "",
    openingBookSlots: null,
    openingBookHintSlots: null,
    openingBookSlotLayoutKey: "",
    openingBookAnimation: null,
    openingBookAnimationTimer: 0,
    openingBookAnimationRunning: false,
    activeOpeningBookMoveSlotEl: null,
    lastAnimatedOpeningBookMoveKey: "",
    route: "home",
    booting: true,
    pendingAccessKey: "",
    lobbyMode: "join",
    createSide: "w",
    botSide: "w",
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
    adminLicenses: [],
    adminRawKeyAvailable: false,
    adminLicenseFilter: "",
    adminSelectedUserId: "",
    adminLoading: false,
    adminRefreshTimer: 0,
    selectedSquare: null,
    hints: [],
    roomSyncedAt: 0,
    roomPollTimer: null,
    roomClockTimer: null,
    activityTimer: 0,
    roomPollBusy: false,
    roomActionBusy: false,
    roomTimeoutSyncAt: 0,
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
    reviewAnimation: null,
    reviewAnimationTimer: 0,
    lastAnimatedReviewMoveKey: "",
    lastChatSignature: "",
    resizeTimer: null,
    lastBoardSizeKey: "",
    lastViewportWidth: Math.round(window.innerWidth || 0),
    lastViewportHeight: Math.round(window.innerHeight || 0),
    roomViewportWidth: 0,
    roomViewportHeight: 0,
    roomMobilePanel: "",
    roomMobileMenuOpen: false,
    roomChatToastTimer: 0,
    roomTurnFlashTimer: 0,
    assetWarmupPending: false,
    assetWarmupProgress: 0,
    assetWarmupText: PORTAL_PRELOAD_TEXT.prepare,
    roomAnimation: null,
    roomAnimationTimer: 0,
    roomAnimationRunning: false,
    lastAnimatedRoomMoveKey: "",
    activeRoomMoveSlotEl: null,
    activeReviewMoveSlotEl: null,
    roomCheckmateEffectKey: "",
    roomCheckSoundKey: "",
    roomCheckmateEffectTimer: 0,
    reviewCheckmateEffectKey: "",
    reviewCheckSoundKey: "",
    reviewCheckmateEffectTimer: 0,
    selectedAvatarUrl: "",
    audioContext: null,
    moveSoundElements: null,
    moveSoundBuffers: null,
    moveSoundBufferJobs: null,
    moveSoundSegments: null,
    activeMoveSoundSources: null,
    activeMoveSoundGains: null,
    lastMoveSoundAt: 0,
    moveAudioUnlocked: false
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
    assetPreloadPercent: byId("assetPreloadPercent"),
    assetPreloadBar: byId("assetPreloadBar"),
    opponentBadge: byId("opponentBadge"),
    selfBadge: byId("selfBadge"),
    headerProfile: byId("headerProfile"),
    portalBrandMark: byId("portalBrandMark"),
    resumeRoomBtn: byId("resumeRoomBtn"),
    profileButton: byId("profileButton"),
    profileAvatar: byId("profileAvatar"),
    roomMobileProfileBtn: byId("roomMobileProfileBtn"),
    roomMobileProfileAvatar: byId("roomMobileProfileAvatar"),
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
    showBotRoom: byId("showBotRoom"),
    showMobileLibrary: byId("showMobileLibrary"),
    joinRoomForm: byId("joinRoomForm"),
    createRoomForm: byId("createRoomForm"),
    botRoomForm: byId("botRoomForm"),
    joinDisplayName: byId("joinDisplayName"),
    joinRoomKey: byId("joinRoomKey"),
    createDisplayName: byId("createDisplayName"),
    botDisplayName: byId("botDisplayName"),
    yourTimeRange: byId("yourTimeRange"),
    yourTimeRangeValue: byId("yourTimeRangeValue"),
    opponentTimeRange: byId("opponentTimeRange"),
    opponentTimeRangeValue: byId("opponentTimeRangeValue"),
    incrementSelect: byId("incrementSelect"),
    botTimeRange: byId("botTimeRange"),
    botTimeRangeValue: byId("botTimeRangeValue"),
    botLevelSelect: byId("botLevelSelect"),
    botIncrementSelect: byId("botIncrementSelect"),
    pickRed: byId("pickRed"),
    pickBlack: byId("pickBlack"),
    botPickRed: byId("botPickRed"),
    botPickBlack: byId("botPickBlack"),
    matchHubMessage: byId("matchHubMessage"),
    roomKeyLabel: byId("roomKeyLabel"),
    copyRoomKeyBtn: byId("copyRoomKeyBtn"),
    roomStatusBadge: byId("roomStatusBadge"),
    roomPeopleBadge: byId("roomPeopleBadge"),
    roomMobileBackBtn: byId("roomMobileBackBtn"),
    roomMobileMenuBtn: byId("roomMobileMenuBtn"),
    roomChatToast: byId("roomChatToast"),
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
    roomMotionLayer: byId("roomMotionLayer"),
    roomCapturePiece: byId("roomCapturePiece"),
    roomMotionPiece: byId("roomMotionPiece"),
    roomCheckmateBurst: byId("roomCheckmateBurst"),
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
    reviewEvalBar: byId("reviewEvalBar"),
    reviewEvalRed: byId("reviewEvalRed"),
    reviewEvalBlack: byId("reviewEvalBlack"),
    reviewMoveMeta: byId("reviewMoveMeta"),
    reviewBoard: byId("reviewBoard"),
    reviewBoardCanvas: byId("reviewBoardCanvas"),
    reviewArrowCanvas: byId("reviewArrowCanvas"),
    reviewPieces: byId("reviewPieces"),
    reviewMotionLayer: byId("reviewMotionLayer"),
    reviewMotionPiece: byId("reviewMotionPiece"),
    reviewCheckmateBurst: byId("reviewCheckmateBurst"),
    reviewMoveList: byId("reviewMoveList"),
    profileModal: byId("profileModal"),
    closeProfileBtn: byId("closeProfileBtn"),
    profileAvatarLarge: byId("profileAvatarLarge"),
    profileLicenseInfo: byId("profileLicenseInfo"),
    avatarChoices: byId("avatarChoices"),
    saveAvatarBtn: byId("saveAvatarBtn"),
    openAdminBtn: byId("openAdminBtn"),
    logoutBtn: byId("logoutBtn"),
    libraryHistoryList: byId("libraryHistoryList"),
    libraryHistoryTab: byId("libraryHistoryTab"),
    libraryBookCreateTab: byId("libraryBookCreateTab"),
    libraryBookSavedTab: byId("libraryBookSavedTab"),
    libraryKydaoTab: byId("libraryKydaoTab"),
    libraryHistoryPanel: byId("libraryHistoryPanel"),
    libraryBookCreatePanel: byId("libraryBookCreatePanel"),
    libraryBookSavedPanel: byId("libraryBookSavedPanel"),
    libraryKydaoPanel: byId("libraryKydaoPanel"),
    kydaoRefreshBtn: byId("kydaoRefreshBtn"),
    kydaoMasterList: byId("kydaoMasterList"),
    kydaoGameList: byId("kydaoGameList"),
    kydaoSelectedTitle: byId("kydaoSelectedTitle"),
    kydaoPageInfo: byId("kydaoPageInfo"),
    kydaoPrevPageBtn: byId("kydaoPrevPageBtn"),
    kydaoNextPageBtn: byId("kydaoNextPageBtn"),
    kydaoStatus: byId("kydaoStatus"),
    openingBookBoard: byId("openingBookBoard"),
    openingBookBoardCanvas: byId("openingBookBoardCanvas"),
    openingBookArrowCanvas: byId("openingBookArrowCanvas"),
    openingBookMarks: byId("openingBookMarks"),
    openingBookPieces: byId("openingBookPieces"),
    openingBookRedSideBtn: byId("openingBookRedSideBtn"),
    openingBookBlackSideBtn: byId("openingBookBlackSideBtn"),
    openingBookPrevBtn: byId("openingBookPrevBtn"),
    openingBookNextBtn: byId("openingBookNextBtn"),
    openingBookResetBtn: byId("openingBookResetBtn"),
    openingBookSaveBtn: byId("openingBookSaveBtn"),
    openingBookPracticeBtn: byId("openingBookPracticeBtn"),
    openingBookPracticeHintBtn: byId("openingBookPracticeHintBtn"),
    openingBookPracticeExitBtn: byId("openingBookPracticeExitBtn"),
    openingBookPracticeModal: byId("openingBookPracticeModal"),
    openingBookPracticeModalTitle: byId("openingBookPracticeModalTitle"),
    openingBookPracticeModalText: byId("openingBookPracticeModalText"),
    openingBookPracticeChoiceList: byId("openingBookPracticeChoiceList"),
    openingBookPracticeYesBtn: byId("openingBookPracticeYesBtn"),
    openingBookPracticeNoBtn: byId("openingBookPracticeNoBtn"),
    openingBookStatus: byId("openingBookStatus"),
    openingBookBranchChooser: byId("openingBookBranchChooser"),
    openingBookMoveList: byId("openingBookMoveList"),
    openingBookSavedList: byId("openingBookSavedList"),
    adminLicenseFilter: byId("adminLicenseFilter"),
    adminRefreshBtn: byId("adminRefreshBtn"),
    adminImportKeysBtn: byId("adminImportKeysBtn"),
    adminImportKeysInput: byId("adminImportKeysInput"),
    adminExportBtn: byId("adminExportBtn"),
    adminKeyLookupForm: byId("adminKeyLookupForm"),
    adminKeyLookupInput: byId("adminKeyLookupInput"),
    adminUsersMeta: byId("adminUsersMeta"),
    adminUsersList: byId("adminUsersList"),
    adminSelectedTitle: byId("adminSelectedTitle"),
    adminSelectedMeta: byId("adminSelectedMeta"),
    adminHistoryList: byId("adminHistoryList"),
    modal: byId("modal"),
    modalTitle: byId("modalTitle"),
    modalText: byId("modalText"),
    modalCancel: byId("modalCancel"),
    modalConfirm: byId("modalConfirm"),
    accessGate: byId("accessGate"),
    accessKeyForm: byId("accessKeyForm"),
    accessKeyInput: byId("accessKeyInput"),
    accessNameInput: byId("accessNameInput"),
    accessKeyMessage: byId("accessKeyMessage")
  };
  const roomMobilePanelButtons = [...document.querySelectorAll("[data-room-mobile-mode]")];
  const roomMobileActionButtons = [...document.querySelectorAll("[data-room-mobile-action]")];
  const roomMobilePanels = [...document.querySelectorAll("[data-room-mobile-panel]")];
  const portalBoardSkinButton = byId("portalBoardSkinBtn");
  const portalBoardSkinMenu = byId("portalBoardSkinMenu");
  const portalBoardSkinChoices = [...document.querySelectorAll("[data-portal-board-skin]")];
  const portalPieceSkinChoices = [...document.querySelectorAll("[data-portal-piece-skin]")];
  window.setInterval(() => {
    if (!dom.profileModal?.classList.contains("hidden")) renderLicenseInfo();
  }, 60000);

  const mobileUserAgent = navigator.userAgent || "";
  const isIpadDesktop = /macintosh/i.test(mobileUserAgent) && Number(navigator.maxTouchPoints || 0) > 1;
  const isMobileDevice = /android|iphone|ipad|ipod|mobile|windows phone/i.test(mobileUserAgent) || isIpadDesktop;
  const mobileRoomParams = new URLSearchParams(window.location.search || "");
  const isMobileRoomEntry = mobileRoomParams.has("mobileRoom");
  const initialMobileRoute = String(location.hash || "").replace(/^#/, "").trim().toLowerCase();
  const keepPortalOnMobile = ["library", "review", "admin"].includes(initialMobileRoute);
  if (isMobileDevice && !isMobileRoomEntry && !keepPortalOnMobile) {
    window.location.replace("/analysis");
    return;
  }
  document.body.classList.toggle("mobile-room-entry", isMobileRoomEntry);

  initThemeControls();
  initPortalBoardSkinControls();
  initPortalPieceSkinControls();
  bindEvents();
  disableLegacyNameInputs();
  preventDoubleTapZoom();
  document.addEventListener("pointerdown", unlockMoveSound, { passive: true });
  document.addEventListener("keydown", unlockMoveSound);
  const assetWarmupPromise = warmPortalAssets();
  syncViewportHeight();
  setupRoomMobileDock();
  startActivityHeartbeat();
  setLobbyMode("join");
  updateTimeLabels();
  renderHistory();
  syncRoute(true);
  bootstrap()
    .catch(() => {})
    .finally(() => {
      state.booting = false;
      syncRoute(true);
    });
  assetWarmupPromise.catch(() => {});

  function byId(id) {
    return document.getElementById(id);
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
      audio.volume = moveSoundVolume(kind);
      audio.playsInline = true;
      try {
        audio.load();
      } catch (error) {}
      state.moveSoundElements[kind] = audio;
    }
    return state.moveSoundElements[kind];
  }

  function unlockMediaSoundElements() {
    Object.keys(MOVE_SOUND_SOURCES).forEach((kind) => {
      const audio = getMoveSoundElement(kind);
      if (!audio) return;
      const wasMuted = audio.muted;
      const token = `${Date.now()}:${Math.random()}`;
      audio._dmaihxcaiUnlockToken = token;
      audio.muted = true;
      audio.currentTime = 0;
      const played = audio.play();
      const reset = () => {
        if (audio._dmaihxcaiUnlockToken !== token || audio._dmaihxcaiPlayToken) return;
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
    const fallback = kind === "checkmate" ? CHECKMATE_EFFECT_MS : kind === "check" ? 720 : kind === "capture" ? 360 : 220;
    const value = Number(durationMs) > 0 ? Number(durationMs) : fallback;
    if (kind === "checkmate") return Math.max(CHECKMATE_EFFECT_MS, knownMoveSoundDurationMs(kind) || value);
    if (kind === "check") return Math.max(520, value);
    if (kind === "capture") return Math.max(340, value);
    return Math.max(80, value);
  }

  function moveSoundVolume(kind) {
    if (kind === "checkmate") return 0.98;
    if (kind === "check") return 0.92;
    if (kind === "capture") return 0.9;
    return 0.78;
  }

  function knownMoveSoundDurationMs(kind) {
    const bufferDuration = Number(state.moveSoundBuffers?.[kind]?.duration);
    if (Number.isFinite(bufferDuration) && bufferDuration > 0) return Math.round(bufferDuration * 1000);
    const mediaDuration = Number(state.moveSoundElements?.[kind]?.duration);
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) return Math.round(mediaDuration * 1000);
    return 0;
  }

  function mediaSoundStartTime(audio, kind, durationMs = 0) {
    const duration = Number(audio.duration);
    if (!Number.isFinite(duration) || duration <= 0) return null;
    if (kind === "checkmate") return 0;
    const windowSeconds = Math.min(
      Math.max(0.08, mediaSoundWindowMs(kind, durationMs) / 1000),
      Math.max(0.08, duration - 0.02)
    );
    return Math.max(0, duration - windowSeconds);
  }

  function canPlaySoundFromStart(kind) {
    return kind === "check" || kind === "checkmate";
  }

  function bestMoveSoundOffset(buffer, kind, durationMs = 0) {
    if (kind === "checkmate") return 0;
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

  function trackMoveSoundSource(source, kind) {
    if (!source) return;
    if (!state.activeMoveSoundSources) state.activeMoveSoundSources = [];
    const entry = { source, kind };
    state.activeMoveSoundSources.push(entry);
    source.onended = () => {
      state.activeMoveSoundSources = (state.activeMoveSoundSources || []).filter((item) => item !== entry);
    };
  }

  function trackMoveSoundGain(gain, kind, durationMs = 0) {
    if (!gain) return;
    if (!state.activeMoveSoundGains) state.activeMoveSoundGains = [];
    const entry = { gain, kind };
    state.activeMoveSoundGains.push(entry);
    window.setTimeout(() => {
      try {
        gain.disconnect();
      } catch (error) {}
      state.activeMoveSoundGains = (state.activeMoveSoundGains || []).filter((item) => item !== entry);
    }, Math.max(160, durationMs + 180));
  }

  function stopActiveMoveSounds() {
    (state.activeMoveSoundSources || []).forEach(({ source }) => {
      try {
        source.stop(0);
      } catch (error) {}
    });
    state.activeMoveSoundSources = [];
    const ctx = state.audioContext;
    (state.activeMoveSoundGains || []).forEach(({ gain }) => {
      try {
        const now = ctx?.currentTime || 0;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.disconnect();
      } catch (error) {}
    });
    state.activeMoveSoundGains = [];
    if (!state.moveSoundElements) return;
    Object.values(state.moveSoundElements).forEach((audio) => {
      if (!audio) return;
      try {
        audio._dmaihxcaiPlayToken = "";
        audio.pause();
        audio.currentTime = 0;
      } catch (error) {}
    });
  }

  function playDecodedMoveSound(kind, durationMs = 0) {
    const ctx = ensureMoveAudioContext();
    const buffer = state.moveSoundBuffers?.[kind];
    if (!ctx || !buffer || ctx.state !== "running") {
      loadMoveSoundBuffer(kind);
      return false;
    }
    const startOffset = bestMoveSoundOffset(buffer, kind, durationMs);
    const clipSeconds = kind === "capture"
      ? Math.max(0, (buffer.duration || 0) - startOffset)
      : Math.min(buffer.duration || 0, mediaSoundWindowMs(kind, durationMs) / 1000);
    if (!clipSeconds) return false;
    try {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(moveSoundVolume(kind), ctx.currentTime);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime, startOffset, clipSeconds);
      trackMoveSoundSource(source, kind);
      return Math.round(clipSeconds * 1000);
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
      if (startAt === null && !canPlaySoundFromStart(kind)) {
        loadMoveSoundBuffer(kind);
        return false;
      }
      const safeStartAt = startAt === null ? 0 : startAt;
      const playbackMs = kind === "capture" && Number.isFinite(audio.duration) && audio.duration > safeStartAt
        ? Math.max(targetMs, Math.round((audio.duration - safeStartAt) * 1000))
        : targetMs;
      const token = `${Date.now()}:${Math.random()}`;
      audio.pause();
      audio._dmaihxcaiUnlockToken = "";
      audio.muted = false;
      audio.currentTime = safeStartAt;
      audio.volume = moveSoundVolume(kind);
      audio._dmaihxcaiPlayToken = token;
      const played = audio.play();
      if (played && typeof played.catch === "function") {
        played.catch(() => {
          if (audio._dmaihxcaiPlayToken === token) audio._dmaihxcaiPlayToken = "";
        });
      }
      window.setTimeout(() => {
        if (audio._dmaihxcaiPlayToken !== token) return;
        audio.pause();
        audio.currentTime = 0;
      }, playbackMs + 90);
      return playbackMs;
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
    trackMoveSoundGain(master, kind, mediaSoundWindowMs(kind, durationMs));
    if (kind === "checkmate") {
      playNoiseSweep(ctx, master, now, { duration: 0.5, peak: 0.28, from: 520, to: 2600, q: 0.8, type: "bandpass" });
      playNoiseSweep(ctx, master, now, { delay: 0.06, duration: 0.34, peak: 0.24, from: 3600, to: 980, q: 1.7, type: "highpass" });
      playTone(ctx, master, now, { duration: 0.46, type: "sawtooth", gainPeak: 0.24, from: 150, to: 58, attack: 0.012 });
      playMetalClash(ctx, master, now, 0.1);
      return mediaSoundWindowMs(kind, durationMs);
    }
    if (kind === "capture") {
      playNoiseSweep(ctx, master, now, { duration: 0.2, peak: 0.36, from: 4200, to: 760, q: 2.2, type: "highpass" });
      playNoiseSweep(ctx, master, now, { delay: 0.025, duration: 0.11, peak: 0.2, from: 2500, to: 1350, q: 3.4, type: "bandpass" });
      playMetalClash(ctx, master, now, 0.018);
      return mediaSoundWindowMs(kind, durationMs);
    }
    if (kind === "check") {
      playNoiseSweep(ctx, master, now, { duration: 0.3, peak: 0.28, from: 780, to: 3300, q: 1.2, type: "bandpass" });
      playTone(ctx, master, now, { delay: 0.03, duration: 0.42, type: "triangle", gainPeak: 0.18, from: 640, to: 1180, attack: 0.01 });
      playMetalClash(ctx, master, now, 0.08);
      return mediaSoundWindowMs(kind, durationMs);
    }
    playNoiseSweep(ctx, master, now, { duration: 0.2, peak: 0.28, from: 3200, to: 520, q: 1.45, type: "bandpass" });
    playTone(ctx, master, now, { duration: 0.18, type: "sine", gainPeak: 0.075, from: 940, to: 360, attack: 0.014 });
    return mediaSoundWindowMs(kind, durationMs);
  }

  function playMoveSound(kind = "move", durationMs = 0) {
    const nowMs = performance.now();
    if (kind !== "checkmate" && nowMs - Number(state.lastMoveSoundAt || 0) < 45) return;
    if (kind === "checkmate") stopActiveMoveSounds();
    if (MOVE_SOUND_SOURCES[kind]) {
      state.lastMoveSoundAt = nowMs;
      const decodedDuration = playDecodedMoveSound(kind, durationMs);
      if (decodedDuration) return decodedDuration;
      const mediaDuration = playMediaMoveSound(kind, durationMs);
      if (mediaDuration) return mediaDuration;
      return mediaSoundWindowMs(kind, durationMs);
    }
    return playFallbackMoveSound(kind, durationMs, nowMs);
  }

  function initThemeControls() {
    applyTheme(readTheme());
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        applyTheme(button.dataset.themeChoice, { persist: true });
      });
    });
  }

  function readTheme() {
    return normalizeTheme(readPersistentValue(STORAGE_THEME) || document.documentElement.dataset.theme || "dark");
  }

  function readPortalBoardSkin() {
    return normalizeBoardSkin(readPersistentValue(STORAGE_BOARD_SKIN) || document.documentElement.dataset.boardSkin || "ice");
  }

  function readPortalPieceSkin() {
    return normalizePieceSkin(readPersistentValue(STORAGE_PIECE_SKIN) || document.documentElement.dataset.pieceSkin || "default");
  }

  function normalizeBoardSkin(skin) {
    return skin === "gold" || skin === "stone" || skin === "pink" || skin === "emerald" || skin === "dark" ? skin : "ice";
  }

  function normalizePieceSkin(skin) {
    return CUSTOM_PIECE_SET_KEYS.includes(skin) ? skin : "default";
  }

  function currentPieceSkin() {
    return normalizePieceSkin(document.documentElement.dataset.pieceSkin || readPortalPieceSkin());
  }

  function initPortalBoardSkinControls() {
    applyPortalBoardSkin(readPortalBoardSkin());
    portalBoardSkinButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePortalBoardSkinMenu();
    });
    portalBoardSkinChoices.forEach((button) => {
      button.addEventListener("click", () => {
        applyPortalBoardSkin(button.dataset.portalBoardSkin, { persist: true });
        hidePortalBoardSkinMenu();
      });
    });
    document.addEventListener("click", (event) => {
      if (!portalBoardSkinMenu || portalBoardSkinMenu.classList.contains("hidden")) return;
      if (portalBoardSkinMenu.contains(event.target) || portalBoardSkinButton?.contains(event.target)) return;
      hidePortalBoardSkinMenu();
    });
  }

  function initPortalPieceSkinControls() {
    applyPortalPieceSkin(readPortalPieceSkin());
    portalPieceSkinChoices.forEach((button) => {
      button.addEventListener("click", () => {
        applyPortalPieceSkin(button.dataset.portalPieceSkin, { persist: true });
        hidePortalBoardSkinMenu();
      });
    });
  }

  function applyPortalBoardSkin(skin, { persist = false } = {}) {
    const normalized = normalizeBoardSkin(skin);
    document.documentElement.dataset.boardSkin = normalized;
    if (persist) writePersistentValue(STORAGE_BOARD_SKIN, normalized);
    portalBoardSkinChoices.forEach((button) => {
      const active = normalizeBoardSkin(button.dataset.portalBoardSkin) === normalized;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    state.openingBookLastBoardFrame = "";
    if (state.route === "library" && state.libraryTab === "book-create") drawOpeningBookScene(true, true);
  }

  function applyPortalPieceSkin(skin, { persist = false } = {}) {
    const normalized = normalizePieceSkin(skin);
    document.documentElement.dataset.pieceSkin = normalized;
    if (persist) writePersistentValue(STORAGE_PIECE_SKIN, normalized);
    portalPieceSkinChoices.forEach((button) => {
      const active = normalizePieceSkin(button.dataset.portalPieceSkin) === normalized;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    state.lastPieceFrame = "";
    state.reviewLastPieceFrame = "";
    state.openingBookLastPieceFrame = "";
    state.roomSlotLayoutKey = "";
    state.reviewSlotLayoutKey = "";
    state.openingBookSlotLayoutKey = "";
    if (dom.roomView && !dom.roomView.classList.contains("hidden")) drawRoomScene(true, true);
    if (dom.reviewView && !dom.reviewView.classList.contains("hidden")) drawReviewScene(true, true);
    if (state.route === "library" && state.libraryTab === "book-create") drawOpeningBookScene(true, true);
  }

  function togglePortalBoardSkinMenu() {
    if (!portalBoardSkinMenu) return;
    const nextHidden = !portalBoardSkinMenu.classList.contains("hidden");
    portalBoardSkinMenu.classList.toggle("hidden", nextHidden);
    portalBoardSkinButton?.setAttribute("aria-expanded", nextHidden ? "false" : "true");
  }

  function hidePortalBoardSkinMenu() {
    portalBoardSkinMenu?.classList.add("hidden");
    portalBoardSkinButton?.setAttribute("aria-expanded", "false");
  }

  function normalizeTheme(theme) {
    return theme === "light" ? "light" : "dark";
  }

  function currentTheme() {
    return normalizeTheme(document.documentElement.dataset.theme || readTheme());
  }

  function applyTheme(theme, { persist = false } = {}) {
    const normalized = normalizeTheme(theme);
    document.documentElement.dataset.theme = normalized;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", normalized === "light" ? "#eaf6ff" : "#050914");
    updateBrandLogo(normalized);
    if (persist) writePersistentValue(STORAGE_THEME, normalized);
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      const active = button.dataset.themeChoice === normalized;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function updateBrandLogo(theme) {
    const logo = theme === "light" ? "/assets/icons/logow-header.png" : "/assets/icons/logob-header.png";
    document.querySelectorAll(".brand-mark").forEach((image) => {
      if (image.id === "portalBrandMark" && shouldUseAvatarBrandMark()) return;
      if (image instanceof HTMLImageElement && !image.src.endsWith(logo)) {
        image.src = logo;
      }
      image.classList.remove("brand-mark-avatar");
    });
    renderPortalBrandMark();
  }

  function shouldUseAvatarBrandMark() {
    return isCompactMobile() && (state.route === "room" || state.route === "match");
  }

  function renderPortalBrandMark() {
    const image = dom.portalBrandMark;
    if (!(image instanceof HTMLImageElement)) return;
    if (!shouldUseAvatarBrandMark()) {
      const logo = currentTheme() === "light" ? "/assets/icons/logow-header.png" : "/assets/icons/logob-header.png";
      if (!image.src.endsWith(logo)) image.src = logo;
      image.classList.remove("brand-mark-avatar");
      image.removeAttribute("role");
      image.removeAttribute("tabindex");
      image.removeAttribute("title");
      image.alt = "DmaiHXCAI";
      return;
    }
    const user = state.user || {};
    const avatarUrl = user.avatarUrl || state.deviceAvatarUrl || "";
    if (!avatarUrl) {
      const logo = currentTheme() === "light" ? "/assets/icons/logow-header.png" : "/assets/icons/logob-header.png";
      if (!image.src.endsWith(logo)) image.src = logo;
      image.classList.remove("brand-mark-avatar");
      image.removeAttribute("role");
      image.removeAttribute("tabindex");
      image.removeAttribute("title");
      image.alt = "DmaiHXCAI";
      return;
    }
    if (!image.src.endsWith(avatarUrl)) image.src = avatarUrl;
    image.classList.add("brand-mark-avatar");
    image.setAttribute("role", "button");
    image.tabIndex = 0;
    image.title = "Xem thông tin khách hàng";
    image.alt = user.displayName || user.username || "Ảnh đại diện";
  }

  function openBrandProfile() {
    if (!shouldUseAvatarBrandMark()) return;
    openProfileModal();
  }

  function bindEvents() {
    window.addEventListener("resize", scheduleResizeRender, { passive: true });
    window.addEventListener("hashchange", () => syncRoute(false));
    dom.globalBackBtn.addEventListener("click", handleBack);
    if (dom.roomMobileBackBtn) dom.roomMobileBackBtn.addEventListener("click", handleBack);
    if (dom.roomMobileMenuBtn) dom.roomMobileMenuBtn.addEventListener("click", toggleRoomMobileMenu);
    if (dom.portalBrandMark) {
      dom.portalBrandMark.addEventListener("click", openBrandProfile);
      dom.portalBrandMark.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openBrandProfile();
        }
      });
    }
    if (dom.roomPeopleBadge) {
      dom.roomPeopleBadge.tabIndex = 0;
      dom.roomPeopleBadge.setAttribute("role", "button");
      dom.roomPeopleBadge.addEventListener("click", openParticipantsPanel);
      dom.roomPeopleBadge.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openParticipantsPanel();
        }
      });
    }
    dom.openMatchHub.addEventListener("click", () => goRoute("match"));
    dom.openAnalysisBtn.addEventListener("click", () => {
      window.location.href = "/analysis.html";
    });
    dom.openLibraryBtn.addEventListener("click", () => goRoute("library"));
    dom.showMobileLibrary?.addEventListener("click", () => {
      setLibraryTab("history");
      goRoute("library");
    });
    dom.libraryHistoryTab?.addEventListener("click", () => setLibraryTab("history"));
    dom.libraryBookCreateTab?.addEventListener("click", () => setLibraryTab("book-create"));
    dom.libraryBookSavedTab?.addEventListener("click", () => setLibraryTab("book-saved"));
    dom.libraryKydaoTab?.addEventListener("click", () => setLibraryTab("kydao"));
    dom.kydaoRefreshBtn?.addEventListener("click", () => loadKydaoMasters(true));
    dom.kydaoPrevPageBtn?.addEventListener("click", () => {
      const master = selectedKydaoMaster();
      if (master && state.kydaoPage > 1) void loadKydaoGames(master, state.kydaoPage - 1);
    });
    dom.kydaoNextPageBtn?.addEventListener("click", () => {
      const master = selectedKydaoMaster();
      if (master && state.kydaoPage < state.kydaoTotalPages) void loadKydaoGames(master, state.kydaoPage + 1);
    });
    dom.openingBookBoard?.addEventListener("pointerdown", onOpeningBookPointerDown);
    dom.openingBookRedSideBtn?.addEventListener("click", () => setOpeningBookSide("w"));
    dom.openingBookBlackSideBtn?.addEventListener("click", () => setOpeningBookSide("b"));
    dom.openingBookPrevBtn?.addEventListener("click", stepOpeningBookBack);
    dom.openingBookNextBtn?.addEventListener("click", openOpeningBookBranchChooser);
    dom.openingBookResetBtn?.addEventListener("click", resetOpeningBookEditor);
    dom.openingBookSaveBtn?.addEventListener("click", saveOpeningBookEditor);
    dom.openingBookPracticeBtn?.addEventListener("click", () => startOpeningBookPractice(state.openingBookEditor));
    dom.openingBookPracticeHintBtn?.addEventListener("click", showOpeningBookPracticeHint);
    dom.openingBookPracticeExitBtn?.addEventListener("click", stopOpeningBookPractice);
    dom.openingBookPracticeYesBtn?.addEventListener("click", continueOpeningBookPracticeLine);
    dom.openingBookPracticeNoBtn?.addEventListener("click", handleOpeningBookPracticeSecondaryAction);
    dom.showJoinRoom.addEventListener("click", () => setLobbyMode("join"));
    dom.showCreateRoom.addEventListener("click", () => setLobbyMode("create"));
    dom.showBotRoom.addEventListener("click", () => setLobbyMode("bot"));
    dom.joinRoomForm.addEventListener("submit", onJoinRoom);
    dom.createRoomForm.addEventListener("submit", onCreateRoom);
    dom.botRoomForm.addEventListener("submit", onCreateBotRoom);
    dom.yourTimeRange.addEventListener("input", updateTimeLabels);
    dom.opponentTimeRange.addEventListener("input", updateTimeLabels);
    dom.botTimeRange.addEventListener("input", updateTimeLabels);
    dom.pickRed.addEventListener("click", () => setCreateSide("w"));
    dom.pickBlack.addEventListener("click", () => setCreateSide("b"));
    dom.botPickRed.addEventListener("click", () => setBotSide("w"));
    dom.botPickBlack.addEventListener("click", () => setBotSide("b"));
    dom.resumeRoomBtn.addEventListener("click", () => {
      if (state.room) goRoute("room");
      else void resumeStoredRoom();
    });
    dom.profileButton.addEventListener("click", openProfileModal);
    if (dom.roomMobileProfileBtn) dom.roomMobileProfileBtn.addEventListener("click", openProfileModal);
    dom.closeProfileBtn.addEventListener("click", closeProfileModal);
    if (dom.saveAvatarBtn) dom.saveAvatarBtn.addEventListener("click", saveSelectedAvatar);
    if (dom.openAdminBtn) dom.openAdminBtn.addEventListener("click", openAdminPanel);
    if (dom.logoutBtn) dom.logoutBtn.addEventListener("click", logout);
    dom.adminRefreshBtn.addEventListener("click", () => {
      void loadAdminUsers(true);
    });
    dom.adminLicenseFilter?.addEventListener("change", () => {
      state.adminLicenseFilter = String(dom.adminLicenseFilter.value || "");
      void loadAdminUsers(true);
    });
    dom.adminImportKeysBtn?.addEventListener("click", () => {
      dom.adminImportKeysInput?.click();
    });
    dom.adminImportKeysInput?.addEventListener("change", importAdminLicenseKeys);
    dom.adminExportBtn?.addEventListener("click", exportAdminLicenseKeys);
    dom.adminKeyLookupForm?.addEventListener("submit", lookupAdminKey);
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
    dom.accessKeyForm?.addEventListener("submit", onAccessKeySubmit);
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
    const existingVersion = String(readPersistentValue(STORAGE_ASSET_WARMUP_VERSION) || "");
    if (existingVersion === ASSET_WARMUP_VERSION) {
      state.assetWarmupPending = false;
      state.assetWarmupProgress = 100;
      state.assetWarmupText = PORTAL_PRELOAD_TEXT.done;
      renderAssetPreloadOverlay();
      return;
    }

    const blockingAssets = [...new Set(PORTAL_BLOCKING_ASSETS)];
    const backgroundAssets = [...new Set(
      PORTAL_BACKGROUND_ASSETS.filter((asset) => !blockingAssets.includes(asset))
    )];
    if (!blockingAssets.length) {
      void Promise.allSettled([
        cacheStaticAssets(backgroundAssets),
        decodeImageAssets(backgroundAssets)
      ]).then(() => {
        writePersistentValue(STORAGE_ASSET_WARMUP_VERSION, ASSET_WARMUP_VERSION);
        void tryPersistBrowserStorage();
      }).catch(() => {});
      state.assetWarmupPending = false;
      state.assetWarmupProgress = 100;
      state.assetWarmupText = PORTAL_PRELOAD_TEXT.done;
      renderAssetPreloadOverlay();
      return;
    }
    const totalSteps = Math.max(
      1,
      ("caches" in window ? blockingAssets.length : 0) +
      countImageAssets(blockingAssets)
    );
    const tracker = createPortalWarmupTracker(totalSteps);

    state.assetWarmupPending = true;
    state.assetWarmupProgress = 0;
    state.assetWarmupText = PORTAL_PRELOAD_TEXT.prepare;
    renderAssetPreloadOverlay();

    void Promise.allSettled([
      cacheStaticAssets(backgroundAssets),
      decodeImageAssets(backgroundAssets)
    ]).catch(() => {});

    try {
      await Promise.allSettled([
        cacheStaticAssets(blockingAssets, tracker),
        decodeImageAssets(blockingAssets, tracker)
      ]);
      writePersistentValue(STORAGE_ASSET_WARMUP_VERSION, ASSET_WARMUP_VERSION);
      tracker.finish(PORTAL_PRELOAD_TEXT.done);
      void tryPersistBrowserStorage();
      await delay(140);
    } finally {
      state.assetWarmupPending = false;
      renderAssetPreloadOverlay();
    }
  }

  function renderAssetPreloadOverlay() {
    if (!dom.assetPreloadOverlay) return;
    const visible = Boolean(state.assetWarmupPending);
    dom.assetPreloadOverlay.classList.toggle("hidden", !visible);
    document.body.classList.toggle("asset-preload-active", visible);
    const progress = Math.max(0, Math.min(100, Math.round(state.assetWarmupProgress || 0)));
    if (dom.assetPreloadPercent) dom.assetPreloadPercent.textContent = `${progress}%`;
    if (dom.assetPreloadBar) dom.assetPreloadBar.style.width = `${progress}%`;
    if (dom.assetPreloadText && state.assetWarmupText) dom.assetPreloadText.textContent = state.assetWarmupText;
    if (visible && dom.assetPreloadText && !state.assetWarmupText) {
      dom.assetPreloadText.textContent = "Đang tải tài nguyên lần đầu để bàn cờ hiển thị mượt hơn...";
    }
  }

  async function cacheStaticAssets(assets, tracker) {
    if (!("caches" in window)) return;
    const cache = await caches.open(`dmaihxcai-portal-runtime-${ASSET_WARMUP_VERSION}`);
    await Promise.all(assets.map(async (asset) => {
      try {
        const existing = await cache.match(asset);
        if (existing) return;
        const response = await fetchWithTimeout(asset, { cache: "force-cache" }, PORTAL_ASSET_TIMEOUT_MS);
        if (response && response.ok) await cache.put(asset, response.clone());
      } catch {
      } finally {
        tracker?.step(PORTAL_PRELOAD_TEXT.cache);
      }
    }));
  }

  async function decodeImageAssets(assets, tracker) {
    const imageAssets = assets.filter((asset) => /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(asset));
    await Promise.all(imageAssets.map(async (asset) => {
      try {
        await decodeImageAsset(asset);
      } finally {
        tracker?.step(PORTAL_PRELOAD_TEXT.decode);
      }
    }));
  }

  function decodeImageAsset(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = src;
      let done = false;
      const timer = window.setTimeout(finish, PORTAL_ASSET_TIMEOUT_MS);
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

  async function fetchWithTimeout(resource, options = {}, timeoutMs = PORTAL_ASSET_TIMEOUT_MS) {
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

  function createPortalWarmupTracker(totalSteps) {
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

  async function bootstrap() {
    try {
      if (!state.token) {
        if (state.savedAccessKey) {
          const restored = await restoreSessionFromSavedKey({ silent: true });
          if (restored) return;
        }
        showAccessGate();
        return;
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
      if (isSessionReplacedError(error) && state.savedAccessKey) {
        const restored = await restoreSessionFromSavedKey({ silent: true });
        if (restored) return;
      }
      if (!/UNAUTHORIZED/i.test(String(error?.message || ""))) throw error;
      writePersistentValue(STORAGE_TOKEN, "");
      writePersistentValue(LEGACY_STORAGE_TOKEN, "");
      writePersistentValue(STORAGE_USER, "");
      state.token = "";
      state.user = null;
      showAccessGate();
    }
  }

  async function restoreSessionFromSavedKey({ silent = false } = {}) {
    const key = state.savedAccessKey || readPersistentValue(STORAGE_ACCESS_KEY);
    if (!key) return false;
    try {
      const payload = await api("/api/license/activate", {
        method: "POST",
        body: { key, deviceId: state.deviceId }
      }, { suppressSessionReplaced: true });
      applySession(payload.user, payload.token, key);
      hideAccessGate();
      const [historyPayload, currentRoom] = await Promise.all([
        api("/api/history"),
        api("/api/rooms/current")
      ]);
      state.history = mergeHistoryLists(historyPayload.history, state.history);
      renderHistory();
      if (currentRoom.room) applyRoomState(currentRoom.room, { forceBoard: true, keepSelection: false });
      goRoute(isAdmin() && state.route === "admin" ? "admin" : state.route || "home", true);
      return true;
    } catch (error) {
      if (!silent) showAccessGate(error.message || "Key khong dung.");
      return false;
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

  function showAccessGate(message = "") {
    dom.accessGate?.classList.remove("hidden");
    document.body.classList.add("access-locked");
    updateAccessGateMode(false);
    if (dom.accessKeyMessage) dom.accessKeyMessage.textContent = message;
    window.setTimeout(() => dom.accessKeyInput?.focus({ preventScroll: true }), 60);
  }

  function hideAccessGate() {
    dom.accessGate?.classList.add("hidden");
    document.body.classList.remove("access-locked");
    if (dom.accessKeyMessage) dom.accessKeyMessage.textContent = "";
    state.pendingAccessKey = "";
    updateAccessGateMode(false);
  }

  function updateAccessGateMode(hasPendingKey) {
    dom.accessNameInput?.classList.add("hidden");
    if (dom.accessNameInput) dom.accessNameInput.required = false;
    if (dom.accessKeyInput) dom.accessKeyInput.readOnly = false;
    const submitButton = dom.accessKeyForm?.querySelector("button[type='submit']");
    if (submitButton) submitButton.textContent = "Kich hoat";
    return;
    if (submitButton) submitButton.textContent = hasPendingKey ? "Xác nhận tên" : "Kích hoạt";
  }

  async function onAccessKeySubmit(event) {
    event.preventDefault();
    const key = String(dom.accessKeyInput?.value || state.savedAccessKey || "").trim();
    if (!key) {
      showAccessGate("Hãy nhập Key kích hoạt.");
      return;
    }
    if (dom.accessKeyMessage) dom.accessKeyMessage.textContent = "Dang kich hoat Key...";
    try {
      const payload = await api("/api/license/activate", {
        method: "POST",
        body: { key, deviceId: state.deviceId }
      });
      applySession(payload.user, payload.token, key);
      hideAccessGate();
      if (dom.accessKeyInput) dom.accessKeyInput.value = "";
      if (dom.accessNameInput) dom.accessNameInput.value = "";
      const [historyPayload, currentRoom] = await Promise.all([
        api("/api/history"),
        api("/api/rooms/current")
      ]);
      state.history = mergeHistoryLists(historyPayload.history, state.history);
      renderHistory();
      if (currentRoom.room) applyRoomState(currentRoom.room, { forceBoard: true, keepSelection: false });
      if (isAdmin()) {
        await loadAdminUsers(true);
        goRoute("admin", true);
      } else {
        goRoute("home", true);
      }
      showToast(isAdmin() ? "Da mo trang quan tri." : "Da kich hoat Key.");
    } catch (error) {
      state.token = "";
      state.pendingAccessKey = "";
      updateAccessGateMode(false);
      writePersistentValue(STORAGE_TOKEN, "");
      writePersistentValue(LEGACY_STORAGE_TOKEN, "");
      writePersistentValue(STORAGE_USER, "");
      if (key !== state.savedAccessKey) writePersistentValue(STORAGE_ACCESS_KEY, "");
      showAccessGate(error.message || "Key khong dung.");
    }
    return;
    if (!state.pendingAccessKey) {
      if (dom.accessKeyMessage) dom.accessKeyMessage.textContent = "Đang kiểm tra Key...";
      try {
        const checked = await api("/api/license/check-key", {
          method: "POST",
          body: { key }
        });
        if (checked.admin) {
          const payload = await api("/api/license/activate", {
            method: "POST",
            body: { key }
          });
          applySession(payload.user, payload.token);
          hideAccessGate();
          if (dom.accessKeyInput) dom.accessKeyInput.value = "";
          await loadAdminUsers(true);
          goRoute("admin", true);
          showToast("Đã mở trang quản trị.");
          return;
        }
        state.pendingAccessKey = key;
        updateAccessGateMode(true);
        if (dom.accessKeyMessage) dom.accessKeyMessage.textContent = "Key hợp lệ. Hãy nhập tên khách hàng.";
        window.setTimeout(() => dom.accessNameInput?.focus({ preventScroll: true }), 40);
        return;
      } catch (error) {
        state.pendingAccessKey = "";
        updateAccessGateMode(false);
        writePersistentValue(STORAGE_TOKEN, "");
        writePersistentValue(LEGACY_STORAGE_TOKEN, "");
        writePersistentValue(STORAGE_USER, "");
        showAccessGate(error.message || "Key không đúng.");
        return;
      }
    }
    const customerName = String(dom.accessNameInput?.value || "").trim();
    if (!customerName) {
      showAccessGate("Hãy nhập tên khách hàng.");
      return;
    }
    if (dom.accessKeyMessage) dom.accessKeyMessage.textContent = "Đang kích hoạt license...";
    try {
      const payload = await api("/api/license/activate", {
        method: "POST",
        body: { key, customerName }
      });
      applySession(payload.user, payload.token);
      hideAccessGate();
      if (dom.accessKeyInput) dom.accessKeyInput.value = "";
      if (dom.accessNameInput) dom.accessNameInput.value = "";
      const [historyPayload, currentRoom] = await Promise.all([
        api("/api/history"),
        api("/api/rooms/current")
      ]);
      state.history = mergeHistoryLists(historyPayload.history, state.history);
      renderHistory();
      if (currentRoom.room) applyRoomState(currentRoom.room, { forceBoard: true, keepSelection: false });
      if (isAdmin()) {
        await loadAdminUsers(true);
        goRoute("admin", true);
      } else {
        goRoute("home", true);
      }
      showToast(isAdmin() ? "Đã mở trang quản trị." : "Đã kích hoạt license.");
    } catch (error) {
      state.token = "";
      state.pendingAccessKey = "";
      updateAccessGateMode(false);
      writePersistentValue(STORAGE_TOKEN, "");
      writePersistentValue(LEGACY_STORAGE_TOKEN, "");
      writePersistentValue(STORAGE_USER, "");
      showAccessGate(error.message || "Key không đúng.");
    }
  }

  function syncViewportHeight() {
    const width = Math.round(window.innerWidth || 0);
    const height = Math.round(window.innerHeight || 0);
    state.lastViewportWidth = width;
    state.lastViewportHeight = height;
    document.documentElement.style.setProperty("--app-vh", `${height * 0.01}px`);
    lockRoomViewportHeight({ force: !state.roomViewportHeight });
  }

  function isCompactMobile() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  function lockRoomViewportHeight({ force = false } = {}) {
    if (!isCompactMobile() || state.route !== "room") return;
    const width = Math.round(window.innerWidth || 0);
    const height = Math.round(window.innerHeight || 0);
    const previousWidth = state.roomViewportWidth || width;
    const widthChanged = Math.abs(width - previousWidth) > 2;
    if (force || !state.roomViewportHeight || widthChanged) {
      state.roomViewportWidth = width;
      state.roomViewportHeight = height;
      document.documentElement.style.setProperty("--room-vh", `${height * 0.01}px`);
    }
  }

  function setupRoomMobileDock() {
    roomMobilePanelButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.roomMobileMode || "control";
        setRoomMobilePanel(isCompactMobile() && state.roomMobilePanel === mode ? "" : mode);
        if (isCompactMobile()) state.roomMobileMenuOpen = false;
        renderRoomMobilePanels();
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

  function openParticipantsPanel() {
    state.roomMobileMenuOpen = false;
    if (isCompactMobile() && state.roomMobilePanel === "viewers") {
      setRoomMobilePanel("");
      return;
    }
    setRoomMobilePanel("viewers");
  }

  function setRoomMobilePanel(panel) {
    state.roomMobilePanel = ["control", "viewers", "chat"].includes(panel) ? panel : "";
    renderRoomMobilePanels();
    if (state.roomMobilePanel === "chat" && isCompactMobile()) {
      window.setTimeout(() => dom.chatInput?.focus({ preventScroll: true }), 80);
    }
  }

  function toggleRoomMobileMenu() {
    state.roomMobileMenuOpen = !state.roomMobileMenuOpen;
    if (state.roomMobileMenuOpen) state.roomMobilePanel = "";
    renderRoomMobilePanels();
  }

  function renderRoomMobilePanels() {
    const compact = isCompactMobile();
    const libraryBookMobile = compact && state.route === "library" && state.libraryTab === "book-create";
    document.body.classList.toggle("portal-mobile-mode", compact);
    document.body.classList.toggle("room-mobile-menu-open", compact && !!state.roomMobileMenuOpen);
    document.body.classList.toggle("library-book-mobile-mode", libraryBookMobile);
    document.body.dataset.route = state.route || "home";
    renderPortalBrandMark();
    if (compact && state.route === "room") {
      lockRoomViewportHeight();
    }
    roomMobilePanels.forEach((panel) => {
      const mode = panel.dataset.roomMobilePanel || "control";
      panel.classList.toggle("is-mobile-active", !compact || (!!state.roomMobilePanel && mode === state.roomMobilePanel));
    });
    roomMobilePanelButtons.forEach((button) => {
      button.classList.toggle("active", compact && button.dataset.roomMobileMode === state.roomMobilePanel);
    });
    if (dom.roomMobileMenuBtn) {
      dom.roomMobileMenuBtn.classList.toggle("active", compact && !!state.roomMobileMenuOpen);
      dom.roomMobileMenuBtn.setAttribute("aria-expanded", compact && state.roomMobileMenuOpen ? "true" : "false");
    }
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
    state.lobbyMode = ["create", "bot"].includes(mode) ? mode : "join";
    dom.showJoinRoom.classList.toggle("active", state.lobbyMode === "join");
    dom.showCreateRoom.classList.toggle("active", state.lobbyMode === "create");
    dom.showBotRoom.classList.toggle("active", state.lobbyMode === "bot");
    dom.joinRoomForm.classList.toggle("hidden", state.lobbyMode !== "join");
    dom.createRoomForm.classList.toggle("hidden", state.lobbyMode !== "create");
    dom.botRoomForm.classList.toggle("hidden", state.lobbyMode !== "bot");
    setMessage(dom.matchHubMessage, "");
  }

  function setCreateSide(side) {
    state.createSide = side === "b" ? "b" : "w";
    dom.pickRed.classList.toggle("active", state.createSide === "w");
    dom.pickBlack.classList.toggle("active", state.createSide === "b");
  }

  function setBotSide(side) {
    state.botSide = side === "b" ? "b" : "w";
    dom.botPickRed.classList.toggle("active", state.botSide === "w");
    dom.botPickBlack.classList.toggle("active", state.botSide === "b");
  }

  function updateTimeLabels() {
    const yourMinutes = Number(dom.yourTimeRange.value || 10);
    const opponentMinutes = Number(dom.opponentTimeRange.value || 10);
    const botMinutes = Number(dom.botTimeRange.value || 10);
    dom.yourTimeRangeValue.textContent = `${yourMinutes} phút`;
    dom.opponentTimeRangeValue.textContent = `${opponentMinutes} phút`;
    dom.botTimeRangeValue.textContent = `${botMinutes} phút`;
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
    const mobileAdminRoute = isMobileRoomEntry && route === "admin";
    if (isMobileRoomEntry && route === "home") route = state.room ? "room" : "match";
    if (state.booting && !mobileAdminRoute) route = isMobileRoomEntry ? "match" : "home";
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
    if (route === "library") {
      renderLibrary();
    }
    if (route === "admin") {
      startAdminPolling();
      renderAdminState();
      if (isAdmin() && !state.adminUsers.length && !state.adminLoading) {
        void loadAdminUsers();
      }
    } else {
      stopAdminPolling();
    }

    updateResumeButton();
    renderProfile();
    renderRoomMobilePanels();
    reportActivity();
  }

  function handleBack() {
    if (isMobileRoomEntry && state.route === "room") {
      void leaveRoomFromMobileBack();
      return;
    }
    if (isMobileRoomEntry && state.route === "match") {
      window.location.href = "/analysis";
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    goRoute(state.room ? "room" : "home", true);
  }

  function startActivityHeartbeat() {
    if (state.activityTimer) return;
    state.activityTimer = window.setInterval(reportActivity, 12000);
    reportActivity();
  }

  function activityLabelForRoute() {
    if (state.route === "room") {
      return state.room?.key ? `Đang trong phòng ${state.room.key}` : "Đang trong phòng đấu";
    }
    return {
      home: "Đang ở sảnh chính",
      match: "Đang ở khu phòng đấu",
      library: "Đang xem thư viện cá nhân",
      admin: "Đang mở trang quản trị",
      review: "Đang xem lại ván đấu",
      analysis: "Đang dùng phần mềm phân tích"
    }[state.route] || "Đang hoạt động";
  }

  function reportActivity(action = "") {
    if (!state.token || !state.user) return;
    const roomKey = state.room?.key || state.roomKey || "";
    api("/api/activity", {
      method: "POST",
      body: {
        route: state.route,
        roomKey,
        action: action || activityLabelForRoute()
      }
    }).catch(() => {});
  }

  function applySession(user, token, accessKey = "") {
    state.user = user ? {
      ...user,
      avatarUrl: user.avatarUrl || state.deviceAvatarUrl
    } : null;
    state.sessionSuspended = false;
    state.openingBooks = normalizeOpeningBookList(user?.openingBooks);
    if (accessKey) {
      state.savedAccessKey = String(accessKey || "").trim();
      writePersistentValue(STORAGE_ACCESS_KEY, state.savedAccessKey);
    }
    if (token) {
      state.token = token;
      writePersistentValue(STORAGE_TOKEN, token);
      writePersistentValue(LEGACY_STORAGE_TOKEN, "");
    }
    persistStoredUser(state.user);
    if (state.user) hideAccessGate();
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
    clearRoomMoveAnimation();
    clearReviewMoveAnimation();
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
    state.adminLicenses = [];
    state.adminRawKeyAvailable = false;
    state.adminLicenseFilter = "";
    state.adminSelectedUserId = "";
    state.adminLoading = false;
    state.lastChatSignature = "";
    writePersistentValue(STORAGE_TOKEN, "");
    writePersistentValue(LEGACY_STORAGE_TOKEN, "");
    writePersistentValue(STORAGE_USER, "");
    localStorage.removeItem(STORAGE_ROOM);
    closeProfileModal();
    renderHistory();
    renderAdminState();
    renderProfile();
    showAccessGate("Hãy nhập Key kích hoạt để tiếp tục.");
  }

  async function logout() {
    clearSession();
    goRoute("home", true);
    showToast("Đã thoát phiên Key trên trình duyệt này.");
  }

  function openProfileModal() {
    if (!state.user) return;
    state.selectedAvatarUrl = state.user.avatarUrl || state.deviceAvatarUrl || DEVICE_AVATARS[0] || "";
    renderProfile();
    dom.profileModal.classList.remove("hidden");
    renderLicenseInfo();
  }

  function closeProfileModal() {
    dom.profileModal.classList.add("hidden");
  }

  function formatDateTime(value) {
    const time = Date.parse(value || "");
    if (!time) return "-";
    return new Date(time).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function licenseRemainingLabel(license) {
    const expiresAt = Date.parse(license?.expiresAt || "");
    if (!expiresAt) return "-";
    const ms = Math.max(0, expiresAt - Date.now());
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    return `${days} ngày ${String(hours).padStart(2, "0")} giờ`;
  }

  function renderLicenseInfo() {
    if (!dom.profileLicenseInfo) return;
    const license = state.user?.license || null;
    if (!state.user) {
      dom.profileLicenseInfo.innerHTML = "";
      return;
    }
    if (state.user.role === "admin") {
      dom.profileLicenseInfo.innerHTML = `<div><strong>Quản trị viên</strong></div><div>Trạng thái: Đang hoạt động</div>`;
      return;
    }
    dom.profileLicenseInfo.innerHTML = `
      <div><strong>Tên khách hàng:</strong> ${escapeHtml(license?.customerName || state.user.displayName || "-")}</div>
      <div><strong>Trạng thái:</strong> ${license?.status === "activated" ? "Đang hoạt động" : license?.status === "expired" ? "Đã hết hạn" : "Chưa kích hoạt"}</div>
      <div><strong>Còn lại:</strong> ${licenseRemainingLabel(license)}</div>
      <div><strong>Ngày kích hoạt:</strong> ${formatDateTime(license?.activatedAt)}</div>
      <div><strong>Ngày hết hạn:</strong> ${formatDateTime(license?.expiresAt)}</div>
    `;
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

  async function exportAdminLicenseKeys() {
    if (!isAdmin()) return;
    try {
      const payload = await api("/api/admin/licenses/export");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payload.file || "license-export.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast("Đã xuất danh sách key.");
    } catch (error) {
      showToast(error.message || "Không thể xuất danh sách key.");
    }
  }

  async function importAdminLicenseKeys(event) {
    if (!isAdmin()) return;
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const rawText = await file.text();
      const payload = await api("/api/admin/licenses/import", {
        method: "POST",
        body: { rawText }
      });
      showToast(`Đã nhập ${payload.count || 0} key gốc lên server.`);
      await loadAdminUsers(true);
    } catch (error) {
      showToast(error.message || "Không thể nhập file key gốc.");
    } finally {
      if (input) input.value = "";
    }
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
      paintAvatar(dom.roomMobileProfileAvatar, deviceAvatar, "D");
      renderPortalBrandMark();
      renderAvatarChoices();
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
    paintAvatar(dom.roomMobileProfileAvatar, state.user);
    renderPortalBrandMark();
    renderLicenseInfo();
    renderAvatarChoices();
  }

  function renderAvatarChoices() {
    if (!dom.avatarChoices) return;
    const canChoose = false;
    dom.avatarChoices.classList.toggle("hidden", true);
    if (dom.saveAvatarBtn) dom.saveAvatarBtn.classList.toggle("hidden", true);
    dom.avatarChoices.innerHTML = "";
    if (!canChoose) return;

    const activeUrl = state.selectedAvatarUrl || state.user.avatarUrl || state.deviceAvatarUrl || DEVICE_AVATARS[0] || "";
    DEVICE_AVATARS.forEach((url) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `avatar-choice${url === activeUrl ? " active" : ""}`;
      button.setAttribute("aria-label", "Chọn ảnh đại diện");
      const image = document.createElement("img");
      image.src = url;
      image.alt = "";
      image.decoding = "async";
      image.draggable = false;
      button.addEventListener("click", () => {
        state.selectedAvatarUrl = url;
        paintAvatar(dom.profileAvatarLarge, { ...(state.user || {}), avatarUrl: url }, "D");
        renderAvatarChoices();
      });
      button.appendChild(image);
      dom.avatarChoices.appendChild(button);
    });
  }

  async function saveSelectedAvatar() {
    if (!state.user || !state.token) return;
    const avatarUrl = DEVICE_AVATARS.includes(state.selectedAvatarUrl) ? state.selectedAvatarUrl : "";
    if (!avatarUrl) return;
    if (dom.saveAvatarBtn) dom.saveAvatarBtn.disabled = true;
    try {
      const payload = await api("/api/profile", {
        method: "POST",
        body: { avatarUrl }
      });
      applySession(payload.user, state.token);
      state.selectedAvatarUrl = payload.user?.avatarUrl || avatarUrl;
      if (state.room) {
        patchLocalUserIntoRoom();
        renderRoomMeta();
      }
      renderAvatarChoices();
      showToast("Đã lưu ảnh đại diện.");
    } catch (error) {
      showToast(error.message || "Không thể lưu ảnh đại diện.");
    } finally {
      if (dom.saveAvatarBtn) dom.saveAvatarBtn.disabled = false;
    }
  }

  function normalizeOpeningBookSide(value) {
    return value === "b" ? "b" : "w";
  }

  function createOpeningBookEditorState(book = null) {
    const parsed = XiangqiCore.parseFenState(book?.startFen || START_FEN);
    const bookSide = normalizeOpeningBookSide(book?.bookSide || book?.sideChoice || book?.viewSide || book?.side);
    return {
      id: book?.id || "",
      name: book?.name || "",
      startFen: book?.startFen || START_FEN,
      bookSide,
      root: normalizeOpeningBookNode(book?.tree || {}),
      path: [],
      board: parsed.board,
      side: parsed.side,
      lastBackNode: null
    };
  }

  function createOpeningBookPracticeState() {
    return {
      active: false,
      choosingStart: false,
      startSource: null,
      startOptions: [],
      startPath: [],
      bookId: "",
      bookName: "",
      paths: [],
      pathIndex: 0,
      step: 0,
      machineSide: "b",
      hintMove: "",
      autoTimer: 0,
      awaitingLineConfirm: false,
      completed: false
    };
  }

  function normalizeOpeningBookNode(node) {
    const move = /^[a-i][0-9][a-i][0-9]$/.test(String(node?.move || "")) ? String(node.move) : "";
    const notation = String(node?.notation || "").trim().slice(0, 32);
    const children = Array.isArray(node?.children)
      ? node.children.map(normalizeOpeningBookNode).filter((child) => child.move)
      : [];
    return { move, notation, children };
  }

  function normalizeOpeningBookList(books) {
    return Array.isArray(books)
      ? books.map((book) => {
          const bookSide = normalizeOpeningBookSide(book?.bookSide || book?.sideChoice || book?.viewSide || book?.side);
          return {
          ...(book || {}),
          id: String(book?.id || ""),
          name: String(book?.name || "Khai cuộc chưa đặt tên"),
          startFen: book?.startFen || START_FEN,
          bookSide,
          side: bookSide,
          tree: normalizeOpeningBookNode(book?.tree || {})
          };
        }).filter((book) => book.id)
      : [];
  }

  function setLibraryTab(tab) {
    state.libraryTab = ["history", "book-create", "book-saved", "kydao"].includes(tab) ? tab : "history";
    renderLibrary();
    renderRoomMobilePanels();
    if (state.libraryTab === "book-create") drawOpeningBookScene(true, true);
    if (state.libraryTab === "kydao") void loadKydaoMasters(false);
  }

  function renderLibrary() {
    renderHistory();
    renderOpeningBookTabs();
    renderOpeningBookEditor();
    renderOpeningBookSavedList();
    renderKydaoLibrary();
  }

  function renderOpeningBookTabs() {
    const active = state.libraryTab || "history";
    [
      [dom.libraryHistoryTab, dom.libraryHistoryPanel, "history"],
      [dom.libraryBookCreateTab, dom.libraryBookCreatePanel, "book-create"],
      [dom.libraryBookSavedTab, dom.libraryBookSavedPanel, "book-saved"],
      [dom.libraryKydaoTab, dom.libraryKydaoPanel, "kydao"]
    ].forEach(([button, panel, key]) => {
      button?.classList.toggle("active", active === key);
      button?.setAttribute("aria-selected", active === key ? "true" : "false");
      panel?.classList.toggle("hidden", active !== key);
    });
  }

  function openingBookCurrentNode() {
    let node = state.openingBookEditor.root;
    for (const index of state.openingBookEditor.path) {
      node = node.children?.[index] || node;
    }
    return node;
  }

  function nodeAtOpeningBookPath(path) {
    let node = state.openingBookEditor.root;
    for (const index of path || []) node = node.children?.[index] || node;
    return node;
  }

  function rebuildOpeningBookBoard() {
    const parsed = XiangqiCore.parseFenState(state.openingBookEditor.startFen || START_FEN);
    const board = parsed.board;
    let side = parsed.side;
    let node = state.openingBookEditor.root;
    for (const index of state.openingBookEditor.path) {
      const child = node.children?.[index];
      if (!child || !XiangqiCore.isLegalMove(board, child.move, side)) break;
      XiangqiCore.applyMoveToBoard(board, child.move);
      side = oppositeSide(side);
      node = child;
    }
    state.openingBookEditor.board = board;
    state.openingBookEditor.side = side;
  }

  function setOpeningBookSide(side) {
    if (state.openingBookPractice?.active) return;
    const nextSide = normalizeOpeningBookSide(side);
    if (state.openingBookEditor.bookSide === nextSide) return;
    clearOpeningBookMoveAnimation();
    state.openingBookEditor.bookSide = nextSide;
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    state.openingBookLastBoardFrame = "";
    state.openingBookLastPieceFrame = "";
    state.openingBookSlotLayoutKey = "";
    renderOpeningBookEditor();
  }

  function invalidateOpeningBookLayout() {
    state.openingBookLastBoardFrame = "";
    state.openingBookLastPieceFrame = "";
    state.openingBookSlotLayoutKey = "";
  }

  function renderOpeningBookEditor() {
    if (!dom.openingBookStatus) return;
    const editor = state.openingBookEditor;
    const current = openingBookCurrentNode();
    const branchCount = current.children?.length || 0;
    const practicing = Boolean(state.openingBookPractice?.active);
    const choosingPracticeStart = Boolean(state.openingBookPractice?.choosingStart);
    const practiceBusy = practicing || choosingPracticeStart;
    if (practicing) {
      const total = state.openingBookPractice.paths.length;
      const currentLine = Math.min(total, state.openingBookPractice.pathIndex + 1);
      dom.openingBookStatus.classList.remove("hidden");
      dom.openingBookStatus.textContent = state.openingBookPractice.completed
        ? "Đã luyện xong toàn bộ biến khai cuộc."
        : `Đang luyện biến ${currentLine}/${total}. ${branchCount >= 2 ? "Máy đang chọn nhánh." : `Tới lượt ${editor.side === "w" ? "Đỏ" : "Đen"} đi đúng biên bản.`}`;
    } else {
      dom.openingBookStatus.classList.add("hidden");
      dom.openingBookStatus.textContent = "";
    }
    dom.openingBookPrevBtn.disabled = practiceBusy || editor.path.length <= 0;
    dom.openingBookNextBtn.disabled = practiceBusy || !branchCount;
    dom.openingBookResetBtn.disabled = practiceBusy;
    dom.openingBookSaveBtn.disabled = practiceBusy;
    const bookSide = normalizeOpeningBookSide(editor.bookSide);
    if (dom.openingBookRedSideBtn) {
      dom.openingBookRedSideBtn.classList.toggle("active", bookSide === "w");
      dom.openingBookRedSideBtn.setAttribute("aria-pressed", bookSide === "w" ? "true" : "false");
      dom.openingBookRedSideBtn.disabled = practiceBusy;
    }
    if (dom.openingBookBlackSideBtn) {
      dom.openingBookBlackSideBtn.classList.toggle("active", bookSide === "b");
      dom.openingBookBlackSideBtn.setAttribute("aria-pressed", bookSide === "b" ? "true" : "false");
      dom.openingBookBlackSideBtn.disabled = practiceBusy;
    }
    if (dom.openingBookPracticeBtn) {
      dom.openingBookPracticeBtn.classList.toggle("hidden", practiceBusy);
      dom.openingBookPracticeBtn.disabled = practiceBusy || !countOpeningBookNodes(editor.root) || !collectOpeningBookPracticePaths(editor.root).length;
    }
    if (dom.openingBookPracticeHintBtn) {
      dom.openingBookPracticeHintBtn.classList.toggle("hidden", !practicing);
      dom.openingBookPracticeHintBtn.disabled = !canShowOpeningBookPracticeHint();
    }
    if (dom.openingBookPracticeExitBtn) {
      dom.openingBookPracticeExitBtn.classList.toggle("hidden", !practicing);
    }
    if (practicing) dom.openingBookBranchChooser?.classList.add("hidden");
    renderOpeningBookPracticeModal();
    renderOpeningBookMoveList();
    if (state.route === "library" && state.libraryTab === "book-create") drawOpeningBookScene(true);
  }

  function renderOpeningBookPracticeModal() {
    if (!dom.openingBookPracticeModal) return;
    const practice = state.openingBookPractice;
    const choosingStart = Boolean(practice?.choosingStart);
    const show = choosingStart || Boolean(practice?.active && practice.awaitingLineConfirm);
    dom.openingBookPracticeModal.classList.toggle("hidden", !show);
    if (!show) return;
    if (dom.openingBookPracticeChoiceList) {
      dom.openingBookPracticeChoiceList.innerHTML = "";
      dom.openingBookPracticeChoiceList.classList.toggle("hidden", !choosingStart);
    }
    if (choosingStart) {
      if (dom.openingBookPracticeModalTitle) dom.openingBookPracticeModalTitle.textContent = "Chọn điểm luyện";
      if (dom.openingBookPracticeModalText) dom.openingBookPracticeModalText.textContent = "Bạn muốn luyện khai cuộc từ đâu?";
      if (dom.openingBookPracticeChoiceList) {
        const fragment = document.createDocumentFragment();
        (practice.startOptions || []).forEach((option, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "secondary-button opening-book-practice-choice";
          button.textContent = option.label || (index === 0 ? "Từ đầu" : `Biến ${index}`);
          button.addEventListener("click", () => beginOpeningBookPracticeFromOption(index));
          fragment.appendChild(button);
        });
        dom.openingBookPracticeChoiceList.appendChild(fragment);
      }
      if (dom.openingBookPracticeYesBtn) {
        dom.openingBookPracticeYesBtn.classList.add("hidden");
        dom.openingBookPracticeYesBtn.textContent = "Đồng ý";
      }
      if (dom.openingBookPracticeNoBtn) {
        dom.openingBookPracticeNoBtn.classList.remove("hidden");
        dom.openingBookPracticeNoBtn.textContent = "Hủy";
      }
      return;
    }
    dom.openingBookPracticeYesBtn?.classList.remove("hidden");
    dom.openingBookPracticeNoBtn?.classList.remove("hidden");
    const hasNext = practice.pathIndex + 1 < practice.paths.length;
    if (dom.openingBookPracticeModalTitle) {
      dom.openingBookPracticeModalTitle.textContent = hasNext ? "Đã hoàn thành biến này" : "Đã hoàn thành toàn bộ book";
    }
    if (dom.openingBookPracticeModalText) {
      dom.openingBookPracticeModalText.textContent = hasNext
        ? `Chuyển sang biến ${practice.pathIndex + 2}/${practice.paths.length}?`
        : "Bạn đã luyện xong tất cả các biến đã soạn.";
    }
    if (dom.openingBookPracticeYesBtn) {
      dom.openingBookPracticeYesBtn.textContent = hasNext ? "Đồng ý" : "Luyện lại từ đầu";
    }
    if (dom.openingBookPracticeNoBtn) {
      dom.openingBookPracticeNoBtn.textContent = "Luyện lại";
    }
  }

  function renderOpeningBookMoveList() {
    if (!dom.openingBookMoveList) return;
    dom.openingBookMoveList.innerHTML = "";
    const rows = [];
    walkOpeningBookNodes(state.openingBookEditor.root, [], (node, path) => {
      if ((node.children?.length || 0) >= 2) rows.push({ node, path });
    });
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "Chưa có điểm rẽ nhánh nào.";
      dom.openingBookMoveList.appendChild(empty);
      return;
    }
    rows.slice(0, 24).forEach((item) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "opening-book-branch-row";
      row.textContent = `Nước ${item.path.length}: ${item.node.children.map((child, index) => `${index + 1}. ${child.notation || child.move}`).join("  ")}`;
      row.addEventListener("click", () => {
        state.openingBookEditor.path = item.path.slice();
        state.openingBookSelectedSquare = null;
        state.openingBookHints = [];
        rebuildOpeningBookBoard();
        renderOpeningBookEditor();
      });
      dom.openingBookMoveList.appendChild(row);
    });
  }

  function walkOpeningBookNodes(node, path, visit) {
    visit(node, path);
    (node.children || []).forEach((child, index) => walkOpeningBookNodes(child, [...path, index], visit));
  }

  function stepOpeningBookBack() {
    if (!state.openingBookEditor.path.length) return;
    const parentPath = state.openingBookEditor.path.slice(0, -1);
    const removedIndex = state.openingBookEditor.path[state.openingBookEditor.path.length - 1];
    const parent = nodeAtOpeningBookPath(parentPath);
    const removedMove = parent?.children?.[removedIndex]?.move || "";
    const animation = removedMove ? buildOpeningBookMoveAnimation(removedMove, { reverse: true }) : null;
    if (animation) {
      primeOpeningBookMoveAnimation(animation);
      playMoveSound("move", OPENING_BOOK_MOVE_ANIMATION_MS);
    } else {
      clearOpeningBookMoveAnimation();
    }
    state.openingBookEditor.lastBackNode = parent?.children?.[removedIndex] || null;
    state.openingBookEditor.path = parentPath;
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    rebuildOpeningBookBoard();
    renderOpeningBookEditor();
    if (animation) startOpeningBookMoveAnimation(animation, { prepared: true });
  }

  function openOpeningBookBranchChooser() {
    const children = openingBookCurrentNode().children || [];
    if (!children.length) return;
    if (children.length === 1) {
      const animation = buildOpeningBookMoveAnimation(children[0].move);
      if (animation) primeOpeningBookMoveAnimation(animation);
      else clearOpeningBookMoveAnimation();
      playOpeningBookMoveSound(state.openingBookEditor.board, children[0].move, state.openingBookEditor.side);
      state.openingBookEditor.path.push(0);
      state.openingBookSelectedSquare = null;
      state.openingBookHints = [];
      rebuildOpeningBookBoard();
      renderOpeningBookEditor();
      if (animation) startOpeningBookMoveAnimation(animation, { prepared: true });
      return;
    }
    renderOpeningBookBranchChooser(false);
  }

  function renderOpeningBookBranchChooser(editMode) {
    if (!dom.openingBookBranchChooser) return;
    const node = openingBookCurrentNode();
    const children = node.children || [];
    dom.openingBookBranchChooser.innerHTML = "";
    dom.openingBookBranchChooser.classList.remove("hidden");
    const title = document.createElement("strong");
    title.textContent = editMode ? "Xóa biến không muốn lưu" : "Chọn biến tiếp theo";
    dom.openingBookBranchChooser.appendChild(title);
    children.forEach((child, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = `${index + 1}. ${child.notation || child.move}`;
      button.addEventListener("click", () => {
        if (editMode) {
          children.splice(index, 1);
          dom.openingBookBranchChooser.classList.add("hidden");
          renderOpeningBookEditor();
          return;
        }
        playOpeningBookMoveSound(state.openingBookEditor.board, child.move, state.openingBookEditor.side);
        const animation = buildOpeningBookMoveAnimation(child.move);
        if (animation) primeOpeningBookMoveAnimation(animation);
        else clearOpeningBookMoveAnimation();
        state.openingBookEditor.path.push(index);
        dom.openingBookBranchChooser.classList.add("hidden");
        state.openingBookSelectedSquare = null;
        state.openingBookHints = [];
        rebuildOpeningBookBoard();
        renderOpeningBookEditor();
        if (animation) startOpeningBookMoveAnimation(animation, { prepared: true });
      });
      dom.openingBookBranchChooser.appendChild(button);
    });
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "ghost-button";
    edit.textContent = editMode ? "Xong" : "Tùy chỉnh";
    edit.addEventListener("click", () => renderOpeningBookBranchChooser(!editMode));
    const close = document.createElement("button");
    close.type = "button";
    close.className = "ghost-button";
    close.textContent = "Đóng";
    close.addEventListener("click", () => dom.openingBookBranchChooser.classList.add("hidden"));
    dom.openingBookBranchChooser.append(edit, close);
  }

  function resetOpeningBookEditor() {
    const bookSide = normalizeOpeningBookSide(state.openingBookEditor?.bookSide);
    stopOpeningBookPractice({ silent: true });
    clearOpeningBookMoveAnimation();
    state.openingBookEditor = createOpeningBookEditorState({ bookSide });
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    state.openingBookLastBoardFrame = "";
    state.openingBookLastPieceFrame = "";
    state.openingBookSlotLayoutKey = "";
    renderOpeningBookEditor();
  }

  async function saveOpeningBookEditor() {
    const name = window.prompt("Nhập tên khai cuộc", state.openingBookEditor.name || "");
    if (!name || !name.trim()) return;
    try {
      const payload = await api("/api/opening-books", {
        method: "POST",
        body: {
          book: {
            id: state.openingBookEditor.id,
            name: name.trim(),
            startFen: state.openingBookEditor.startFen,
            bookSide: normalizeOpeningBookSide(state.openingBookEditor.bookSide),
            tree: state.openingBookEditor.root
          }
        }
      });
      state.openingBooks = normalizeOpeningBookList(payload.books);
      if (payload.user) applySession(payload.user, state.token);
      state.openingBookEditor.id = payload.book?.id || state.openingBookEditor.id;
      state.openingBookEditor.name = payload.book?.name || name.trim();
      state.openingBookEditor.bookSide = normalizeOpeningBookSide(payload.book?.bookSide || state.openingBookEditor.bookSide);
      renderLibrary();
      showToast("Đã lưu book khai cuộc.");
    } catch (error) {
      showToast(error.message || "Không thể lưu book khai cuộc.");
    }
  }

  function renderOpeningBookSavedList() {
    if (!dom.openingBookSavedList) return;
    dom.openingBookSavedList.innerHTML = "";
    const books = normalizeOpeningBookList(state.openingBooks);
    if (books.length) {
      renderOpeningBookSavedSections(books);
      return;
    }
    if (!books.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "Chưa có book khai cuộc nào.";
      dom.openingBookSavedList.appendChild(empty);
      return;
    }
    books.forEach((book) => {
      const item = document.createElement("article");
      item.className = "history-item opening-book-item";
      const header = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = book.name;
      const pill = document.createElement("span");
      pill.className = "result-pill draw";
      pill.textContent = `${Math.max(0, countOpeningBookNodes(book.tree) - 1)} nước`;
      header.append(title, pill);
      const detail = document.createElement("div");
      detail.style.color = "var(--muted)";
      detail.style.fontSize = "13px";
      detail.textContent = `Cập nhật: ${formatDate(book.updatedAt || book.createdAt)}`;
      const actions = document.createElement("div");
      actions.className = "opening-book-item-actions";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "secondary-button";
      open.textContent = "Mở soạn";
      open.addEventListener("click", () => {
        stopOpeningBookPractice({ silent: true });
        state.openingBookEditor = createOpeningBookEditorState(book);
        state.openingBookSelectedSquare = null;
        state.openingBookHints = [];
        setLibraryTab("book-create");
      });
      const practice = document.createElement("button");
      practice.type = "button";
      practice.className = "primary-button";
      practice.textContent = "Luyện khai cuộc với máy";
      practice.addEventListener("click", () => startOpeningBookPractice(book));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "ghost-button";
      remove.textContent = "Xóa";
      remove.addEventListener("click", () => deleteOpeningBook(book.id));
      actions.append(open, practice, remove);
      item.append(header, detail, actions);
      dom.openingBookSavedList.appendChild(item);
    });
  }

  function renderOpeningBookSavedSections(books) {
    if (!dom.openingBookSavedList) return;
    dom.openingBookSavedList.innerHTML = "";
    const groups = [
      { side: "w", title: "Khai cuộc đi tiên" },
      { side: "b", title: "Khai cuộc đi hậu" }
    ];
    groups.forEach((group) => {
      const section = document.createElement("section");
      section.className = "opening-book-saved-section";
      const heading = document.createElement("h3");
      heading.textContent = group.title;
      section.appendChild(heading);
      const list = document.createElement("div");
      list.className = "opening-book-saved-list";
      const items = books.filter((book) => normalizeOpeningBookSide(book.bookSide || book.side) === group.side);
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "history-empty";
        empty.textContent = "Chưa có khai cuộc nào.";
        list.appendChild(empty);
      } else {
        items.forEach((book) => list.appendChild(createOpeningBookSavedItem(book)));
      }
      section.appendChild(list);
      dom.openingBookSavedList.appendChild(section);
    });
  }

  function createOpeningBookSavedItem(book) {
    const item = document.createElement("article");
    item.className = "history-item opening-book-item";
    const header = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = book.name;
    const pill = document.createElement("span");
    pill.className = "result-pill draw";
    pill.textContent = `${Math.max(0, countOpeningBookNodes(book.tree) - 1)} nước`;
    header.append(title, pill);
    const detail = document.createElement("div");
    detail.style.color = "var(--muted)";
    detail.style.fontSize = "13px";
    detail.textContent = `Cập nhật: ${formatDate(book.updatedAt || book.createdAt)}`;
    const actions = document.createElement("div");
    actions.className = "opening-book-item-actions";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "secondary-button";
    open.textContent = "Mở soạn";
    open.addEventListener("click", () => {
      stopOpeningBookPractice({ silent: true });
      clearOpeningBookMoveAnimation();
      state.openingBookEditor = createOpeningBookEditorState(book);
      invalidateOpeningBookLayout();
      state.openingBookSelectedSquare = null;
      state.openingBookHints = [];
      setLibraryTab("book-create");
    });
    const practice = document.createElement("button");
    practice.type = "button";
    practice.className = "primary-button";
    practice.textContent = "Luyện khai cuộc với máy";
    practice.addEventListener("click", () => startOpeningBookPractice(book));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost-button";
    remove.textContent = "Xóa";
    remove.addEventListener("click", () => deleteOpeningBook(book.id));
    actions.append(open, practice, remove);
    item.append(header, detail, actions);
    return item;
  }

  function countOpeningBookNodes(node) {
    if (!node) return 0;
    return 1 + (node.children || []).reduce((sum, child) => sum + countOpeningBookNodes(child), 0);
  }

  async function deleteOpeningBook(id) {
    if (!id || !window.confirm("Xóa book khai cuộc này?")) return;
    try {
      const payload = await api("/api/opening-books", {
        method: "DELETE",
        body: { id }
      });
      state.openingBooks = normalizeOpeningBookList(payload.books);
      if (payload.user) applySession(payload.user, state.token);
      renderLibrary();
      showToast("Đã xóa book khai cuộc.");
    } catch (error) {
      showToast(error.message || "Không thể xóa book khai cuộc.");
    }
  }

  function collectOpeningBookPracticePaths(root, startSide = "w") {
    const paths = [];
    const walk = (node, path, side, firstBranchSide = "") => {
      const children = Array.isArray(node?.children) ? node.children : [];
      const branchSide = firstBranchSide || (children.length >= 2 ? side : "");
      if (!children.length) {
        if (path.length) paths.push({ indexes: path.slice(), machineSide: branchSide || oppositeSide(startSide) });
        return;
      }
      for (let index = children.length - 1; index >= 0; index -= 1) {
        walk(children[index], [...path, index], oppositeSide(side), branchSide);
      }
    };
    walk(root || {}, [], startSide || "w");
    return paths;
  }

  function openingBookPathStartsWith(path, prefix) {
    if (!Array.isArray(path) || !Array.isArray(prefix) || prefix.length > path.length) return false;
    return prefix.every((value, index) => value === path[index]);
  }

  function openingBookPositionAtPath(startFen, root, path) {
    const parsed = XiangqiCore.parseFenState(startFen || START_FEN);
    let board = parsed.board;
    let side = parsed.side || "w";
    let node = root || {};
    for (const index of Array.isArray(path) ? path : []) {
      const child = node?.children?.[index];
      if (!child?.move || !XiangqiCore.isLegalMove(board, child.move, side)) break;
      XiangqiCore.applyMoveToBoard(board, child.move);
      side = oppositeSide(side);
      node = child;
    }
    return { board, side };
  }

  function findFirstOpeningBookBranch(root) {
    let node = root || {};
    const path = [];
    while (node) {
      const children = Array.isArray(node.children) ? node.children : [];
      if (children.length >= 2) return { node, path: path.slice() };
      if (children.length !== 1) return null;
      path.push(0);
      node = children[0];
    }
    return null;
  }

  function openingBookPracticeMoveLabel(source, branchPath, child) {
    const position = openingBookPositionAtPath(source.startFen, source.tree, branchPath);
    return child?.notation
      || (child?.move ? XiangqiCore.formatMoveNotation(child.move, position.board, position.side) : "")
      || child?.move
      || "Biến";
  }

  function buildOpeningBookPracticeStartOptions(source, allPaths) {
    const options = [{ label: "Từ đầu", startPath: [], paths: allPaths }];
    const firstBranch = findFirstOpeningBookBranch(source.tree);
    const children = Array.isArray(firstBranch?.node?.children) ? firstBranch.node.children : [];
    children.forEach((child, index) => {
      const branchPath = [...firstBranch.path, index];
      const paths = allPaths.filter((entry) => openingBookPathStartsWith(entry.indexes, branchPath));
      if (!paths.length) return;
      options.push({
        label: openingBookPracticeMoveLabel(source, firstBranch.path, child),
        startPath: firstBranch.path.slice(),
        paths
      });
    });
    return options.filter((option) => Array.isArray(option.paths) && option.paths.length);
  }

  function openingBookPracticeSource(book = null) {
    const bookSide = normalizeOpeningBookSide(book?.bookSide || book?.sideChoice || book?.viewSide || book?.side || state.openingBookEditor.bookSide);
    return {
      id: String(book?.id || state.openingBookEditor.id || ""),
      name: String(book?.name || state.openingBookEditor.name || "Book khai cuộc"),
      startFen: book?.startFen || state.openingBookEditor.startFen || START_FEN,
      bookSide,
      tree: normalizeOpeningBookNode(book?.tree || book?.root || state.openingBookEditor.root || {})
    };
  }

  function startOpeningBookPractice(book = null) {
    const source = openingBookPracticeSource(book);
    const startSide = XiangqiCore.parseFenState(source.startFen || START_FEN).side || "w";
    const paths = collectOpeningBookPracticePaths(source.tree, startSide);
    if (!paths.length) {
      showToast("Book này chưa có biến để luyện.");
      return;
    }
    stopOpeningBookPractice({ silent: true });
    state.openingBookEditor = createOpeningBookEditorState(source);
    invalidateOpeningBookLayout();
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    state.openingBookPractice = {
      ...createOpeningBookPracticeState(),
      choosingStart: true,
      startSource: source,
      startOptions: buildOpeningBookPracticeStartOptions(source, paths)
    };
    setLibraryTab("book-create");
    renderOpeningBookEditor();
  }

  function beginOpeningBookPracticeFromOption(optionIndex = 0) {
    const choosing = state.openingBookPractice;
    const source = choosing?.startSource;
    const option = choosing?.startOptions?.[optionIndex] || choosing?.startOptions?.[0];
    if (!source || !option?.paths?.length) {
      stopOpeningBookPractice({ silent: true });
      showToast("Không tìm thấy biến luyện hợp lệ.");
      return;
    }
    const startSide = XiangqiCore.parseFenState(source.startFen || START_FEN).side || "w";
    state.openingBookEditor = createOpeningBookEditorState(source);
    state.openingBookEditor.path = Array.isArray(option.startPath) ? option.startPath.slice() : [];
    invalidateOpeningBookLayout();
    state.openingBookPractice = {
      ...createOpeningBookPracticeState(),
      active: true,
      bookId: source.id || "",
      bookName: source.name || "Book khai cuộc",
      paths: option.paths,
      pathIndex: 0,
      step: state.openingBookEditor.path.length,
      startPath: state.openingBookEditor.path.slice(),
      machineSide: option.paths[0]?.machineSide || oppositeSide(startSide)
    };
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    rebuildOpeningBookBoard();
    setLibraryTab("book-create");
    scheduleOpeningBookAutoMove(760);
  }

  function stopOpeningBookPractice(options = {}) {
    if (state.openingBookPractice?.autoTimer) {
      clearTimeout(state.openingBookPractice.autoTimer);
    }
    const wasActive = Boolean(state.openingBookPractice?.active);
    state.openingBookPractice = createOpeningBookPracticeState();
    clearOpeningBookMoveAnimation();
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    renderOpeningBookPracticeModal();
    if (wasActive && !options.silent) {
      rebuildOpeningBookBoard();
      renderOpeningBookEditor();
      showToast("Đã thoát luyện khai cuộc.");
    }
  }

  function currentOpeningBookPracticePath() {
    const practice = state.openingBookPractice;
    if (!practice?.active) return [];
    return practice.paths[practice.pathIndex]?.indexes || [];
  }

  function currentOpeningBookPracticeLine() {
    const practice = state.openingBookPractice;
    if (!practice?.active) return null;
    return practice.paths[practice.pathIndex] || null;
  }

  function nextOpeningBookPracticeMove() {
    const practice = state.openingBookPractice;
    if (!practice?.active || practice.completed || practice.awaitingLineConfirm) return "";
    const path = currentOpeningBookPracticePath();
    if (practice.step >= path.length) return "";
    const node = openingBookCurrentNode();
    const targetIndex = path[practice.step];
    return node?.children?.[targetIndex]?.move || "";
  }

  function canShowOpeningBookPracticeHint() {
    return Boolean(state.openingBookPractice?.active && !shouldOpeningBookPracticeAutoMove() && nextOpeningBookPracticeMove());
  }

  function showOpeningBookPracticeHint() {
    const practice = state.openingBookPractice;
    if (!canShowOpeningBookPracticeHint()) {
      showToast("Chưa có nước cần gợi ý ở lượt này.");
      return;
    }
    practice.hintMove = nextOpeningBookPracticeMove();
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    drawOpeningBookScene(false, true);
  }

  function scheduleOpeningBookAutoMove(delay = 180) {
    const practice = state.openingBookPractice;
    if (!practice?.active || practice.completed || practice.awaitingLineConfirm) return;
    if (practice.autoTimer) clearTimeout(practice.autoTimer);
    practice.autoTimer = window.setTimeout(() => {
      practice.autoTimer = 0;
      runOpeningBookAutoMove();
    }, delay);
  }

  function runOpeningBookAutoMove() {
    const practice = state.openingBookPractice;
    if (!practice?.active || practice.completed || practice.awaitingLineConfirm) return;
    const path = currentOpeningBookPracticePath();
    if (practice.step >= path.length) {
      completeOpeningBookPracticeLine();
      return;
    }
    const node = openingBookCurrentNode();
    const children = Array.isArray(node.children) ? node.children : [];
    if (!shouldOpeningBookPracticeAutoMove()) {
      renderOpeningBookEditor();
      return;
    }
    const targetIndex = path[practice.step];
    const target = children[targetIndex];
    if (!target?.move) {
      completeOpeningBookPracticeLine();
      return;
    }
    advanceOpeningBookPracticeMove(target.move, true);
    scheduleOpeningBookAutoMove(820);
  }

  function shouldOpeningBookPracticeAutoMove() {
    const practice = state.openingBookPractice;
    if (!practice?.active || practice.completed) return false;
    const children = openingBookCurrentNode().children || [];
    return children.length >= 2 || state.openingBookEditor.side === practice.machineSide;
  }

  function playOpeningBookPracticeUserMove(move) {
    const practice = state.openingBookPractice;
    if (!practice?.active || practice.completed) return;
    const path = currentOpeningBookPracticePath();
    const node = openingBookCurrentNode();
    const children = Array.isArray(node.children) ? node.children : [];
    if (practice.step >= path.length) {
      completeOpeningBookPracticeLine();
      return;
    }
    if (shouldOpeningBookPracticeAutoMove()) {
      showToast("Đến lượt máy trong bài luyện.");
      state.openingBookSelectedSquare = null;
      state.openingBookHints = [];
      renderOpeningBookEditor();
      scheduleOpeningBookAutoMove(220);
      return;
    }
    const target = children[path[practice.step]];
    if (!target?.move || move !== target.move) {
      showToast("Sai nước khai cuộc. Bạn cần đi đúng biên bản đã soạn.");
      return;
    }
    advanceOpeningBookPracticeMove(move, false);
    scheduleOpeningBookAutoMove(680);
  }

  function advanceOpeningBookPracticeMove(move, byMachine) {
    const practice = state.openingBookPractice;
    const path = currentOpeningBookPracticePath();
    const targetIndex = path[practice.step];
    const node = openingBookCurrentNode();
    const target = node.children?.[targetIndex];
    if (!target || target.move !== move) return;
    const animation = buildOpeningBookMoveAnimation(move);
    if (animation) primeOpeningBookMoveAnimation(animation);
    else clearOpeningBookMoveAnimation();
    playOpeningBookMoveSound(state.openingBookEditor.board, move, state.openingBookEditor.side);
    state.openingBookEditor.path.push(targetIndex);
    practice.step += 1;
    practice.hintMove = "";
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    rebuildOpeningBookBoard();
    renderOpeningBookEditor();
    if (animation) startOpeningBookMoveAnimation(animation, { prepared: true });
  }

  function completeOpeningBookPracticeLine() {
    const practice = state.openingBookPractice;
    if (!practice?.active) return;
    practice.awaitingLineConfirm = true;
    if (practice.pathIndex + 1 >= practice.paths.length) {
      practice.completed = true;
    }
    practice.hintMove = "";
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    renderOpeningBookEditor();
  }

  function continueOpeningBookPracticeLine() {
    const practice = state.openingBookPractice;
    if (practice?.choosingStart) {
      beginOpeningBookPracticeFromOption(0);
      return;
    }
    if (!practice?.active) return;
    if (practice.pathIndex + 1 >= practice.paths.length) {
      practice.pathIndex = 0;
      practice.completed = false;
    } else {
      practice.pathIndex += 1;
    }
    practice.step = Array.isArray(practice.startPath) ? practice.startPath.length : 0;
    practice.awaitingLineConfirm = false;
    practice.machineSide = currentOpeningBookPracticeLine()?.machineSide || practice.machineSide || "b";
    practice.hintMove = "";
    state.openingBookEditor.path = Array.isArray(practice.startPath) ? practice.startPath.slice() : [];
    clearOpeningBookMoveAnimation();
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    rebuildOpeningBookBoard();
    renderOpeningBookEditor();
    showToast(`Chuyển sang biến ${practice.pathIndex + 1}/${practice.paths.length}.`);
    scheduleOpeningBookAutoMove(760);
  }

  function replayOpeningBookPracticeLine() {
    const practice = state.openingBookPractice;
    if (!practice?.active) return;
    practice.completed = false;
    practice.awaitingLineConfirm = false;
    practice.step = Array.isArray(practice.startPath) ? practice.startPath.length : 0;
    practice.hintMove = "";
    state.openingBookEditor.path = Array.isArray(practice.startPath) ? practice.startPath.slice() : [];
    clearOpeningBookMoveAnimation();
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    rebuildOpeningBookBoard();
    renderOpeningBookEditor();
    scheduleOpeningBookAutoMove(760);
  }

  function handleOpeningBookPracticeSecondaryAction() {
    const practice = state.openingBookPractice;
    if (practice?.choosingStart) {
      stopOpeningBookPractice({ silent: true });
      renderOpeningBookEditor();
      return;
    }
    if (practice?.active && practice.awaitingLineConfirm) {
      replayOpeningBookPracticeLine();
      return;
    }
    stopOpeningBookPractice();
  }

  function playOpeningBookMoveSound(board, move, side) {
    if (!board || !/^[a-i][0-9][a-i][0-9]$/.test(move || "")) return;
    const to = uciToSquare(move.slice(2, 4));
    const nextBoard = board.map((row) => row.slice());
    const captured = nextBoard[to.y]?.[to.x] || "";
    XiangqiCore.applyMoveToBoard(nextBoard, move);
    const nextSide = oppositeSide(side);
    const result = XiangqiCore.determineGameState(nextBoard, nextSide);
    if (result.finished) {
      playMoveSound("checkmate");
      return;
    }
    if (getCheckedSides(nextBoard)[nextSide]) {
      playMoveSound("check");
      return;
    }
    playMoveSound(captured ? "capture" : "move", ROOM_MOVE_ANIMATION_MS);
  }

  function clearOpeningBookMoveAnimation({ preserveKey = false } = {}) {
    if (state.openingBookAnimationTimer) {
      clearTimeout(state.openingBookAnimationTimer);
      state.openingBookAnimationTimer = 0;
    }
    if (state.activeOpeningBookMoveSlotEl) {
      state.activeOpeningBookMoveSlotEl.classList.remove("opening-book-moving-piece");
      state.activeOpeningBookMoveSlotEl.style.transition = "none";
      state.activeOpeningBookMoveSlotEl.style.transform = roomPieceRestTransform();
      state.activeOpeningBookMoveSlotEl.style.opacity = "";
    }
    state.openingBookAnimationRunning = false;
    state.openingBookAnimation = null;
    state.activeOpeningBookMoveSlotEl = null;
    state.openingBookLastPieceFrame = "";
    if (!preserveKey) state.lastAnimatedOpeningBookMoveKey = "";
  }

  function primeOpeningBookMoveAnimation(animation) {
    if (!animation) return;
    if (state.openingBookAnimationTimer) {
      clearTimeout(state.openingBookAnimationTimer);
      state.openingBookAnimationTimer = 0;
    }
    if (state.activeOpeningBookMoveSlotEl) {
      state.activeOpeningBookMoveSlotEl.classList.remove("opening-book-moving-piece");
      state.activeOpeningBookMoveSlotEl.style.transition = "none";
      state.activeOpeningBookMoveSlotEl.style.transform = roomPieceRestTransform();
      state.activeOpeningBookMoveSlotEl.style.opacity = "";
    }
    state.openingBookAnimationRunning = false;
    state.openingBookAnimation = animation;
    state.lastAnimatedOpeningBookMoveKey = animation.moveKey;
    state.openingBookLastPieceFrame = "";
  }

  function finalizeOpeningBookMoveAnimation(animation) {
    if (!state.openingBookAnimation || state.openingBookAnimation.moveKey !== animation.moveKey) return;
    const movedSlotEl = state.activeOpeningBookMoveSlotEl;
    if (state.openingBookAnimationTimer) {
      clearTimeout(state.openingBookAnimationTimer);
      state.openingBookAnimationTimer = 0;
    }
    state.openingBookAnimationRunning = false;
    state.openingBookAnimation = null;
    state.activeOpeningBookMoveSlotEl = null;
    state.openingBookLastPieceFrame = "";
    drawOpeningBookPieces(true);
    drawOpeningBookArrows();
    if (movedSlotEl) {
      movedSlotEl.classList.remove("opening-book-moving-piece");
      movedSlotEl.style.transition = "none";
      movedSlotEl.style.transform = roomPieceRestTransform();
      movedSlotEl.style.opacity = "";
    }
  }

  function startOpeningBookMoveAnimation(animation, { prepared = false } = {}) {
    if (!animation) return;
    if (prepared) {
      if (state.openingBookAnimationTimer) {
        clearTimeout(state.openingBookAnimationTimer);
        state.openingBookAnimationTimer = 0;
      }
      state.openingBookAnimation = animation;
      state.lastAnimatedOpeningBookMoveKey = animation.moveKey;
    } else {
      primeOpeningBookMoveAnimation(animation);
    }

    const { pieceSlots } = ensureOpeningBookSlots();
    const movingSlotEl = pieceSlots[animation.fromIndex];
    if (!movingSlotEl) return;
    setRoomPieceSlotImage(movingSlotEl, animation.piece);
    state.activeOpeningBookMoveSlotEl = movingSlotEl;
    state.openingBookAnimationRunning = false;
    movingSlotEl.classList.add("is-visible", "opening-book-moving-piece");
    movingSlotEl.style.transition = "none";
    movingSlotEl.style.transform = roomPieceRestTransform();
    movingSlotEl.style.opacity = "";
    movingSlotEl.setAttribute("aria-hidden", "false");

    void movingSlotEl.offsetWidth;
    if (!state.openingBookAnimation || state.openingBookAnimation.moveKey !== animation.moveKey) {
      movingSlotEl.classList.remove("opening-book-moving-piece");
      return;
    }
    movingSlotEl.style.transition = `transform ${OPENING_BOOK_MOVE_ANIMATION_MS}ms ${ROOM_MOVE_EASING}`;
    movingSlotEl.style.transform = directionalAnimationTravelTransform(animation, openingBookSquareToPixel, roomPieceRestTransform());
    state.openingBookAnimationRunning = true;
    state.openingBookAnimationTimer = window.setTimeout(() => {
      finalizeOpeningBookMoveAnimation(animation);
    }, OPENING_BOOK_MOVE_ANIMATION_MS + 8);
  }

  function buildOpeningBookMoveAnimation(move, { reverse = false } = {}) {
    const key = [
      "opening",
      state.openingBookEditor.id || "draft",
      state.openingBookEditor.path.join(".") || "root",
      reverse ? "back" : "next",
      move,
      Date.now()
    ].join(":");
    return buildDirectionalMoveAnimation(state.openingBookEditor.board, move, key, { reverse });
  }

  function renderHistory() {
    persistStoredHistory(state.history);
    const options = {
      emptyText: "Chưa có ván nào được lưu.",
      onOpen: openHistoryReview
    };
    renderHistoryCollection(dom.libraryHistoryList, state.history, options);
  }

  function selectedKydaoMaster() {
    return state.kydaoMasters.find((master) => master.path === state.kydaoSelectedMasterPath) || null;
  }

  function renderKydaoLibrary() {
    if (!dom.libraryKydaoPanel) return;
    renderKydaoMasters();
    renderKydaoGames();
    if (dom.kydaoStatus) {
      dom.kydaoStatus.textContent = state.kydaoLoading
        ? "Đang tải danh sách danh thủ..."
        : state.kydaoGamesLoading
        ? "Đang tải danh sách ván..."
        : state.kydaoOpeningPath
        ? "Đang giải mã biên bản..."
        : "";
    }
  }

  function renderKydaoMasters() {
    const container = dom.kydaoMasterList;
    if (!container) return;
    container.innerHTML = "";
    if (state.kydaoLoading && !state.kydaoMasters.length) {
      const loading = document.createElement("div");
      loading.className = "history-empty";
      loading.textContent = "Đang tải danh thủ...";
      container.appendChild(loading);
      return;
    }
    if (!state.kydaoMasters.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "Chưa có dữ liệu. Bấm Làm mới để tải.";
      container.appendChild(empty);
      return;
    }
    state.kydaoMasters.forEach((master) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `kydao-card kydao-master-card ${master.path === state.kydaoSelectedMasterPath ? "active" : ""}`;
      const title = document.createElement("strong");
      title.textContent = master.nickname ? `${master.name} · ${master.nickname}` : master.name;
      const meta = document.createElement("span");
      meta.textContent = `${master.games || 0} ván · ${master.wins || 0} thắng / ${master.draws || 0} hòa / ${master.losses || 0} bại`;
      item.append(title, meta);
      item.addEventListener("click", () => selectKydaoMaster(master));
      container.appendChild(item);
    });
  }

  function renderKydaoGames() {
    const container = dom.kydaoGameList;
    if (!container) return;
    container.innerHTML = "";
    const master = selectedKydaoMaster();
    if (dom.kydaoSelectedTitle) dom.kydaoSelectedTitle.textContent = master ? master.name : "Chọn danh thủ";
    if (dom.kydaoPageInfo) {
      dom.kydaoPageInfo.textContent = master
        ? `Trang ${state.kydaoPage}/${state.kydaoTotalPages}. Mỗi ván mở ra có thể phân tích Pikafish.`
        : "Mở ván nào sẽ chuyển thành bàn cờ xem lại.";
    }
    if (dom.kydaoPrevPageBtn) dom.kydaoPrevPageBtn.disabled = !master || state.kydaoGamesLoading || state.kydaoPage <= 1;
    if (dom.kydaoNextPageBtn) dom.kydaoNextPageBtn.disabled = !master || state.kydaoGamesLoading || state.kydaoPage >= state.kydaoTotalPages;
    if (!master) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "Chọn một danh thủ ở bên trái để xem các ván.";
      container.appendChild(empty);
      return;
    }
    if (state.kydaoGamesLoading && !state.kydaoGames.length) {
      const loading = document.createElement("div");
      loading.className = "history-empty";
      loading.textContent = "Đang tải ván đấu...";
      container.appendChild(loading);
      return;
    }
    if (!state.kydaoGames.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "Chưa tải được ván nào của danh thủ này.";
      container.appendChild(empty);
      return;
    }
    state.kydaoGames.forEach((game) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "kydao-card kydao-game-card";
      item.disabled = state.kydaoOpeningPath === game.path;
      const title = document.createElement("strong");
      title.textContent = `${game.number || ""}. ${game.red || "Đỏ"} ${game.result || ""} ${game.black || "Đen"}`.trim();
      item.append(title);
      item.addEventListener("click", () => openKydaoGame(game));
      container.appendChild(item);
    });
  }

  async function loadKydaoMasters(force = false) {
    if (state.kydaoLoading) return;
    if (!force && state.kydaoMasters.length) {
      const master = selectedKydaoMaster() || state.kydaoMasters[0] || null;
      if (master && !state.kydaoSelectedMasterPath) state.kydaoSelectedMasterPath = master.path;
      if (master && !state.kydaoGames.length) void loadKydaoGames(master, state.kydaoPage || 1);
      renderKydaoLibrary();
      return;
    }
    state.kydaoLoading = true;
    renderKydaoLibrary();
    try {
      const payload = await api("/api/kydao/kings");
      state.kydaoMasters = Array.isArray(payload.masters) ? payload.masters : [];
      if (!state.kydaoMasters.some((master) => master.path === state.kydaoSelectedMasterPath)) {
        state.kydaoSelectedMasterPath = "";
      }
      if (!state.kydaoSelectedMasterPath && state.kydaoMasters[0]) {
        state.kydaoSelectedMasterPath = state.kydaoMasters[0].path;
        await loadKydaoGames(state.kydaoMasters[0], 1);
      }
    } catch (error) {
      showToast(error.message || "Không tải được danh sách danh thủ.");
    } finally {
      state.kydaoLoading = false;
      renderKydaoLibrary();
    }
  }

  function selectKydaoMaster(master) {
    if (!master?.path) return;
    state.kydaoSelectedMasterPath = master.path;
    state.kydaoGames = [];
    state.kydaoPage = 1;
    state.kydaoTotalPages = 1;
    renderKydaoLibrary();
    void loadKydaoGames(master, 1);
  }

  async function loadKydaoGames(master, page = 1) {
    if (!master?.path || state.kydaoGamesLoading) return;
    state.kydaoGamesLoading = true;
    renderKydaoLibrary();
    try {
      const payload = await api(`/api/kydao/king-games?path=${encodeURIComponent(master.path)}&page=${encodeURIComponent(page)}`);
      state.kydaoGames = Array.isArray(payload.games) ? payload.games : [];
      state.kydaoPage = Number(payload.page) || page || 1;
      state.kydaoTotalPages = Math.max(1, Number(payload.totalPages) || state.kydaoPage || 1);
    } catch (error) {
      showToast(error.message || "Không tải được danh sách ván Kydao.");
    } finally {
      state.kydaoGamesLoading = false;
      renderKydaoLibrary();
    }
  }

  async function openKydaoGame(game) {
    if (!game?.path || state.kydaoOpeningPath) return;
    state.kydaoOpeningPath = game.path;
    renderKydaoLibrary();
    try {
      const payload = await api(`/api/kydao/game?path=${encodeURIComponent(game.path)}`);
      const reviewGame = payload.game || null;
      if (!reviewGame?.plies?.length) {
        showToast("Ván Kydao này chưa giải mã đủ biên bản.");
        return;
      }
      openHistoryReview(reviewGame);
      if (Array.isArray(reviewGame.parseErrors) && reviewGame.parseErrors.length) {
        showToast("Ván đã mở, nhưng một vài nước cuối chưa giải mã được.");
      }
    } catch (error) {
      showToast(error.message || "Không mở được ván Kydao.");
    } finally {
      state.kydaoOpeningPath = "";
      renderKydaoLibrary();
    }
  }

  function normalizeAdminUserPayload(user) {
    return {
      ...(user || {}),
      history: normalizeHistoryList(user?.history),
      online: Boolean(user?.online),
      currentActivity: user?.currentActivity || {},
      currentRoomKey: user?.currentRoomKey || "",
      currentRoomRole: user?.currentRoomRole || "",
      openingBooks: normalizeOpeningBookList(user?.openingBooks)
    };
  }

  async function loadAdminUsers(force = false) {
    if (!isAdmin()) return;
    if (state.adminLoading && !force) return;
    state.adminLoading = true;
    renderAdminState();
    try {
      const [payload, licensePayload] = await Promise.all([
        api("/api/admin/users"),
        api(`/api/admin/licenses${state.adminLicenseFilter ? `?status=${encodeURIComponent(state.adminLicenseFilter)}` : ""}`)
      ]);
      state.adminUsers = Array.isArray(payload.users) ? payload.users.map(normalizeAdminUserPayload) : [];
      state.adminLicenses = Array.isArray(licensePayload.licenses) ? licensePayload.licenses : [];
      state.adminRawKeyAvailable = Boolean(licensePayload.rawKeyAvailable);
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

  async function lookupAdminKey(event) {
    event?.preventDefault?.();
    if (!isAdmin()) return;
    const key = String(dom.adminKeyLookupInput?.value || "").trim();
    if (!key) {
      showToast("Nhap Key can quan ly.");
      return;
    }
    try {
      const payload = await api("/api/admin/users/lookup-key", {
        method: "POST",
        body: { key }
      });
      const nextUser = normalizeAdminUserPayload(payload.user);
      state.adminUsers = [
        nextUser,
        ...state.adminUsers.filter((user) => user.id !== nextUser.id)
      ];
      state.adminSelectedUserId = nextUser.id;
      if (dom.adminKeyLookupInput) dom.adminKeyLookupInput.value = "";
      renderAdminState();
      showToast("Da them Key vao quan tri thanh vien.");
    } catch (error) {
      showToast(error.message || "Khong tim thay Key.");
    }
  }

  function startAdminPolling() {
    if (!isAdmin() || state.adminRefreshTimer) return;
    state.adminRefreshTimer = window.setInterval(() => {
      if (state.route === "admin" && isAdmin() && !state.adminLoading) {
        void loadAdminUsers(true);
      }
    }, 5000);
  }

  function stopAdminPolling() {
    if (!state.adminRefreshTimer) return;
    clearInterval(state.adminRefreshTimer);
    state.adminRefreshTimer = 0;
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
    if (dom.adminLicenseFilter && dom.adminLicenseFilter.value !== state.adminLicenseFilter) {
      dom.adminLicenseFilter.value = state.adminLicenseFilter;
    }
    dom.adminRefreshBtn.textContent = state.adminLoading ? "Đang tải..." : "Làm mới";
    const rawKeyNote = state.adminRawKeyAvailable ? "Đang hiển thị key gốc." : "Chưa nhập file key gốc, key đang được che bớt.";
    dom.adminUsersMeta.textContent = state.adminUsers.length
      ? `${state.adminUsers.length} tài khoản đã đăng ký. ${rawKeyNote}`
      : state.adminLoading
        ? "Đang tải danh sách tài khoản đã đăng ký."
        : `Chưa có tài khoản nào. ${rawKeyNote}`;

    dom.adminUsersList.innerHTML = "";
    if (false && state.adminLicenses.length) {
      state.adminLicenses.forEach((license) => {
        const item = document.createElement("div");
        item.className = `admin-user-card license-card ${license.status}`;
        const meta = document.createElement("div");
        meta.className = "admin-user-meta";
        const title = document.createElement("strong");
        title.textContent = `${license.key || license.keyId} - ${license.status === "activated" ? "Đã kích hoạt" : license.status === "expired" ? "Đã hết hạn" : "Chưa sử dụng"}`;
        const name = document.createElement("small");
        name.textContent = license.customerName || "-";
        const dates = document.createElement("span");
        dates.textContent = license.activatedAt
          ? `Kích hoạt: ${formatDateTime(license.activatedAt)} - Còn lại: ${license.remaining?.label || "-"}`
          : "Chưa kích hoạt";
        const rawState = document.createElement("span");
        rawState.textContent = license.hasRawKey ? "Key gốc" : `Key đã che: ${license.maskedKey || license.key || ""}`;
        meta.append(title, name, dates, rawState);
        item.append(meta);
        dom.adminUsersList.appendChild(item);
      });
    }
    if (!state.adminUsers.length) {
      const emptyUsers = document.createElement("div");
      emptyUsers.className = "history-empty";
      emptyUsers.textContent = state.adminLoading ? "Đang tải..." : "Chưa có tài khoản nào.";
      dom.adminUsersList.appendChild(emptyUsers);
    } else {
      state.adminUsers.forEach((user) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `admin-user-card ${state.adminSelectedUserId === user.id ? "active" : ""} ${user.online ? "online" : "offline"}`;
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
        const keyDetail = document.createElement("span");
        keyDetail.textContent = user.accessKey
          ? `${user.accessKey} - ${user.activated ? "Đã kích hoạt" : "Chưa kích hoạt"}`
          : "";
        const sessionDetail = document.createElement("span");
        sessionDetail.textContent = `${user.rememberedDeviceCount || 0} thiet bi da ghi nho`;
        const presence = document.createElement("span");
        presence.className = `admin-presence ${user.online ? "online" : "offline"}`;
        presence.textContent = user.online ? "Online" : "Offline";
        meta.append(name, username, detail, keyDetail, sessionDetail, presence);
        button.append(avatar, meta);
        dom.adminUsersList.appendChild(button);
      });
    }

    const selected = state.adminUsers.find((user) => user.id === state.adminSelectedUserId) || null;
    dom.adminSelectedTitle.textContent = selected
      ? `Lịch sử của ${selected.displayName || selected.username}`
      : "Lịch sử thành viên";
    dom.adminSelectedMeta.textContent = selected
      ? `${selected.email || `@${selected.username}`} • ${selected.accessKey || "No key"} • ${selected.activated ? "Đã kích hoạt" : "Chưa kích hoạt"}`
      : "Chọn một tài khoản để xem các ván đã lưu.";
    renderHistoryCollection(dom.adminHistoryList, selected?.history || [], {
      emptyText: selected ? "Tài khoản này chưa có ván nào được lưu." : "Chọn một tài khoản để xem lịch sử đấu.",
      onOpen: openHistoryReview
    });
    renderAdminOpeningBookPanel(selected);
    renderAdminRenamePanel(selected);
    renderAdminAvatarPanel(selected);
    renderAdminWatchPanel(selected);
  }

  function renderAdminOpeningBookPanel(user) {
    if (!dom.adminHistoryList || !user) return;
    const panel = document.createElement("div");
    panel.className = "admin-opening-book-card";
    const title = document.createElement("strong");
    title.textContent = "Thư viện khai cuộc";
    panel.appendChild(title);
    const books = normalizeOpeningBookList(user.openingBooks);
    if (!books.length) {
      const empty = document.createElement("span");
      empty.textContent = "Tài khoản này chưa lưu book khai cuộc nào.";
      panel.appendChild(empty);
    } else {
      books.slice(0, 12).forEach((book) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "opening-book-branch-row";
        row.textContent = `${book.name} - ${normalizeOpeningBookSide(book.bookSide || book.side) === "b" ? "đi hậu" : "đi tiên"} - ${Math.max(0, countOpeningBookNodes(book.tree) - 1)} nước`;
        row.addEventListener("click", () => {
          state.openingBookEditor = createOpeningBookEditorState(book);
          clearOpeningBookMoveAnimation();
          invalidateOpeningBookLayout();
          state.openingBookSelectedSquare = null;
          state.openingBookHints = [];
          goRoute("library");
          setLibraryTab("book-create");
        });
        panel.appendChild(row);
      });
    }
    dom.adminHistoryList.prepend(panel);
  }

  function renderAdminRenamePanel(user) {
    if (!dom.adminHistoryList || !user) return;
    const panel = document.createElement("form");
    panel.className = "admin-rename-card";
    panel.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = panel.querySelector("input");
      void renameAdminUser(user.id, input?.value || "");
    });

    const title = document.createElement("strong");
    title.textContent = "Đổi tên tài khoản";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 24;
    input.value = user.displayName || user.username || "";
    input.placeholder = "Tên hiển thị";
    const button = document.createElement("button");
    button.className = "primary-button";
    button.type = "submit";
    button.textContent = "Lưu tên";

    panel.append(title, input, button);
    dom.adminHistoryList.prepend(panel);
  }

  async function renameAdminUser(userId, displayName) {
    const name = String(displayName || "").trim();
    if (!name) {
      showToast("Tên không được để trống.");
      return;
    }
    try {
      const payload = await api("/api/admin/users/rename", {
        method: "POST",
        body: { userId, displayName: name }
      });
      const nextUser = normalizeAdminUserPayload(payload.user);
      state.adminUsers = state.adminUsers.map((user) => (
        user.id === nextUser.id ? nextUser : user
      ));
      state.adminSelectedUserId = nextUser.id;
      renderAdminState();
      showToast("Đã lưu tên tài khoản.");
    } catch (error) {
      showToast(error.message || "Không thể đổi tên tài khoản.");
    }
  }

  function renderAdminAvatarPanel(user) {
    if (!dom.adminHistoryList || !user) return;
    const panel = document.createElement("div");
    panel.className = "admin-avatar-card";

    const title = document.createElement("strong");
    title.textContent = "Doi anh dai dien";

    const grid = document.createElement("div");
    grid.className = "admin-avatar-grid";
    const activeUrl = user.avatarUrl || "";
    DEVICE_AVATARS.forEach((url) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `avatar-choice${url === activeUrl ? " active" : ""}`;
      button.setAttribute("aria-label", "Doi anh dai dien thanh vien");
      const image = document.createElement("img");
      image.src = url;
      image.alt = "";
      image.decoding = "async";
      image.draggable = false;
      button.addEventListener("click", () => {
        void setAdminUserAvatar(user.id, url);
      });
      button.appendChild(image);
      grid.appendChild(button);
    });

    panel.append(title, grid);
    dom.adminHistoryList.prepend(panel);
  }

  async function setAdminUserAvatar(userId, avatarUrl) {
    if (!isAdmin() || !DEVICE_AVATARS.includes(avatarUrl)) return;
    try {
      const payload = await api("/api/admin/users/avatar", {
        method: "POST",
        body: { userId, avatarUrl }
      });
      const nextUser = normalizeAdminUserPayload(payload.user);
      state.adminUsers = state.adminUsers.map((user) => (
        user.id === nextUser.id ? nextUser : user
      ));
      state.adminSelectedUserId = nextUser.id;
      renderAdminState();
      showToast("Da luu anh dai dien tai khoan.");
    } catch (error) {
      showToast(error.message || "Khong the doi anh dai dien tai khoan.");
    }
  }

  function renderAdminWatchPanel(user) {
    if (!dom.adminHistoryList || !user) return;
    const panel = document.createElement("div");
    panel.className = `admin-watch-card ${user.online ? "online" : "offline"}`;
    const route = routeLabel(user.currentActivity?.route || "");
    const action = user.currentActivity?.action || "Chưa có hoạt động mới";
    const seen = user.lastSeenAt ? formatDate(user.lastSeenAt) : "Chưa rõ";
    const roomKey = user.currentRoomKey || user.currentActivity?.roomKey || "";

    const status = document.createElement("strong");
    status.textContent = `${user.online ? "Đang online" : "Offline"}${route ? ` • ${route}` : ""}`;
    const detail = document.createElement("span");
    detail.textContent = `${action} • Lần cuối: ${seen}`;
    panel.append(status, detail);

    if (roomKey) {
      const room = document.createElement("span");
      room.textContent = `Phòng hiện tại: ${roomKey}`;
      const watch = document.createElement("button");
      watch.type = "button";
      watch.className = "primary-button";
      watch.textContent = "Xem phòng";
      watch.addEventListener("click", () => watchAdminRoom(user));
      panel.append(room, watch);
    }

    dom.adminHistoryList.prepend(panel);
  }

  function routeLabel(route) {
    return {
      home: "Sảnh chính",
      match: "Phòng đấu",
      library: "Thư viện cá nhân",
      admin: "Quản trị",
      room: "Đang trong phòng",
      review: "Xem lại ván",
      analysis: "Phần mềm phân tích"
    }[route] || "";
  }

  async function watchAdminRoom(user) {
    if (!user) return;
    try {
      const payload = await api("/api/admin/watch-room", {
        method: "POST",
        body: { userId: user.id, roomKey: user.currentRoomKey || user.currentActivity?.roomKey || "" }
      });
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
      goRoute("room");
      showToast("Đã vào phòng với vai trò người xem.");
    } catch (error) {
      showToast(error.message || "Không thể xem phòng hiện tại.");
    }
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
    clearReviewMoveAnimation();
    state.reviewGame = reviewEntry;
    state.reviewCursor = 0;
    state.reviewAnalysis = [];
    state.reviewAnalyzing = false;
    state.reviewLastBoardFrame = "";
    state.reviewLastPieceFrame = "";
    state.reviewPieceSlots = null;
    state.reviewSlotLayoutKey = "";
    clearReviewCheckmateEffectKey();
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

  function buildReviewCursorAnimation(previousCursor, nextCursor, sourceBoard) {
    if (!state.reviewGame) return null;
    if (Math.abs(nextCursor - previousCursor) !== 1) return null;
    const movingForward = nextCursor > previousCursor;
    const plyIndex = movingForward ? previousCursor : nextCursor;
    const ply = state.reviewGame.plies[plyIndex];
    if (!ply?.move) return null;
    return buildDirectionalMoveAnimation(
      sourceBoard,
      ply.move,
      `review:${plyIndex + 1}:${movingForward ? "f" : "b"}:${ply.move}`,
      { reverse: !movingForward }
    );
  }

  function hideReviewMoveAnimationElements() {
    if (state.activeReviewMoveSlotEl) {
      state.activeReviewMoveSlotEl.style.transition = "none";
      state.activeReviewMoveSlotEl.style.transform = "translate(-50%, -50%)";
    }
    if (!dom.reviewMotionPiece) return;
    dom.reviewMotionPiece.style.transition = "none";
    dom.reviewMotionPiece.classList.remove("is-visible");
    dom.reviewMotionPiece.style.left = "0px";
    dom.reviewMotionPiece.style.top = "0px";
    dom.reviewMotionPiece.style.transform = "translate(-50%, -50%) translate3d(0, 0, 0)";
    dom.reviewMotionPiece.setAttribute("aria-hidden", "true");
  }

  function primeReviewMoveAnimation(animation) {
    if (!animation) return;
    if (state.reviewAnimationTimer) {
      clearTimeout(state.reviewAnimationTimer);
      state.reviewAnimationTimer = 0;
    }
    hideReviewMoveAnimationElements();
    state.reviewAnimation = animation;
    state.lastAnimatedReviewMoveKey = animation.moveKey;
    state.reviewLastPieceFrame = "";
  }

  function clearReviewMoveAnimation({ preserveKey = false } = {}) {
    if (state.reviewAnimationTimer) {
      clearTimeout(state.reviewAnimationTimer);
      state.reviewAnimationTimer = 0;
    }
    hideReviewMoveAnimationElements();
    state.reviewAnimation = null;
    state.activeReviewMoveSlotEl = null;
    if (!preserveKey) state.lastAnimatedReviewMoveKey = "";
  }

  function finalizeReviewMoveAnimation(animation) {
    if (!state.reviewAnimation || state.reviewAnimation.moveKey !== animation.moveKey) return;
    if (state.reviewAnimationTimer) {
      clearTimeout(state.reviewAnimationTimer);
      state.reviewAnimationTimer = 0;
    }
    hideReviewMoveAnimationElements();
    state.reviewAnimation = null;
    state.activeReviewMoveSlotEl = null;
    state.reviewLastPieceFrame = "";
    drawReviewPieces(true);
    drawReviewArrow();
    playReviewPostMoveStatusSound();
  }

  function startReviewMoveAnimation(animation, { prepared = false } = {}) {
    if (!animation) return;
    if (prepared) {
      if (state.reviewAnimationTimer) {
        clearTimeout(state.reviewAnimationTimer);
        state.reviewAnimationTimer = 0;
      }
      state.reviewAnimation = animation;
      state.lastAnimatedReviewMoveKey = animation.moveKey;
    } else {
      primeReviewMoveAnimation(animation);
    }

    const slots = ensureReviewSlots();
    const movingSlotEl = slots[animation.fromIndex];
    if (!movingSlotEl) return;
    state.activeReviewMoveSlotEl = movingSlotEl;
    movingSlotEl.style.transition = "none";
    movingSlotEl.style.transform = "translate(-50%, -50%)";

    void movingSlotEl.offsetWidth;
    if (!state.reviewAnimation || state.reviewAnimation.moveKey !== animation.moveKey) return;
    if (!animation.suppressMoveSound) {
      playMoveSound(animation.soundKind || (animation.capturedPiece ? "capture" : "move"), ROOM_MOVE_ANIMATION_MS);
    }
    movingSlotEl.style.transition = `transform ${ROOM_MOVE_ANIMATION_MS}ms ${ROOM_MOVE_EASING}`;
    movingSlotEl.style.transform = directionalAnimationTravelTransform(animation, reviewSquareToPixel);

    state.reviewAnimationTimer = window.setTimeout(() => {
      finalizeReviewMoveAnimation(animation);
    }, ROOM_MOVE_ANIMATION_MS + 8);
  }

  function setReviewCursor(cursor) {
    if (!state.reviewGame) return;
    const clamped = Math.max(0, Math.min(state.reviewGame.plies.length, cursor));
    if (clamped === state.reviewCursor && state.route === "review") return;
    const previousCursor = state.reviewCursor;
    const previousBoard = state.reviewBoard.map((row) => row.slice());
    const animation = buildReviewCursorAnimation(previousCursor, clamped, previousBoard);
    state.reviewCursor = clamped;
    rebuildReviewBoard();
    if (animation) {
      animation.suppressMoveSound = shouldUseStatusOnlySound(state.reviewBoard, state.reviewSideToMove);
    }
    if (animation) {
      primeReviewMoveAnimation(animation);
    } else {
      clearReviewMoveAnimation();
    }
    renderReviewState(true);
    if (animation) startReviewMoveAnimation(animation, { prepared: true });
    else playReviewPostMoveStatusSound();
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
    drawReviewScene(forceBoard, Boolean(state.reviewAnimation));
  }

  function renderReviewMeta() {
    const game = state.reviewGame;
    if (!game) {
      dom.reviewTitle.textContent = "Xem lại ván đấu";
      dom.reviewMeta.textContent = "Chọn một ván trong lịch sử để tua lại.";
      dom.reviewResultBadge.textContent = "Lịch sử";
      dom.reviewMoveMeta.textContent = "Mỗi nước sẽ được gắn nhãn sau khi Pikafish quét toàn ván.";
      dom.reviewInsight.textContent = "Tua lại từng nước để xem diễn biến của ván cờ.";
      renderReviewEvalBar(null);
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
      renderReviewEvalBar(null);
      dom.reviewInsight.innerHTML = "";
      return;
    }

    const currentPly = game.plies[currentIndex];
    const analysis = state.reviewAnalysis[currentIndex] || null;
    const moveTitle = currentPly?.notation || currentPly?.move || `Nước ${currentIndex + 1}`;
    if (!analysis) {
      renderReviewEvalBar(null);
      dom.reviewInsight.innerHTML = `<strong>Nước ${currentIndex + 1}: ${moveTitle}</strong><div>Ván đang ở sau nước này. Bấm Phân tích để xem chất lượng và nước đề xuất.</div>`;
      return;
    }

    renderReviewEvalBar(analysis);
    const recommendText = analysis.grade === "book"
      ? "Nước này nằm trong book mở đầu: trùng gợi ý Pikafish hoặc nhóm nước đầu của data book."
      : analysis.grade === "brilliant"
      ? "Nước đi này gần như trùng khớp với phương án mạnh nhất của Pikafish."
      : `Pikafish đề xuất: ${analysis.bestNotation || analysis.bestMove || "không rõ"}.`;
    const badge = reviewBadgeForGrade(analysis.grade);
    dom.reviewInsight.innerHTML = `<strong>Nước ${currentIndex + 1}: ${moveTitle} - ${analysis.gradeLabel || badge.label || "Đã phân tích"}</strong><div>${recommendText}</div>`;
  }

  function renderReviewEvalBar(analysis) {
    if (!dom.reviewEvalBar || !dom.reviewEvalRed || !dom.reviewEvalBlack) return;
    if (!analysis || !Number.isFinite(Number(analysis.redScore))) {
      dom.reviewEvalRed.style.height = "50%";
      dom.reviewEvalBlack.style.height = "50%";
      return;
    }
    const score = Number(analysis.redScore);
    const redShare = reviewRedShare(score);
    dom.reviewEvalRed.style.height = `${redShare}%`;
    dom.reviewEvalBlack.style.height = `${100 - redShare}%`;
  }

  function reviewRedShare(score) {
    if (Math.abs(score) >= 31999) return score > 0 ? 100 : 0;
    const clamped = Math.max(-REVIEW_EVAL_BAR_LIMIT, Math.min(REVIEW_EVAL_BAR_LIMIT, score));
    return Math.max(0, Math.min(100, Math.round(50 + (clamped / REVIEW_EVAL_BAR_LIMIT) * 50)));
  }

  function formatReviewEval(score) {
    if (Math.abs(score) >= 31999) return score > 0 ? "+31999" : "-31999";
    const value = Math.round(score);
    return value > 0 ? `+${value}` : String(value);
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
    setMessage(dom.matchHubMessage, "Dang tao phong...", "info");
    try {
      const payload = await api("/api/rooms/create", {
        method: "POST",
        body: {
          yourMinutes: Number(dom.yourTimeRange.value || 10),
          opponentMinutes: Number(dom.opponentTimeRange.value || 10),
          incrementSeconds: Number(dom.incrementSelect.value || 0),
          side: state.createSide
        }
      });
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
      goRoute("room");
      setMessage(dom.matchHubMessage, "");
      showToast("Da tao phong dau.");
    } catch (error) {
      setMessage(dom.matchHubMessage, error.message || "Khong the tao phong.");
    }
  }

  async function onCreateBotRoom(event) {
    event.preventDefault();
    setMessage(dom.matchHubMessage, "Dang tao ban danh may...", "info");
    try {
      const payload = await api("/api/rooms/create-bot", {
        method: "POST",
        body: {
          minutes: Number(dom.botTimeRange.value || 10),
          incrementSeconds: Number(dom.botIncrementSelect.value || 0),
          botLevel: Number(dom.botLevelSelect.value || 1),
          side: state.botSide
        }
      });
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
      goRoute("room");
      setMessage(dom.matchHubMessage, "");
      showToast("Da tao ban danh voi may.");
    } catch (error) {
      setMessage(dom.matchHubMessage, error.message || "Khong the tao ban danh may.");
    }
  }

  async function onJoinRoom(event) {
    event.preventDefault();
    const rawKey = dom.joinRoomKey.value.trim();
    const key = rawKey.toUpperCase();
    setMessage(dom.matchHubMessage, "Dang vao phong...", "info");
    try {
      const payload = await api("/api/rooms/join", {
        method: "POST",
        body: { key }
      });
      dom.joinRoomKey.value = "";
      applyRoomState(payload.room, { forceBoard: true, keepSelection: false });
      goRoute("room");
      setMessage(dom.matchHubMessage, "");
      showToast(payload.room.role === "spectator" ? "Da vao phong voi vai tro nguoi xem." : "Da vao phong dau.");
    } catch (error) {
      setMessage(dom.matchHubMessage, error.message || "Khong the vao phong.");
    }
  }
  function isAdminShortcutName(displayName) {
    const normalized = normalizeDisplayNameInput(displayName).toLowerCase();
    return normalized === "ad";
  }

  async function tryAdminShortcutLogin(displayName, key) {
    setMessage(dom.matchHubMessage, "Đang kiểm tra quyền quản trị...", "info");
    try {
      const payload = await api("/api/admin/quick-login", {
        method: "POST",
        body: { displayName, key }
      });
      applySession(payload.user, payload.token);
      dom.joinDisplayName.value = "";
      dom.joinRoomKey.value = "";
      state.room = null;
      state.roomKey = "";
      localStorage.removeItem(STORAGE_ROOM);
      setMessage(dom.matchHubMessage, "");
      await loadAdminUsers(true);
      goRoute("admin");
      showToast("Đã mở trang quản trị.");
      return true;
    } catch (error) {
      setMessage(dom.matchHubMessage, error.message || "Không thể mở quyền quản trị.");
      return true;
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
    const incomingAnimation = deriveRoomAnimation(previous, room);

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
      state.lastAnimatedRoomMoveKey = "";
      state.roomCheckSoundKey = "";
      clearRoomMoveAnimation();
      clearRoomCheckmateEffectKey();
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

    if (incomingAnimation) primeRoomMoveAnimation(incomingAnimation);

    updateResumeButton();
    renderRoomState({ forceBoard, keepSelection });
    if (incomingAnimation) {
      if (room.result?.reason !== "checkmate") clearRoomCheckmateEffectKey();
    } else if (state.roomAnimation) {
      if (room.result?.reason !== "checkmate") clearRoomCheckmateEffectKey();
    } else {
      playRoomPostMoveStatusSound();
    }
    if (incomingAnimation) startRoomMoveAnimation(incomingAnimation, { prepared: true });
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
    [dom.bottomPlayerAvatar, dom.bottomClock].forEach((element) => {
      if (element) element.classList.remove("turn-flash");
    });
  }

  function triggerTurnFlash() {
    clearTurnFlash();
    const targets = [dom.bottomPlayerAvatar, dom.bottomClock].filter(Boolean);
    if (!targets.length) return;
    targets.forEach((element) => element.classList.add("turn-flash"));
    state.roomTurnFlashTimer = window.setTimeout(() => {
      clearTurnFlash();
    }, 2050);
  }

  function deriveRoomAnimation(previousRoom, nextRoom) {
    if (!previousRoom || !nextRoom) return null;
    if (previousRoom.key !== nextRoom.key) return null;
    const previousMoves = Array.isArray(previousRoom.moves) ? previousRoom.moves : [];
    const nextMoves = Array.isArray(nextRoom.moves) ? nextRoom.moves : [];
    if (nextMoves.length <= previousMoves.length) return null;
    const latestMove = nextMoves[nextMoves.length - 1];
    const move = String(latestMove?.move || "");
    if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return null;
    const moveKey = `${nextRoom.key}:${nextMoves.length}:${move}`;
    if (state.lastAnimatedRoomMoveKey === moveKey) return null;
    const previousBoard = XiangqiCore.parseFenState(previousRoom.boardFen || START_FEN).board;
    const animation = buildDirectionalMoveAnimation(previousBoard, move, moveKey);
    if (animation) {
      animation.soundKind = animation.capturedPiece ? "capture" : "move";
      const nextBoard = XiangqiCore.parseFenState(nextRoom.boardFen || START_FEN).board;
      animation.suppressMoveSound = shouldUseStatusOnlySound(nextBoard, nextRoom.sideToMove, nextRoom.result);
    }
    return animation;
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

  function directionalAnimationTravelTransform(animation, pixelForSquare, restTransform = "translate(-50%, -50%)") {
    if (!animation) return restTransform;
    const fromPixel = pixelForSquare(animation.from);
    const toPixel = pixelForSquare(animation.to);
    const deltaX = toPixel.x - fromPixel.x;
    const deltaY = toPixel.y - fromPixel.y;
    return `${restTransform} translate3d(${deltaX}px, ${deltaY}px, 0)`;
  }

  function roomPieceRestTransform() {
    return "translate(-50%, -50%)";
  }

  function clearRoomMoveAnimation({ preserveKey = false } = {}) {
    if (state.roomAnimationTimer) {
      clearTimeout(state.roomAnimationTimer);
      state.roomAnimationTimer = 0;
    }
    state.roomAnimationRunning = false;
    hideRoomMoveAnimationElements();
    state.roomAnimation = null;
    state.activeRoomMoveSlotEl = null;
    if (!preserveKey) state.lastAnimatedRoomMoveKey = "";
  }

  function hideRoomMoveAnimationElements() {
    hideRoomAnimationElements();
  }

  function hideRoomAnimationElements({
    resetActiveSlot = true,
    resetMovingPiece = true,
    resetCapturePiece = true
  } = {}) {
    if (resetActiveSlot && state.activeRoomMoveSlotEl) {
      state.activeRoomMoveSlotEl.classList.remove("room-moving-piece");
      state.activeRoomMoveSlotEl.style.transition = "none";
      state.activeRoomMoveSlotEl.style.transform = roomPieceRestTransform();
      state.activeRoomMoveSlotEl.style.opacity = "";
    }
    if (resetMovingPiece && dom.roomMotionPiece) {
      dom.roomMotionPiece.style.transition = "none";
      dom.roomMotionPiece.classList.remove("is-visible");
      dom.roomMotionPiece.style.left = "0px";
      dom.roomMotionPiece.style.top = "0px";
      dom.roomMotionPiece.style.transform = `${roomPieceRestTransform()} translate3d(0, 0, 0)`;
      dom.roomMotionPiece.setAttribute("aria-hidden", "true");
    }
    if (resetCapturePiece && dom.roomCapturePiece) {
      dom.roomCapturePiece.style.transition = "none";
      dom.roomCapturePiece.classList.remove("is-visible", "fading");
      dom.roomCapturePiece.style.left = "0px";
      dom.roomCapturePiece.style.top = "0px";
      dom.roomCapturePiece.style.transform = `${roomPieceRestTransform()} translate3d(0, 0, 0)`;
      dom.roomCapturePiece.setAttribute("aria-hidden", "true");
    }
  }

  function primeRoomMoveAnimation(animation) {
    if (!animation) return;
    if (state.roomAnimationTimer) {
      clearTimeout(state.roomAnimationTimer);
      state.roomAnimationTimer = 0;
    }
    state.roomAnimationRunning = false;
    hideRoomMoveAnimationElements();
    state.roomAnimation = animation;
    state.lastAnimatedRoomMoveKey = animation.moveKey;
    state.lastPieceFrame = "";
  }

  function useRoomMobileHandoff() {
    return false;
  }

  function roomPieceImageFor(piece) {
    const selectedSet = currentPieceSkin();
    if (selectedSet !== "default") {
      return CUSTOM_PIECE_IMAGES_BY_SET[selectedSet]?.[piece] || PIECE_IMAGES[piece] || "";
    }
    return PIECE_IMAGES[piece] || "";
  }

  function paintRoomMotionPiece(element, piece) {
    if (!element || !piece) return;
    element.dataset.piece = piece;
    const image = element.querySelector(".piece-skin");
    if (image) {
      const source = roomPieceImageFor(piece);
      if (source && image.getAttribute("src") !== source) image.src = source;
      image.alt = piece;
    }
  }

  function setRoomPieceSlotImage(el, piece) {
    if (!el || !piece) return;
    el.dataset.piece = piece;
    const image = el.querySelector(".piece-skin");
    if (image) {
      const source = roomPieceImageFor(piece);
      if (source && image.getAttribute("src") !== source) image.src = source;
      image.alt = piece;
    }
    el.setAttribute("aria-label", piece);
  }

  function prepareRoomMoveDestinationHandoff(animation) {
    if (!animation) return;
    const { pieceSlots } = ensureRoomSlots();
    const targetSlotEl = pieceSlots[animation.toIndex];
    if (!targetSlotEl) return;
    const board = state.roomBoard;
    const checkedSides = getCheckedSides(board);
    setRoomPieceSlotImage(targetSlotEl, animation.piece);
    targetSlotEl.classList.add("is-visible");
    targetSlotEl.classList.remove("selected");
    targetSlotEl.classList.toggle("in-check", animation.piece.toLowerCase() === "k" && checkedSides[XiangqiCore.pieceColor(animation.piece)]);
    targetSlotEl.style.transition = "none";
    targetSlotEl.style.transform = roomPieceRestTransform();
    targetSlotEl.setAttribute("aria-hidden", "false");
  }

  function primeRoomMoveDestinationImage(animation) {
    if (!animation) return;
    const { pieceSlots } = ensureRoomSlots();
    const targetSlotEl = pieceSlots[animation.toIndex];
    if (!targetSlotEl) return;
    setRoomPieceSlotImage(targetSlotEl, animation.piece);
  }

  function showRoomMoveLandingShield(animation) {
    if (!animation || !dom.roomMotionPiece) return;
    const toPos = squareToPixel(animation.to);
    paintRoomMotionPiece(dom.roomMotionPiece, animation.piece);
    dom.roomMotionPiece.style.transition = "none";
    dom.roomMotionPiece.style.left = `${toPos.x}px`;
    dom.roomMotionPiece.style.top = `${toPos.y}px`;
    dom.roomMotionPiece.style.transform = `${roomPieceRestTransform()} translate3d(0, 0, 0)`;
    dom.roomMotionPiece.classList.add("is-visible");
    dom.roomMotionPiece.setAttribute("aria-hidden", "false");
  }

  function hideRoomMoveLandingShieldSoon() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        hideRoomAnimationElements({ resetActiveSlot: false });
      });
    });
  }

  function disableLegacyNameInputs() {
    const matchHelp = document.querySelector("#matchHubView .panel-heading p");
    if (matchHelp) matchHelp.textContent = "Tài khoản đã kích hoạt bằng Key sẽ được dùng khi tạo phòng, vào phòng hoặc xem ván đấu.";
    [dom.joinDisplayName, dom.createDisplayName, dom.botDisplayName].forEach((input) => {
      if (!input) return;
      input.required = false;
      input.value = "";
      input.tabIndex = -1;
      input.setAttribute("aria-hidden", "true");
      const label = input.closest("label");
      if (label) label.style.display = "none";
    });
  }

  function finalizeRoomMoveAnimation(animation) {
    if (!state.roomAnimation || state.roomAnimation.moveKey !== animation.moveKey) return;
    const movedSlotEl = state.activeRoomMoveSlotEl;
    const useMobileHandoff = useRoomMobileHandoff();
    if (state.roomAnimationTimer) {
      clearTimeout(state.roomAnimationTimer);
      state.roomAnimationTimer = 0;
    }
    state.roomAnimationRunning = false;
    if (useMobileHandoff) {
      showRoomMoveLandingShield(animation);
      prepareRoomMoveDestinationHandoff(animation);
    }
    hideRoomAnimationElements({ resetActiveSlot: false, resetMovingPiece: !useMobileHandoff });
    state.roomAnimation = null;
    state.activeRoomMoveSlotEl = null;
    state.lastPieceFrame = "";
    const finish = () => {
      drawRoomPieces();
      if (movedSlotEl) {
        movedSlotEl.classList.remove("room-moving-piece");
        movedSlotEl.style.transition = "none";
        movedSlotEl.style.transform = roomPieceRestTransform();
        movedSlotEl.style.opacity = "";
      }
      if (useMobileHandoff) hideRoomMoveLandingShieldSoon();
      else hideRoomAnimationElements({ resetActiveSlot: false });
      playRoomPostMoveStatusSound();
    };
    if (useMobileHandoff) window.requestAnimationFrame(finish);
    else finish();
  }

  function settleRoomAnimationNow() {
    if (!state.roomAnimation) return;
    if (state.roomAnimationTimer) {
      clearTimeout(state.roomAnimationTimer);
      state.roomAnimationTimer = 0;
    }
    state.roomAnimationRunning = false;
    hideRoomMoveAnimationElements();
    state.roomAnimation = null;
    state.activeRoomMoveSlotEl = null;
    state.lastPieceFrame = "";
    drawRoomPieces();
  }

  function startRoomMoveAnimation(animation, { prepared = false } = {}) {
    if (!animation) return;
    if (prepared) {
      if (state.roomAnimationTimer) {
        clearTimeout(state.roomAnimationTimer);
        state.roomAnimationTimer = 0;
      }
      state.roomAnimation = animation;
      state.lastAnimatedRoomMoveKey = animation.moveKey;
    } else {
      primeRoomMoveAnimation(animation);
    }

    const { pieceSlots } = ensureRoomSlots();
    const movingSlotEl = pieceSlots[animation.fromIndex];
    if (!movingSlotEl) return;
    primeRoomMoveDestinationImage(animation);
    state.activeRoomMoveSlotEl = movingSlotEl;
    state.roomAnimationRunning = false;
    movingSlotEl.classList.add("room-moving-piece");
    movingSlotEl.style.transition = "none";
    movingSlotEl.style.transform = roomPieceRestTransform();
    movingSlotEl.style.opacity = "";

    if (useRoomMobileHandoff() && dom.roomMotionPiece) {
      paintRoomMotionPiece(dom.roomMotionPiece, animation.piece);
    }

    void movingSlotEl.offsetWidth;
    if (!state.roomAnimation || state.roomAnimation.moveKey !== animation.moveKey) {
      movingSlotEl.classList.remove("room-moving-piece");
      movingSlotEl.style.opacity = "";
      hideRoomAnimationElements({ resetActiveSlot: false });
      return;
    }
    if (!animation.suppressMoveSound) {
      playMoveSound(animation.soundKind || (animation.capturedPiece ? "capture" : "move"), ROOM_MOVE_ANIMATION_MS);
    }
    movingSlotEl.style.transition = `transform ${ROOM_MOVE_ANIMATION_MS}ms ${ROOM_MOVE_EASING}`;
    movingSlotEl.style.transform = directionalAnimationTravelTransform(animation, squareToPixel, roomPieceRestTransform());
    state.roomAnimationRunning = true;

    state.roomAnimationTimer = window.setTimeout(() => {
      finalizeRoomMoveAnimation(animation);
    }, ROOM_MOVE_ANIMATION_MS + 8);
  }

  function hideBoardBurst(el, timerKey) {
    if (state[timerKey]) {
      clearTimeout(state[timerKey]);
      state[timerKey] = 0;
    }
    if (!el) return;
    el.classList.remove("show");
    el.setAttribute("aria-hidden", "true");
  }

  function showBoardBurst(el, timerKey) {
    if (!el) return;
    if (state[timerKey]) {
      clearTimeout(state[timerKey]);
      state[timerKey] = 0;
    }
    el.classList.remove("show");
    void el.offsetWidth;
    el.setAttribute("aria-hidden", "false");
    el.classList.add("show");
    const effectMs = playMoveSound("checkmate") || CHECKMATE_EFFECT_MS;
    state[timerKey] = window.setTimeout(() => {
      el.classList.remove("show");
      el.setAttribute("aria-hidden", "true");
      state[timerKey] = 0;
    }, effectMs + 50);
  }

  function playRoomPostMoveStatusSound() {
    if (state.room?.result?.reason === "checkmate") {
      maybeShowRoomCheckmateEffect();
      return;
    }
    clearRoomCheckmateEffectKey();
    const side = state.room?.sideToMove;
    if (side && state.roomBoard && getCheckedSides(state.roomBoard)[side]) {
      const key = `${state.room?.key || ""}:${state.room?.moves?.length || 0}:${state.room?.boardFen || ""}:${side}`;
      if (state.roomCheckSoundKey !== key) {
        state.roomCheckSoundKey = key;
        playMoveSound("check");
      }
    } else {
      state.roomCheckSoundKey = "";
    }
  }

  function playReviewPostMoveStatusSound() {
    const result = XiangqiCore.determineGameState(state.reviewBoard, state.reviewSideToMove || "w");
    if (result.finished && result.reason === "checkmate") {
      maybeShowReviewCheckmateEffect();
      return;
    }
    clearReviewCheckmateEffectKey();
    const side = state.reviewSideToMove || "w";
    if (state.reviewBoard && getCheckedSides(state.reviewBoard)[side]) {
      const key = `${state.reviewGame?.id || state.reviewGame?.endedAt || ""}:${state.reviewCursor}:${boardSignature(state.reviewBoard)}:${side}`;
      if (state.reviewCheckSoundKey !== key) {
        state.reviewCheckSoundKey = key;
        playMoveSound("check");
      }
    } else {
      state.reviewCheckSoundKey = "";
    }
  }

  function clearRoomCheckmateEffectKey() {
    state.roomCheckmateEffectKey = "";
    hideBoardBurst(dom.roomCheckmateBurst, "roomCheckmateEffectTimer");
  }

  function maybeShowRoomCheckmateEffect() {
    const room = state.room;
    if (!room?.result || room.result.reason !== "checkmate") return;
    const key = `${room.key || ""}:${room.result.endedAt || ""}:${room.moves?.length || 0}:${room.boardFen || ""}`;
    if (key && key === state.roomCheckmateEffectKey) return;
    state.roomCheckmateEffectKey = key;
    showBoardBurst(dom.roomCheckmateBurst, "roomCheckmateEffectTimer");
  }

  function clearReviewCheckmateEffectKey() {
    state.reviewCheckmateEffectKey = "";
    hideBoardBurst(dom.reviewCheckmateBurst, "reviewCheckmateEffectTimer");
  }

  function maybeShowReviewCheckmateEffect() {
    if (!state.reviewGame || !state.reviewBoard) {
      clearReviewCheckmateEffectKey();
      return;
    }
    const result = XiangqiCore.determineGameState(state.reviewBoard, state.reviewSideToMove || "w");
    if (!result.finished || result.reason !== "checkmate") {
      clearReviewCheckmateEffectKey();
      return;
    }
    const key = `${state.reviewGame.id || state.reviewGame.endedAt || ""}:${state.reviewCursor}:${boardSignature(state.reviewBoard)}`;
    if (key && key === state.reviewCheckmateEffectKey) return;
    state.reviewCheckmateEffectKey = key;
    showBoardBurst(dom.reviewCheckmateBurst, "reviewCheckmateEffectTimer");
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
    renderRoomRuleNotice();
    drawRoomScene(forceBoard, Boolean(state.roomAnimation));
  }

  function renderRoomRuleNotice() {
    const board = document.getElementById("roomBoard");
    if (!board) return;
    let notice = board.querySelector(".room-rule-notice");
    const text = state.room?.ruleNotice?.text || "";
    const active = text && Number(state.room?.ruleNotice?.expiresAt || 0) > Date.now();
    if (!active) {
      if (notice) notice.remove();
      return;
    }
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "room-rule-notice";
      board.appendChild(notice);
    }
    notice.textContent = text;
    window.clearTimeout(state.roomRuleNoticeTimer || 0);
    state.roomRuleNoticeTimer = window.setTimeout(renderRoomRuleNotice, Math.max(200, Number(state.room.ruleNotice.expiresAt || 0) - Date.now()));
  }

  function materializeLocalRoomPhase() {
    const room = state.room;
    if (!room) return;
    const countdownEndsAt = Number(room.countdownEndsAt || 0);
    if (room.status === "starting" && countdownEndsAt > 0 && Date.now() >= countdownEndsAt) {
      room.status = "active";
      room.sideToMove = "w";
      room.countdownEndsAt = 0;
      room.turnStartedAt = countdownEndsAt;
      room.yourTurn = room.role === "player" && room.yourSide === "w";
      state.roomSyncedAt = countdownEndsAt;
    }
  }

  function renderRoomMeta() {
    const room = state.room;
    if (!room) {
      dom.roomKeyLabel.textContent = "------";
      dom.roomStatusBadge.textContent = "Chưa vào phòng";
      updateRoomPeopleBadge(null);
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
    updateRoomPeopleBadge(room);
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

    const isBotRoom = room.mode === "bot";
    const canAct = room.role === "player" && room.status === "active" && !state.roomActionBusy;
    dom.undoRequestBtn.disabled = isBotRoom || !canAct || Number(room.allowances?.undoRemaining || 0) <= 0 || Boolean(room.pendingRequest);
    dom.drawRequestBtn.disabled = isBotRoom || !canAct || Number(room.allowances?.drawRemaining || 0) <= 0 || Boolean(room.pendingRequest);
    dom.resignBtn.disabled = !canAct;

    const showReadyButton = !isBotRoom && room.role === "player" && (room.status === "ready" || room.status === "finished");
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

  function updateRoomPeopleBadge(room) {
    if (!dom.roomPeopleBadge) return;
    const spectators = Array.isArray(room?.spectators) ? room.spectators.length : 0;
    const playerCount = room ? [room.players?.w, room.players?.b].filter(Boolean).length : 0;
    const count = room ? playerCount + spectators : 0;
    const value = dom.roomPeopleBadge.querySelector("strong");
    if (value) value.textContent = String(count);
    dom.roomPeopleBadge.title = `${count} người trong phòng`;
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

    const participants = [];
    if (room.players?.w) participants.push({ ...room.players.w, roleLabel: "Người chơi Đỏ" });
    if (room.players?.b) participants.push({ ...room.players.b, roleLabel: "Người chơi Đen" });
    const viewers = Array.isArray(room.spectators) ? room.spectators : [];
    viewers.forEach((viewer) => participants.push({ ...viewer, roleLabel: "Người xem" }));
    dom.viewerSummary.textContent = participants.length ? `${participants.length} người trong phòng` : "Chưa có người tham gia.";
    if (!participants.length) {
      const empty = document.createElement("div");
      empty.className = "viewer-empty";
      empty.textContent = "Hiện chưa có ai trong phòng.";
      dom.viewerList.appendChild(empty);
      return;
    }

    participants.forEach((viewer) => {
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
      sub.textContent = viewer.roleLabel || "Người tham gia";
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
    if (signature !== previousSignature && previousSignature) {
      showRoomChatToast(messages[messages.length - 1]);
    }
    state.lastChatSignature = signature;
    if (shouldStick || signature !== previousSignature) {
      dom.chatList.scrollTop = dom.chatList.scrollHeight;
    }
  }

  function showRoomChatToast(entry) {
    if (!entry || !dom.roomChatToast || state.route !== "room" || !isCompactMobile()) return;
    if (state.roomChatToastTimer) {
      clearTimeout(state.roomChatToastTimer);
      state.roomChatToastTimer = 0;
    }
    dom.roomChatToast.innerHTML = "";
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    paintAvatar(avatar, entry, "C");
    const body = document.createElement("div");
    body.className = "room-chat-toast-body";
    const name = document.createElement("strong");
    name.textContent = entry.displayName || entry.username || "Người chơi";
    const text = document.createElement("span");
    text.textContent = entry.text || "";
    body.append(name, text);
    dom.roomChatToast.append(avatar, body);
    dom.roomChatToast.classList.remove("hidden");
    dom.roomChatToast.classList.add("show");
    state.roomChatToastTimer = window.setTimeout(() => {
      dom.roomChatToast.classList.remove("show");
      dom.roomChatToast.classList.add("hidden");
      state.roomChatToastTimer = 0;
    }, 5000);
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
    clearTurnFlash();
    renderRoomMeta();
    renderRequestState();
    renderMoveList();
    renderRoomOverlay();
    renderRoomMobilePanels();
    renderRoomRuleNotice();
    drawRoomPieces();
    if (state.roomAnimation) {
      if (state.room?.result?.reason !== "checkmate") clearRoomCheckmateEffectKey();
    } else {
      playRoomPostMoveStatusSound();
    }
  }

  function drawRoomScene(forceBoard, immediate = false) {
    if (immediate) {
      if (state.roomDrawFrame) {
        window.cancelAnimationFrame(state.roomDrawFrame);
        state.roomDrawFrame = 0;
      }
      state.roomDrawForce = false;
      drawRoomBoard(forceBoard);
      drawRoomPieces(forceBoard);
      return;
    }
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
    const metrics = boardMetrics(dom.roomBoard);
    if (!metrics.width || !metrics.height) return { pieceSlots: [], hintSlots: [] };
    const layoutKey = `${Math.round(metrics.width)}x${Math.round(metrics.height)}|${viewSide()}`;
    if (state.roomPieceSlots && state.roomHintSlots && state.roomPieceSlots.length === 90 && state.roomHintSlots.length === 90) {
      if (state.roomSlotLayoutKey !== layoutKey) {
        for (let y = 0; y < 10; y += 1) {
          for (let x = 0; x < 9; x += 1) {
            const index = y * 9 + x;
            const pixel = squareToPixel({ x, y });
            state.roomHintSlots[index].style.left = `${pixel.x}px`;
            state.roomHintSlots[index].style.top = `${pixel.y}px`;
            state.roomPieceSlots[index].style.left = `${pixel.x}px`;
            state.roomPieceSlots[index].style.top = `${pixel.y}px`;
          }
        }
        state.roomSlotLayoutKey = layoutKey;
      }
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
        image.decoding = "sync";
        image.loading = "eager";
        image.fetchPriority = "high";
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

  function drawReviewScene(forceBoard, immediate = false) {
    if (immediate) {
      if (state.reviewDrawFrame) {
        window.cancelAnimationFrame(state.reviewDrawFrame);
        state.reviewDrawFrame = 0;
      }
      state.reviewDrawForce = false;
      drawReviewBoard(forceBoard);
      drawReviewPieces(forceBoard);
      drawReviewArrow();
      return;
    }
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
    const metrics = boardMetrics(dom.reviewBoard);
    if (!metrics.width || !metrics.height) return [];
    const layoutKey = `${Math.round(metrics.width)}x${Math.round(metrics.height)}|${reviewViewSide()}`;
    if (state.reviewPieceSlots && state.reviewPieceSlots.length === 90) {
      if (state.reviewSlotLayoutKey !== layoutKey) {
        for (let y = 0; y < 10; y += 1) {
          for (let x = 0; x < 9; x += 1) {
            const index = y * 9 + x;
            const pixel = reviewSquareToPixel({ x, y });
            state.reviewPieceSlots[index].style.left = `${pixel.x}px`;
            state.reviewPieceSlots[index].style.top = `${pixel.y}px`;
          }
        }
        state.reviewSlotLayoutKey = layoutKey;
      }
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
        image.decoding = "sync";
        image.loading = "eager";
        image.fetchPriority = "high";
        image.draggable = false;
        piece.appendChild(image);
        fragment.appendChild(piece);
        state.reviewPieceSlots.push(piece);
      }
    }
    dom.reviewPieces.replaceChildren(fragment);
    return state.reviewPieceSlots;
  }

  function cssBoardColor(style, name, fallback) {
    return (style.getPropertyValue(name) || "").trim() || fallback;
  }

  function drawBoardPointMark(ctx, px, py, leftEdge, rightEdge, size) {
    const inner = size * 0.34;
    const outer = size;
    ctx.beginPath();
    if (!leftEdge) {
      ctx.moveTo(px - outer, py - inner);
      ctx.lineTo(px - inner, py - inner);
      ctx.lineTo(px - inner, py - outer);
      ctx.moveTo(px - outer, py + inner);
      ctx.lineTo(px - inner, py + inner);
      ctx.lineTo(px - inner, py + outer);
    }
    if (!rightEdge) {
      ctx.moveTo(px + outer, py - inner);
      ctx.lineTo(px + inner, py - inner);
      ctx.lineTo(px + inner, py - outer);
      ctx.moveTo(px + outer, py + inner);
      ctx.lineTo(px + inner, py + inner);
      ctx.lineTo(px + inner, py + outer);
    }
    ctx.stroke();
  }

  function drawXiangqiBoardGrid(ctx, metrics, g, style) {
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, metrics.width, metrics.height);
    const lineColor = cssBoardColor(style, "--board-line", "rgba(28, 44, 50, 0.9)");
    const markColor = cssBoardColor(style, "--board-mark", lineColor);
    const riverColor = cssBoardColor(style, "--board-river-text", "rgba(28, 44, 50, 0.56)");
    const left = g.x(0);
    const right = g.x(8);
    const top = Math.min(g.y(0), g.y(9));
    const bottom = Math.max(g.y(0), g.y(9));
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = Math.max(1, metrics.width / 620);
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
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

    ctx.strokeStyle = markColor;
    ctx.lineWidth = Math.max(0.9, metrics.width / 760);
    const markSize = Math.max(8, metrics.width / 38);
    const markSquares = [
      [1, 2], [7, 2], [0, 3], [2, 3], [4, 3], [6, 3], [8, 3],
      [0, 6], [2, 6], [4, 6], [6, 6], [8, 6], [1, 7], [7, 7]
    ];
    for (const [x, y] of markSquares) {
      const px = g.x(x);
      const py = g.y(y);
      drawBoardPointMark(ctx, px, py, Math.abs(px - left) < 0.5, Math.abs(px - right) < 0.5, markSize);
    }

    ctx.fillStyle = riverColor;
    ctx.font = `${Math.max(22, metrics.width / 17)}px "Noto Serif SC", "KaiTi", "STKaiti", "SimSun", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u695A\u6CB3", left + (right - left) * 0.27, (g.y(4) + g.y(5)) / 2);
    ctx.fillText("\u6F22\u754C", left + (right - left) * 0.73, (g.y(4) + g.y(5)) / 2);

    ctx.strokeStyle = cssBoardColor(style, "--board-frame-line", lineColor);
    ctx.lineWidth = Math.max(0.75, metrics.width / 900);
    ctx.strokeRect(left, top, right - left, bottom - top);
    ctx.restore();
  }

  function resizeBoardCanvas(canvas, metrics) {
    if (!canvas) return null;
    canvas.width = Math.round(metrics.width * devicePixelRatio);
    canvas.height = Math.round(metrics.height * devicePixelRatio);
    canvas.style.width = `${metrics.width}px`;
    canvas.style.height = `${metrics.height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, metrics.width, metrics.height);
    return ctx;
  }

  function boardSkinSignature() {
    return `${document.documentElement.dataset.theme || ""}|${document.documentElement.dataset.boardSkin || ""}`;
  }

  function drawRoomBoard(force) {
    if (dom.roomView.classList.contains("hidden")) return;
    const metrics = boardMetrics(dom.roomBoard);
    if (!metrics.width || !metrics.height) return;
    state.lastBoardSizeKey = `${Math.round(metrics.width)}x${Math.round(metrics.height)}`;
    const signature = `${Math.round(metrics.width)}x${Math.round(metrics.height)}|${viewSide()}|${boardSkinSignature()}`;
    if (!force && signature === state.lastBoardFrame) return;
    state.lastBoardFrame = signature;
    const boardCtx = resizeBoardCanvas(dom.roomBoardCanvas, metrics);
    if (boardCtx) drawXiangqiBoardGrid(boardCtx, metrics, geometry(), getComputedStyle(dom.roomBoard));
  }

  function drawRoomPieces(force) {
    if (dom.roomView.classList.contains("hidden")) return;
    const board = state.roomBoard;
    const checkedSides = getCheckedSides(board);
    const selectionKey = state.selectedSquare ? XiangqiCore.squareToUci(state.selectedSquare) : "";
    const hintKey = state.hints.map(XiangqiCore.squareToUci).join(",");
    const animationKey = state.roomAnimation?.moveKey || "";
    const signature = `${state.room?.boardFen || START_FEN}|${viewSide()}|${currentPieceSkin()}|${selectionKey}|${hintKey}|${animationKey}|${checkedSides.w ? "1" : "0"}${checkedSides.b ? "1" : "0"}`;
    if (!force && signature === state.lastPieceFrame) return;
    state.lastPieceFrame = signature;
    const { pieceSlots, hintSlots } = ensureRoomSlots();
    if (!pieceSlots.length || !hintSlots.length) return;
    const keepHiddenPieceSkins = isCompactMobile();
    const hintIndexes = new Set(state.hints.map((square) => square.y * 9 + square.x));

    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const index = y * 9 + x;
        const animation = state.roomAnimation;
        const el = pieceSlots[index];
        const isAnimatingFromSlot = animation && index === animation.fromIndex;
        if (isAnimatingFromSlot && state.roomAnimationRunning && state.activeRoomMoveSlotEl === el) {
          const mark = hintSlots[index];
          const showHint = hintIndexes.has(index);
          mark.classList.toggle("is-visible", showHint);
          mark.setAttribute("aria-hidden", showHint ? "false" : "true");
          continue;
        }
        let piece = board[y]?.[x] || "";
        if (animation) {
          if (index === animation.fromIndex) piece = animation.piece;
          else if (index === animation.toIndex) piece = "";
        }
        if (!piece) {
          el.classList.remove("is-visible");
          el.classList.remove("selected", "in-check");
          el.style.transition = "none";
          el.style.transform = roomPieceRestTransform();
          if (!keepHiddenPieceSkins && el.dataset.piece && !(animation && index === animation.toIndex)) {
            el.dataset.piece = "";
            el.removeAttribute("aria-label");
          }
          el.setAttribute("aria-hidden", "true");
        } else {
          const image = el.querySelector(".piece-skin");
          if (el.dataset.piece !== piece || (image && image.getAttribute("src") !== roomPieceImageFor(piece))) {
            setRoomPieceSlotImage(el, piece);
          }
          el.classList.toggle("selected", Boolean(state.selectedSquare && state.selectedSquare.x === x && state.selectedSquare.y === y));
          el.classList.toggle("in-check", piece.toLowerCase() === "k" && checkedSides[XiangqiCore.pieceColor(piece)]);
          if (state.roomAnimation && state.roomAnimation.fromIndex === index) {
            const keepRunningTransform = state.roomAnimationRunning && state.activeRoomMoveSlotEl === el;
            state.activeRoomMoveSlotEl = el;
            if (!keepRunningTransform) {
              el.style.transition = "none";
              el.style.transform = roomPieceRestTransform();
            }
          } else {
            el.style.transition = "none";
            el.style.transform = roomPieceRestTransform();
          }
          el.classList.add("is-visible");
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
    const metrics = boardMetrics(dom.reviewBoard);
    if (!metrics.width || !metrics.height) return;
    const signature = `${Math.round(metrics.width)}x${Math.round(metrics.height)}|${reviewViewSide()}|${boardSkinSignature()}`;
    if (!force && signature === state.reviewLastBoardFrame) return;
    state.reviewLastBoardFrame = signature;

    const canvas = dom.reviewBoardCanvas;
    const arrowCanvas = dom.reviewArrowCanvas;
    for (const item of [canvas, arrowCanvas]) {
      item.width = Math.round(metrics.width * devicePixelRatio);
      item.height = Math.round(metrics.height * devicePixelRatio);
      item.style.width = `${metrics.width}px`;
      item.style.height = `${metrics.height}px`;
    }
    drawXiangqiBoardGrid(canvas.getContext("2d"), metrics, reviewGeometry(), getComputedStyle(dom.reviewBoard));
  }

  function drawReviewPieces(force) {
    if (dom.reviewView.classList.contains("hidden")) return;
    const board = state.reviewBoard;
    const checkedSides = getCheckedSides(board);
    const currentIndex = state.reviewCursor - 1;
    const currentAnalysis = currentIndex >= 0 ? state.reviewAnalysis[currentIndex] : null;
    const currentPly = currentIndex >= 0 ? state.reviewGame?.plies?.[currentIndex] : null;
    const animationKey = state.reviewAnimation?.moveKey || "";
    const signature = `${boardSignature(board)}|${reviewViewSide()}|${currentPieceSkin()}|${currentIndex}|${currentAnalysis?.grade || ""}|${currentPly?.move || ""}|${animationKey}|${checkedSides.w ? "1" : "0"}${checkedSides.b ? "1" : "0"}`;
    if (!force && signature === state.reviewLastPieceFrame) return;
    state.reviewLastPieceFrame = signature;
    const slots = ensureReviewSlots();
    if (!slots.length) return;
    const movedSquare = state.reviewLastMoveSquare;
    const badge = reviewBadgeForGrade(currentAnalysis?.grade || "");
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const index = y * 9 + x;
        const animation = state.reviewAnimation;
        let piece = board[y]?.[x] || "";
        if (animation) {
          if (index === animation.fromIndex) piece = animation.piece;
          else if (index === animation.toIndex) piece = "";
        }
        const el = slots[index];
        if (!piece) {
          el.classList.remove("is-visible");
          el.classList.remove("in-check", "review-current", "review-badge", "review-grade-book", "review-grade-brilliant", "review-grade-good", "review-grade-okay", "review-grade-bad");
          el.style.transition = "none";
          el.style.transform = "translate(-50%, -50%)";
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
        el.classList.remove("review-current", "review-badge", "review-grade-book", "review-grade-brilliant", "review-grade-good", "review-grade-okay", "review-grade-bad");
        const image = el.querySelector(".piece-skin");
        if (el.dataset.piece !== piece || (image && image.getAttribute("src") !== roomPieceImageFor(piece))) {
          el.dataset.piece = piece;
          if (image) {
            image.src = roomPieceImageFor(piece);
            image.alt = piece;
          }
          el.setAttribute("aria-label", piece);
        }
        if (state.reviewAnimation && state.reviewAnimation.fromIndex === index) {
          state.activeReviewMoveSlotEl = el;
          el.style.transition = "none";
          el.style.transform = "translate(-50%, -50%)";
        } else {
          el.style.transition = "none";
          el.style.transform = "translate(-50%, -50%)";
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
    if (!analysis || analysis.grade === "brilliant" || analysis.grade === "book" || !/^[a-i][0-9][a-i][0-9]$/.test(analysis.bestMove || "")) return;

    const canvas = dom.reviewArrowCanvas;
    const ctx = canvas.getContext("2d");
    const metrics = boardMetrics(dom.reviewBoard);
    const from = reviewSquareToPixel(uciToSquare(analysis.bestMove.slice(0, 2)));
    const toSquare = uciToSquare(analysis.bestMove.slice(2, 4));
    const to = reviewSquareToPixel(toSquare);
    const pieceRatio = Number.parseFloat(getComputedStyle(dom.reviewBoard).getPropertyValue("--piece-size")) / 100 || 0.086;
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
    const reviewSide = state.reviewGame?.plies?.[currentIndex]?.side || (currentIndex % 2 === 0 ? "w" : "b");
    const palette = arrowPalette(reviewSide === "w" ? "rgba(118, 190, 82, 0.9)" : "rgba(211, 20, 197, 0.92)");
    drawStyledArrow(ctx, from, base, tip, normal, halfWidth, palette);
  }

  function drawOpeningBookScene(forceBoard, immediate = false) {
    if (dom.libraryBookCreatePanel?.classList.contains("hidden")) return;
    const draw = () => {
      drawOpeningBookBoard(forceBoard);
      drawOpeningBookPieces(forceBoard);
      drawOpeningBookArrows();
    };
    if (immediate) {
      if (state.openingBookDrawFrame) {
        window.cancelAnimationFrame(state.openingBookDrawFrame);
        state.openingBookDrawFrame = 0;
      }
      state.openingBookDrawForce = false;
      draw();
      return;
    }
    state.openingBookDrawForce = state.openingBookDrawForce || Boolean(forceBoard);
    if (state.openingBookDrawFrame) return;
    state.openingBookDrawFrame = window.requestAnimationFrame(() => {
      const force = state.openingBookDrawForce;
      state.openingBookDrawFrame = 0;
      state.openingBookDrawForce = false;
      drawOpeningBookBoard(force);
      drawOpeningBookPieces(force);
      drawOpeningBookArrows();
    });
  }

  function drawOpeningBookBoard(force) {
    if (!dom.openingBookBoard || !dom.openingBookArrowCanvas) return;
    const metrics = boardMetrics(dom.openingBookBoard);
    if (!metrics.width || !metrics.height) return;
    const signature = `${Math.round(metrics.width)}x${Math.round(metrics.height)}|${openingBookViewSide()}|${boardSkinSignature()}`;
    if (!force && signature === state.openingBookLastBoardFrame) return;
    state.openingBookLastBoardFrame = signature;
    const boardCtx = resizeBoardCanvas(dom.openingBookBoardCanvas, metrics);
    if (boardCtx) drawXiangqiBoardGrid(boardCtx, metrics, openingBookGeometry(), getComputedStyle(dom.openingBookBoard));
    resizeBoardCanvas(dom.openingBookArrowCanvas, metrics);
  }

  function ensureOpeningBookSlots() {
    if (!dom.openingBookBoard || dom.libraryBookCreatePanel?.classList.contains("hidden")) return { pieceSlots: [], hintSlots: [] };
    const metrics = boardMetrics(dom.openingBookBoard);
    if (!metrics.width || !metrics.height) return { pieceSlots: [], hintSlots: [] };
    const layoutKey = `${Math.round(metrics.width)}x${Math.round(metrics.height)}`;
    if (state.openingBookSlots && state.openingBookHintSlots && state.openingBookSlots.length === 90 && state.openingBookHintSlots.length === 90) {
      if (state.openingBookSlotLayoutKey !== layoutKey) {
        for (let y = 0; y < 10; y += 1) {
          for (let x = 0; x < 9; x += 1) {
            const index = y * 9 + x;
            const pixel = openingBookSquareToPixel({ x, y });
            state.openingBookSlots[index].style.left = `${pixel.x}px`;
            state.openingBookSlots[index].style.top = `${pixel.y}px`;
            state.openingBookHintSlots[index].style.left = `${pixel.x}px`;
            state.openingBookHintSlots[index].style.top = `${pixel.y}px`;
          }
        }
        state.openingBookSlotLayoutKey = layoutKey;
      }
      return { pieceSlots: state.openingBookSlots, hintSlots: state.openingBookHintSlots };
    }
    state.openingBookSlotLayoutKey = layoutKey;
    state.openingBookSlots = [];
    state.openingBookHintSlots = [];
    const pieceFragment = document.createDocumentFragment();
    const hintFragment = document.createDocumentFragment();
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const pixel = openingBookSquareToPixel({ x, y });
        const hint = document.createElement("div");
        hint.className = "hint";
        hint.style.left = `${pixel.x}px`;
        hint.style.top = `${pixel.y}px`;
        hintFragment.appendChild(hint);
        state.openingBookHintSlots.push(hint);

        const piece = document.createElement("div");
        piece.className = "piece image-piece";
        piece.style.left = `${pixel.x}px`;
        piece.style.top = `${pixel.y}px`;
        piece.setAttribute("aria-hidden", "true");
        const image = document.createElement("img");
        image.className = "piece-skin";
        image.alt = "";
        image.decoding = "sync";
        image.loading = "eager";
        image.fetchPriority = "high";
        image.draggable = false;
        piece.appendChild(image);
        pieceFragment.appendChild(piece);
        state.openingBookSlots.push(piece);
      }
    }
    dom.openingBookMarks.replaceChildren(hintFragment);
    dom.openingBookPieces.replaceChildren(pieceFragment);
    return { pieceSlots: state.openingBookSlots, hintSlots: state.openingBookHintSlots };
  }

  function drawOpeningBookPieces(force) {
    const board = state.openingBookEditor.board;
    const checkedSides = getCheckedSides(board);
    const selectedKey = state.openingBookSelectedSquare ? XiangqiCore.squareToUci(state.openingBookSelectedSquare) : "";
    const hintKey = state.openingBookHints.map(XiangqiCore.squareToUci).join(",");
    const animationKey = state.openingBookAnimation?.moveKey || "";
    const signature = `${boardSignature(board)}|${openingBookViewSide()}|${currentPieceSkin()}|${selectedKey}|${hintKey}|${animationKey}|${checkedSides.w ? "1" : "0"}${checkedSides.b ? "1" : "0"}`;
    if (!force && signature === state.openingBookLastPieceFrame) return;
    state.openingBookLastPieceFrame = signature;
    const { pieceSlots, hintSlots } = ensureOpeningBookSlots();
    if (!pieceSlots.length) return;
    const hintIndexes = new Set(state.openingBookHints.map((square) => square.y * 9 + square.x));
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const index = y * 9 + x;
        const el = pieceSlots[index];
        const animation = state.openingBookAnimation;
        const isAnimatingFromSlot = animation && index === animation.fromIndex;
        if (isAnimatingFromSlot && state.openingBookAnimationRunning && state.activeOpeningBookMoveSlotEl === el) {
          const mark = hintSlots[index];
          const showHint = hintIndexes.has(index);
          mark.classList.toggle("is-visible", showHint);
          mark.setAttribute("aria-hidden", showHint ? "false" : "true");
          continue;
        }
        let piece = board[y]?.[x] || "";
        if (animation) {
          if (index === animation.fromIndex) piece = animation.piece;
          else if (index === animation.toIndex) piece = "";
        }
        if (!piece) {
          el.classList.remove("is-visible", "selected", "in-check");
          el.style.transition = "none";
          el.style.transform = roomPieceRestTransform();
          el.setAttribute("aria-hidden", "true");
          if (el.dataset.piece && !(animation && index === animation.toIndex)) {
            el.dataset.piece = "";
            el.removeAttribute("aria-label");
          }
        } else {
          const image = el.querySelector(".piece-skin");
          if (el.dataset.piece !== piece || (image && image.getAttribute("src") !== roomPieceImageFor(piece))) {
            setRoomPieceSlotImage(el, piece);
          }
          el.classList.add("is-visible");
          el.classList.toggle("selected", Boolean(state.openingBookSelectedSquare && state.openingBookSelectedSquare.x === x && state.openingBookSelectedSquare.y === y));
          el.classList.toggle("in-check", piece.toLowerCase() === "k" && checkedSides[XiangqiCore.pieceColor(piece)]);
          if (state.openingBookAnimation && state.openingBookAnimation.fromIndex === index) {
            const keepRunningTransform = state.openingBookAnimationRunning && state.activeOpeningBookMoveSlotEl === el;
            state.activeOpeningBookMoveSlotEl = el;
            if (!keepRunningTransform) {
              el.style.transition = "none";
              el.style.transform = roomPieceRestTransform();
            }
          } else {
            el.style.transition = "none";
            el.style.transform = roomPieceRestTransform();
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

  function drawOpeningBookArrows() {
    if (!dom.openingBookArrowCanvas) return;
    const metrics = boardMetrics(dom.openingBookBoard);
    const ctx = dom.openingBookArrowCanvas.getContext("2d");
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, metrics.width, metrics.height);
    if (state.openingBookPractice?.active && state.openingBookPractice.hintMove) {
      drawOpeningBookBranchArrow(ctx, state.openingBookPractice.hintMove, "");
      return;
    }
    if (state.openingBookPractice?.active) return;
    const children = openingBookCurrentNode().children || [];
    if (children.length < 2) return;
    children.forEach((child, index) => drawOpeningBookBranchArrow(ctx, child.move, index + 1));
  }

  function drawOpeningBookBranchArrow(ctx, move, number) {
    if (!/^[a-i][0-9][a-i][0-9]$/.test(move)) return;
    const metrics = boardMetrics(dom.openingBookBoard);
    const from = openingBookSquareToPixel(uciToSquare(move.slice(0, 2)));
    const to = openingBookSquareToPixel(uciToSquare(move.slice(2, 4)));
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
    const head = Math.max(34, metrics.width / 15.5);
    const halfWidth = Math.max(9, head * 0.2);
    const tip = to;
    const base = { x: tip.x - dir.x * head, y: tip.y - dir.y * head };
    ctx.lineWidth = Math.max(3.2, metrics.width / 175);
    drawStyledArrow(ctx, from, base, tip, normal, halfWidth, arrowPalette("rgba(79, 188, 82, 0.88)"));
    if (!number) return;
    const labelX = base.x - normal.x * (halfWidth + 12);
    const labelY = base.y - normal.y * (halfWidth + 12);
    ctx.save();
    ctx.fillStyle = "rgba(24, 20, 15, 0.86)";
    ctx.strokeStyle = "rgba(255, 231, 160, 0.96)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(labelX, labelY, Math.max(11, metrics.width / 42), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff4c6";
    ctx.font = `700 ${Math.max(12, metrics.width / 32)}px "Segoe UI"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(number), labelX, labelY);
    ctx.restore();
  }

  function onOpeningBookPointerDown(event) {
    if (state.route !== "library" || state.libraryTab !== "book-create") return;
    event.preventDefault();
    if (state.openingBookPractice?.awaitingLineConfirm || state.openingBookPractice?.choosingStart) return;
    if (shouldOpeningBookPracticeAutoMove()) {
      state.openingBookSelectedSquare = null;
      state.openingBookHints = [];
      renderOpeningBookEditor();
      scheduleOpeningBookAutoMove(80);
      return;
    }
    const square = eventToOpeningBookSquare(event);
    if (!square) return;
    const board = state.openingBookEditor.board;
    const piece = board[square.y]?.[square.x] || "";
    const side = state.openingBookEditor.side;
    if (state.openingBookSelectedSquare && state.openingBookSelectedSquare.x === square.x && state.openingBookSelectedSquare.y === square.y) {
      state.openingBookSelectedSquare = null;
      state.openingBookHints = [];
      renderOpeningBookEditor();
      return;
    }
    if (state.openingBookSelectedSquare) {
      const valid = state.openingBookHints.some((hint) => hint.x === square.x && hint.y === square.y);
      if (valid) {
        const move = XiangqiCore.squareToUci(state.openingBookSelectedSquare) + XiangqiCore.squareToUci(square);
        playOpeningBookMove(move);
        return;
      }
    }
    if (piece && XiangqiCore.pieceColor(piece) === side) {
      state.openingBookSelectedSquare = square;
      state.openingBookHints = XiangqiCore.getLegalMovesForSquare(board, side, square);
    } else {
      state.openingBookSelectedSquare = null;
      state.openingBookHints = [];
    }
    renderOpeningBookEditor();
  }

  function playOpeningBookMove(move) {
    if (state.openingBookPractice?.active) {
      playOpeningBookPracticeUserMove(move);
      return;
    }
    const board = state.openingBookEditor.board;
    const side = state.openingBookEditor.side;
    if (!XiangqiCore.isLegalMove(board, move, side)) return;
    const node = openingBookCurrentNode();
    node.children = Array.isArray(node.children) ? node.children : [];
    let childIndex = node.children.findIndex((child) => child.move === move);
    if (childIndex < 0) {
      childIndex = node.children.length;
      node.children.push({
        move,
        notation: XiangqiCore.formatMoveNotation(move, board, side),
        children: []
      });
    }
    const animation = buildOpeningBookMoveAnimation(move);
    if (animation) primeOpeningBookMoveAnimation(animation);
    else clearOpeningBookMoveAnimation();
    playOpeningBookMoveSound(board, move, side);
    state.openingBookEditor.path.push(childIndex);
    state.openingBookSelectedSquare = null;
    state.openingBookHints = [];
    state.openingBookEditor.lastBackNode = null;
    rebuildOpeningBookBoard();
    renderOpeningBookEditor();
    if (animation) startOpeningBookMoveAnimation(animation, { prepared: true });
  }

  function clearReviewArrow() {
    const metrics = boardMetrics(dom.reviewBoard);
    const ctx = dom.reviewArrowCanvas.getContext("2d");
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, metrics.width, metrics.height);
  }

  function onBoardPointerDown(event) {
    const room = state.room;
    if (!room || room.role !== "player" || room.status !== "active" || !room.yourTurn || state.roomActionBusy) return;
    event.preventDefault();
    clearTurnFlash();
    settleRoomAnimationNow();
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

    drawRoomPieces();
  }

  function clearSelection() {
    state.selectedSquare = null;
    state.hints = [];
    drawRoomPieces();
  }

  async function sendMove(move) {
    if (!state.room) return;
    clearTurnFlash();
    settleRoomAnimationNow();
    const side = state.room.yourSide;
    if (visibleClockFor(side) <= 0 || turnRemainingFor(side) <= 0) {
      requestRoomTimeoutSync();
      return;
    }
    const previousRoom = cloneJsonValue(state.room);
    const previousBoard = state.roomBoard.map((row) => row.slice());
    const previousSyncedAt = state.roomSyncedAt;
    const localBoard = state.roomBoard.map((row) => row.slice());
    const localAnimation = buildDirectionalMoveAnimation(
      previousBoard,
      move,
      `${state.room.key}:${(Array.isArray(state.room.moves) ? state.room.moves.length : 0) + 1}:${move}`
    );
    const notation = XiangqiCore.formatMoveNotation(move, state.roomBoard, side);
    const remaining = liveClockFor(side);
    XiangqiCore.applyMoveToBoard(localBoard, move);
    const localGameState = XiangqiCore.determineGameState(localBoard, oppositeSide(side));
    state.selectedSquare = null;
    state.hints = [];
    state.roomBoard = localBoard;
    state.room.boardFen = XiangqiCore.boardToFen(localBoard, oppositeSide(side));
    const nextTurnStartedAt = Date.now();
    state.room.sideToMove = oppositeSide(side);
    state.room.yourTurn = false;
    state.room.turnStartedAt = nextTurnStartedAt;
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
    state.roomSyncedAt = nextTurnStartedAt;
    state.roomActionBusy = true;
    if (localAnimation) {
      localAnimation.soundKind = localAnimation.capturedPiece ? "capture" : "move";
      localAnimation.suppressMoveSound = shouldUseStatusOnlySound(localBoard, oppositeSide(side), state.room.result);
    }
    if (localAnimation) primeRoomMoveAnimation(localAnimation);
    renderRoomAfterLocalMove();
    if (localAnimation) startRoomMoveAnimation(localAnimation, { prepared: true });
    try {
      const payload = await api("/api/rooms/move", {
        method: "POST",
        body: { key: state.room.key, move }
      });
      state.roomActionBusy = false;
      applyRoomState(payload.room, { forceBoard: false, keepSelection: false });
    } catch (error) {
      clearRoomMoveAnimation();
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

  async function leaveRoomFromMobileBack() {
    const room = state.room;
    if (!room) {
      applyRoomState(null, { forceBoard: true, keepSelection: false });
      goRoute("match", true);
      return;
    }
    if (state.roomActionBusy) return;
    state.roomActionBusy = true;
    renderRoomMeta();
    try {
      if (room.status !== "finished") {
        await api("/api/rooms/leave", {
          method: "POST",
          body: { key: room.key }
        });
      }
    } catch {
      // Back on mobile is an escape hatch: clear the local room even if the network hiccups.
    } finally {
      state.roomActionBusy = false;
      applyRoomState(null, { forceBoard: true, keepSelection: false });
      try {
        await refreshHistory();
      } catch {}
      goRoute("match", true);
      showToast("Đã rời phòng.");
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

  async function pollRoomState({ force = false } = {}) {
    if (!state.roomKey || !state.token || state.roomPollBusy || state.route !== "room") return;
    if (!force && (state.roomActionBusy || state.roomAnimation)) return;
    state.roomPollBusy = true;
    try {
      const payload = await api(`/api/rooms/state?key=${encodeURIComponent(state.roomKey)}`);
      if (!force && (state.roomActionBusy || state.roomAnimation || state.route !== "room")) return;
      if (force && state.route !== "room") return;
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
      paintTurnProgress(dom.topPlayerAvatar, false);
      paintTurnProgress(dom.bottomPlayerAvatar, false);
      return;
    }
    const bottomSide = room.role === "player" ? room.yourSide : "w";
    const topSide = oppositeSide(bottomSide);
    const topVisible = visibleClockFor(topSide);
    const bottomVisible = visibleClockFor(bottomSide);
    const topActive = room.status === "active" && room.sideToMove === topSide && !room.result;
    const bottomActive = room.status === "active" && room.sideToMove === bottomSide && !room.result;
    paintClock(dom.topClock, topVisible, topActive);
    paintClock(dom.bottomClock, bottomVisible, bottomActive);
    paintTurnProgress(dom.topPlayerAvatar, topActive, room);
    paintTurnProgress(dom.bottomPlayerAvatar, bottomActive, room);
    if (room.status === "active" && !room.result) {
      const activeVisible = room.sideToMove === topSide ? topVisible : bottomVisible;
      if (activeVisible <= 0 || turnRemainingFor(room.sideToMove) <= 0) requestRoomTimeoutSync();
    }
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

  function paintTurnProgress(element, active, room = state.room) {
    if (!element) return;
    if (!active || !room || room.result || room.status !== "active") {
      element.classList.remove("turn-progress");
      element.style.removeProperty("--turn-spent");
      return;
    }
    const limit = Math.max(1, Number(room.turnLimitMs || 120000));
    const startedAt = Number(room.turnStartedAt || state.roomSyncedAt || Date.now());
    const spent = Math.max(0, Math.min(limit, Date.now() - startedAt));
    element.style.setProperty("--turn-spent", `${spent / limit}turn`);
    element.classList.add("turn-progress");
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
    const live = liveClockFor(side);
    const hiddenBonus = Math.max(0, Number(state.room.hiddenClockBonusMs || 0));
    const visibleSetup = Math.max(0, Number(state.room.clockSetupMs?.[side] || 0));
    if (hiddenBonus > 0 && visibleSetup > 0) {
      const actualSetup = visibleSetup + hiddenBonus;
      return Math.max(0, live * (visibleSetup / actualSetup));
    }
    return Math.max(0, live);
  }

  function turnRemainingFor(side) {
    const room = state.room;
    if (!room || room.status !== "active" || room.sideToMove !== side || room.result) return Infinity;
    const limit = Math.max(1, Number(room.turnLimitMs || 120000));
    const startedAt = Number(room.turnStartedAt || state.roomSyncedAt || Date.now());
    return Math.max(0, limit - (Date.now() - startedAt));
  }

  function requestRoomTimeoutSync() {
    const now = Date.now();
    if (now - Number(state.roomTimeoutSyncAt || 0) < 450) return;
    state.roomTimeoutSyncAt = now;
    void pollRoomState({ force: true });
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
      const raw = readPersistentValue(STORAGE_USER);
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
      writePersistentValue(STORAGE_USER, "");
      return;
    }
    writePersistentValue(STORAGE_USER, JSON.stringify({
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
    if (room.mode === "bot" && room.status === "starting") return "Đánh với máy";
    if (room.mode === "bot" && room.status === "active") return room.yourTurn ? "Tới lượt bạn" : "Bot đang nghĩ";
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
    if (room.mode === "bot") {
      const botName = room.bot?.name || "Bot";
      const botLevel = Number(room.bot?.level || 1);
      if (room.status === "starting") {
        return `Bạn đang đánh với ${botName} cấp ${botLevel}. Ván sẽ bắt đầu sau bảng đếm.`;
      }
      if (room.status === "finished") {
        return "Ván đánh máy đã kết thúc. Bạn có thể out phòng để tạo ván mới.";
      }
      return room.yourTurn
        ? `Bạn đang cầm bên ${room.yourSide === "w" ? "Đỏ" : "Đen"}, đấu ${botName} cấp ${botLevel}. Thời gian mỗi bên ${formatClockSetup(yourClockMs)}${incrementLabel}.`
        : `${botName} cấp ${botLevel} đang suy nghĩ. Thời gian mỗi bên ${formatClockSetup(yourClockMs)}${incrementLabel}.`;
    }

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
    if (room.result.reason === "repetition") return "Ván cờ hòa do lặp hình cờ.";
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
    if (!element) return;
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
      if (shouldIgnoreMobileRoomHeightResize()) return;
      syncViewportHeight();
      renderRoomMobilePanels();
      onResize();
    }, 120);
  }

  function shouldIgnoreMobileRoomHeightResize() {
    if (!isCompactMobile() || state.route !== "room" || dom.roomView.classList.contains("hidden")) return false;
    if (!state.lastBoardSizeKey) return false;
    const width = Math.round(window.innerWidth || 0);
    const height = Math.round(window.innerHeight || 0);
    const previousWidth = state.lastViewportWidth || width;
    const previousHeight = state.lastViewportHeight || height;
    const widthDelta = Math.abs(width - previousWidth);
    const heightDelta = Math.abs(height - previousHeight);
    if (widthDelta <= 2 && heightDelta > 2) {
      state.lastViewportHeight = height;
      return true;
    }
    return false;
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

  function openingBookViewSide() {
    return normalizeOpeningBookSide(state.openingBookEditor?.bookSide);
  }

  function geometry() {
    return boardGridGeometry(dom.roomBoard, viewSide() === "b");
  }

  function reviewGeometry() {
    return boardGridGeometry(dom.reviewBoard, reviewViewSide() === "b");
  }

  function openingBookGeometry() {
    return boardGridGeometry(dom.openingBookBoard, openingBookViewSide() === "b");
  }

  function boardGridGeometry(element, flipped) {
    const metrics = boardMetrics(element);
    const style = getComputedStyle(element);
    const padX = metrics.width * cssPercentValue(style, "--board-grid-pad-x", 1.4);
    const padY = metrics.height * cssPercentValue(style, "--board-grid-pad-y", 1.2);
    const stepX = (metrics.width - padX * 2) / 8;
    const stepY = (metrics.height - padY * 2) / 9;
    return {
      rect: metrics.rect,
      offsetX: metrics.offsetX,
      offsetY: metrics.offsetY,
      x: (file) => padX + (flipped ? 8 - file : file) * stepX,
      y: (rank) => padY + (flipped ? rank : 9 - rank) * stepY
    };
  }

  function cssPercentValue(style, name, fallbackPercent) {
    const parsed = Number.parseFloat(style.getPropertyValue(name));
    return Number.isFinite(parsed) ? parsed / 100 : fallbackPercent / 100;
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

  function reviewSquareToPixel(square) {
    const g = reviewGeometry();
    return { x: g.x(square.x), y: g.y(square.y) };
  }

  function openingBookSquareToPixel(square) {
    const g = openingBookGeometry();
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
    const g = geometry();
    let best = null;
    let bestDistance = Infinity;
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const px = g.x(x);
        const py = g.y(y);
        const distance = Math.hypot(event.clientX - g.rect.left - g.offsetX - px, event.clientY - g.rect.top - g.offsetY - py);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    return bestDistance < boardMetrics(dom.roomBoard).width / 9.4 ? best : null;
  }

  function eventToOpeningBookSquare(event) {
    const g = openingBookGeometry();
    let best = null;
    let bestDistance = Infinity;
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const px = g.x(x);
        const py = g.y(y);
        const distance = Math.hypot(event.clientX - g.rect.left - g.offsetX - px, event.clientY - g.rect.top - g.offsetY - py);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x, y };
        }
      }
    }
    return bestDistance < boardMetrics(dom.openingBookBoard).width / 9.4 ? best : null;
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

  function shouldUseStatusOnlySound(board, sideToMove, result = null) {
    if (result?.reason === "checkmate") return true;
    if (!board || !sideToMove) return false;
    return Boolean(getCheckedSides(board)[sideToMove]);
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

  function isSessionReplacedError(error) {
    const code = String(error?.code || "").toUpperCase();
    const message = String(error?.message || "");
    return Number(error?.status) === 409 || code === "SESSION_REPLACED" || /dang nhap o noi khac|SESSION_REPLACED/i.test(message);
  }

  function handleSessionReplaced() {
    if (state.sessionSuspended) return;
    state.sessionSuspended = true;
    stopRoomPolling();
    clearRoomMoveAnimation();
    clearReviewMoveAnimation();
    state.token = "";
    writePersistentValue(STORAGE_TOKEN, "");
    writePersistentValue(LEGACY_STORAGE_TOKEN, "");
    if (dom.accessKeyInput && state.savedAccessKey) dom.accessKeyInput.value = state.savedAccessKey;
    showAccessGate("Tai khoan dang dang nhap o noi khac.");
  }

  async function api(url, options = {}, behavior = {}) {
    const method = options.method || (options.body !== undefined ? "POST" : "GET");
    const headers = {};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    if (state.deviceId) headers["X-Dmaihxcai-Device"] = state.deviceId;
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
          const error = Object.assign(new Error(data.error || `HTTP ${response.status}`), {
            status: response.status,
            code: data.code || ""
          });
          if (!behavior.suppressSessionReplaced && isSessionReplacedError(error)) {
            handleSessionReplaced();
          }
          throw error;
        }
        return data;
      } catch (error) {
        lastError = error;
        if (!API_RETRYABLE_STATUS.has(Number(error.status)) || attempt === 3) break;
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }

    if (lastError && isSessionReplacedError(lastError)) {
      if (!behavior.suppressSessionReplaced) handleSessionReplaced();
    } else if (lastError && /UNAUTHORIZED/i.test(lastError.message || "")) {
      clearSession();
      goRoute("home", true);
      setMessage(dom.matchHubMessage, "Phiên thiết bị đã hết hạn. Hãy thử lại.");
    }
    renderProfileAfterApiFailure();
    throw lastError || new Error("Không thể kết nối tới máy chủ.");
  }
})();
