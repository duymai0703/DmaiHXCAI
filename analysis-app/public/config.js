(function () {
  if (window.DMAIHXCAI_API_BASE) return;

  const host = window.location.hostname;
  const protocol = window.location.protocol;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const isRender = host.endsWith(".onrender.com");
  const isNetlify = host.endsWith(".netlify.app") || host.endsWith(".netlify.live");
  const needsRemoteApi = protocol === "file:" || (!isLocal && !isRender && !isNetlify);

  window.DMAIHXCAI_API_BASE = needsRemoteApi ? "https://dmaihxcai.onrender.com" : "";
})();
