(function () {
  if (window.DMAIHXCAI_API_BASE) return;

  const host = window.location.hostname;
  const protocol = window.location.protocol;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const isRender = host.endsWith(".onrender.com");
  const renderApiBase = String(window.DMAIHXCAI_RENDER_API_BASE || "https://dmaihxcai.onrender.com").replace(/\/$/, "");
  const needsRemoteApi = protocol === "file:" || (!isLocal && !isRender);

  window.DMAIHXCAI_RENDER_API_BASE = renderApiBase;
  window.DMAIHXCAI_API_BASE = needsRemoteApi ? renderApiBase : "";
})();
