const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const APP_DIR = __dirname;
const DEFAULT_MODEL_CANDIDATES = [
  path.join(APP_DIR, "ml", "models", "xiangqi-yolo.pt"),
  path.join(APP_DIR, "ml", "runs", "xiangqi-yolo", "weights", "best.pt"),
  path.join(APP_DIR, "ml", "runs", "train", "weights", "best.pt")
];

function yoloPythonPath() {
  const configured = String(process.env.XIANGQI_YOLO_PYTHON || process.env.YOLO_PYTHON || process.env.PYTHON || "").trim();
  if (configured) return configured;
  const localVenvPython = process.platform === "win32"
    ? path.join(APP_DIR, "ml", ".venv", "Scripts", "python.exe")
    : path.join(APP_DIR, "ml", ".venv", "bin", "python");
  if (fs.existsSync(localVenvPython)) return localVenvPython;
  return "python";
}

function yoloScriptPath() {
  return path.join(APP_DIR, "ml", "yolo_infer.py");
}

function configuredModelCandidates() {
  return [
    process.env.XIANGQI_YOLO_MODEL,
    process.env.YOLO_VISION_MODEL,
    ...DEFAULT_MODEL_CANDIDATES
  ].map((item) => String(item || "").trim()).filter(Boolean);
}

function yoloModelPath() {
  return configuredModelCandidates().find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || "";
}

function yoloVisionAvailable() {
  return Boolean(yoloModelPath() && fs.existsSync(yoloScriptPath()) && yoloRuntimeLikelyAvailable());
}

function yoloVisionStatus() {
  const modelPath = yoloModelPath();
  const python = yoloPythonPath();
  return {
    available: yoloVisionAvailable(),
    engine: "ultralytics-yolo",
    modelPath,
    modelConfigured: Boolean(process.env.XIANGQI_YOLO_MODEL || process.env.YOLO_VISION_MODEL),
    scriptExists: fs.existsSync(yoloScriptPath()),
    python,
    runtimeLikelyAvailable: yoloRuntimeLikelyAvailable()
  };
}

function yoloRuntimeLikelyAvailable() {
  const configured = Boolean(process.env.XIANGQI_YOLO_PYTHON || process.env.YOLO_PYTHON || process.env.PYTHON);
  if (configured) return true;
  const localVenvPython = process.platform === "win32"
    ? path.join(APP_DIR, "ml", ".venv", "Scripts", "python.exe")
    : path.join(APP_DIR, "ml", ".venv", "bin", "python");
  return fs.existsSync(localVenvPython);
}

async function recognizeYoloXiangqiBoard({ image, imageData, side = "w" }) {
  const modelPath = yoloModelPath();
  const scriptPath = yoloScriptPath();
  if (!modelPath || !fs.existsSync(modelPath)) throw new Error("VISION_YOLO_UNAVAILABLE");
  if (!fs.existsSync(scriptPath)) throw new Error("VISION_YOLO_SCRIPT_MISSING");

  const buffer = dataUrlToBuffer(image || imageData || "");
  const tempPath = path.join(os.tmpdir(), `dmaihxcai-yolo-${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`);
  fs.writeFileSync(tempPath, buffer);

  try {
    const stdout = await execPythonJson(yoloPythonPath(), [
      scriptPath,
      "--model", modelPath,
      "--image", tempPath,
      "--side", String(side || "w").toLowerCase() === "b" ? "b" : "w",
      "--conf", String(process.env.XIANGQI_YOLO_CONF || "0.34")
    ], Number(process.env.XIANGQI_YOLO_TIMEOUT_MS || 45000));
    const parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed?.board) || !parsed.pieces?.length) throw new Error("VISION_EMPTY_RESULT");
    return {
      board: parsed.board,
      pieces: parsed.pieces,
      side: parsed.side === "b" ? "b" : "w",
      sideToMove: parsed.sideToMove === "b" ? "b" : "w",
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 8) : [],
      recognizer: "yolo-xiangqi",
      modelPath: path.basename(modelPath)
    };
  } catch (error) {
    if (String(error?.message || "").includes("VISION_EMPTY_RESULT")) throw error;
    const wrapped = new Error("VISION_YOLO_FAILED");
    wrapped.cause = error;
    throw wrapped;
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {}
  }
}

function execPythonJson(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        error.message = `${error.message}${stderr ? `\n${stderr}` : ""}`;
        reject(error);
        return;
      }
      const clean = String(stdout || "").trim();
      if (!clean) {
        reject(new Error(`YOLO returned empty output${stderr ? `: ${stderr}` : ""}`));
        return;
      }
      resolve(clean);
    });
  });
}

function dataUrlToBuffer(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) throw new Error("VISION_BAD_IMAGE");
  return Buffer.from(match[1].replace(/\s+/g, ""), "base64");
}

module.exports = {
  recognizeYoloXiangqiBoard,
  yoloVisionAvailable,
  yoloVisionStatus,
  yoloModelPath
};
