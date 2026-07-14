const fs = require("fs");
const path = require("path");

let sharp = null;
try {
  sharp = require("sharp");
} catch {}

const TEMPLATE_SIZE = 64;
const FEATURE_SIZE = 32;
const CANONICAL_WIDTH = 960;
const CANONICAL_HEIGHT = 1080;
const PIECE_TYPES = [
  ["K", "king"],
  ["A", "advisor"],
  ["B", "elephant"],
  ["N", "knight"],
  ["R", "rook"],
  ["C", "cannon"],
  ["P", "pawn"]
];

let modelPromise = null;

function localVisionAvailable() {
  return Boolean(sharp);
}

function localVisionStatus(publicDir) {
  return {
    available: localVisionAvailable(),
    engine: localVisionAvailable() ? "sharp-template-classifier" : "unavailable",
    trainingImages: countTrainingImages(),
    templateSets: templateDescriptors(publicDir).length
  };
}

async function recognizeLocalXiangqiBoard({ image, imageData, side = "w", publicDir }) {
  if (!sharp) throw new Error("VISION_LOCAL_UNAVAILABLE");
  const buffer = dataUrlToBuffer(image || imageData || "");
  const model = await getLocalVisionModel(publicDir);
  const raw = await sharp(buffer, { limitInputPixels: 32 * 1024 * 1024 })
    .rotate()
    .resize(CANONICAL_WIDTH, CANONICAL_HEIGHT, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const source = {
    data: raw.data,
    width: raw.info.width,
    height: raw.info.height,
    channels: raw.info.channels
  };

  const candidates = [];
  for (const templateGroup of model.groups.filter((group) => group.setName !== "mixed")) {
    for (const inset of [0, 0.035, 0.055, 0.075, 0.095, 0.12]) {
      candidates.push(recognizeGridCandidate(source, templateGroup, inset, inset));
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const board = best.board;
  const pieces = best.pieces;
  const warnings = best.warnings;

  const count = pieces.length;
  if (!count) throw new Error("VISION_EMPTY_RESULT");
  if (count > 32) {
    warnings.push("Ảnh có nhiều điểm giống quân cờ; hãy crop sát bàn hơn nếu kết quả bị thừa quân.");
  }
  if (count < 4) {
    warnings.push("AI thấy rất ít quân; hãy crop rõ bàn cờ hơn nếu thiếu quân.");
  }

  const normalizedSide = String(side || "w").toLowerCase() === "b" ? "b" : "w";
  return {
    board,
    pieces,
    side: normalizedSide,
    sideToMove: normalizedSide,
    warnings,
    recognizer: "local-template-ai",
    templateSet: best.setName || "mixed"
  };
}

function recognizeGridCandidate(source, model, insetXRatio, insetYRatio) {
  const board = Array.from({ length: 10 }, () => Array(9).fill(""));
  const pieces = [];
  const warnings = [];
  const gridLeft = source.width * insetXRatio;
  const gridTop = source.height * insetYRatio;
  const gridWidth = source.width * (1 - insetXRatio * 2);
  const gridHeight = source.height * (1 - insetYRatio * 2);
  const cellX = gridWidth / 8;
  const cellY = gridHeight / 9;
  const patchSize = Math.round(Math.min(cellX, cellY) * 1.08);
  let confidenceTotal = 0;

  for (let topY = 0; topY < 10; topY++) {
    for (let x = 0; x < 9; x++) {
      const patch = extractPatch(source, gridLeft + x * cellX, gridTop + topY * cellY, patchSize);
      const detected = classifyPatch(patch, model);
      if (!detected.piece) continue;
      const internalY = 9 - topY;
      board[internalY][x] = detected.piece;
      confidenceTotal += detected.confidence;
      const patchCenter = patchSize / 2;
      const centerOffset = Math.hypot(
        (detected.presence?.centerX ?? patchCenter) - patchCenter,
        (detected.presence?.centerY ?? patchCenter) - patchCenter
      ) / Math.max(1, patchSize);
      pieces.push({
        x,
        y: internalY,
        piece: detected.piece,
        confidence: roundConfidence(detected.confidence),
        centerOffset
      });
      if (detected.confidence < 0.42 && warnings.length < 5) {
        warnings.push(`Có quân hơi mờ tại cột ${x + 1}, hàng ${topY + 1}; hãy kiểm tra lại.`);
      }
    }
  }

  const count = pieces.length;
  const avgConfidence = count ? confidenceTotal / count : 0;
  const avgCenterOffset = count ? pieces.reduce((sum, piece) => sum + (piece.centerOffset || 0), 0) / count : 1;
  const countPenalty = count > 32 ? (count - 32) * 0.22 : count < 2 ? 0.5 : 0;
  const expectedBonus = count >= 4 && count <= 32 ? 0.42 : 0;
  const edgePenalty = insetXRatio === 0 && count > 24 ? 0.08 : 0;
  for (const piece of pieces) delete piece.centerOffset;
  return {
    board,
    pieces,
    warnings,
    avgConfidence,
    avgCenterOffset,
    setName: model.setName || "mixed",
    insetXRatio,
    insetYRatio,
    score: avgConfidence + expectedBonus - countPenalty - edgePenalty - avgCenterOffset * 0.95
  };
}

async function getLocalVisionModel(publicDir) {
  if (!modelPromise) modelPromise = buildLocalVisionModel(publicDir);
  return modelPromise;
}

async function buildLocalVisionModel(publicDir) {
  if (!sharp) throw new Error("VISION_LOCAL_UNAVAILABLE");
  const descriptors = templateDescriptors(publicDir);
  const templates = [];

  for (const descriptor of descriptors) {
    for (const [code, name] of PIECE_TYPES) {
      for (const side of ["red", "black"]) {
        const file = path.join(descriptor.baseDir, `${side}-${name}.png`);
        if (!fs.existsSync(file)) continue;
        try {
          const template = await buildTemplate(file, side === "red" ? code : code.toLowerCase(), descriptor.name);
          templates.push(template);
        } catch (error) {
          console.warn(`Cannot build vision template from ${file}: ${error.message}`);
        }
      }
    }
  }

  if (!templates.length) throw new Error("VISION_LOCAL_UNAVAILABLE");
  const grouped = new Map();
  for (const template of templates) {
    if (!grouped.has(template.setName)) grouped.set(template.setName, []);
    grouped.get(template.setName).push(template);
  }
  const groups = [...grouped.entries()]
    .map(([setName, setTemplates]) => ({
      setName,
      templates: setTemplates,
      red: setTemplates.filter((template) => template.side === "red"),
      black: setTemplates.filter((template) => template.side === "black")
    }))
    .filter((group) => group.red.length && group.black.length);
  groups.push({
    setName: "mixed",
    templates,
    red: templates.filter((template) => template.side === "red"),
    black: templates.filter((template) => template.side === "black")
  });
  return { templates, groups, red: groups.at(-1).red, black: groups.at(-1).black };
}

function templateDescriptors(publicDir) {
  const root = publicDir || path.join(__dirname, "public");
  const piecesDir = path.join(root, "assets", "pieces");
  const descriptors = [{ name: "default", baseDir: piecesDir }];
  for (const setName of ["boquan1", "boquan2", "boquan3", "boquan4"]) {
    descriptors.push({
      name: setName,
      baseDir: path.join(piecesDir, "sets", setName)
    });
  }
  return descriptors.filter((descriptor) => fs.existsSync(descriptor.baseDir));
}

async function buildTemplate(file, piece, setName) {
  const raw = await sharp(file)
    .resize(TEMPLATE_SIZE, TEMPLATE_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const patch = {
    data: raw.data,
    width: raw.info.width,
    height: raw.info.height,
    channels: raw.info.channels,
    hasAlpha: true
  };
  return {
    piece,
    side: piece === piece.toUpperCase() ? "red" : "black",
    setName,
    feature: extractGlyphFeature(patch, { template: true })
  };
}

function dataUrlToBuffer(value) {
  const text = String(value || "").trim();
  const match = text.match(/^data:image\/(?:png|jpe?g|webp);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) throw new Error("VISION_BAD_IMAGE");
  const compact = match[1].replace(/\s+/g, "");
  if (compact.length < 800 || compact.length > 8 * 1024 * 1024) throw new Error("VISION_BAD_IMAGE");
  return Buffer.from(compact, "base64");
}

function extractPatch(source, centerX, centerY, size) {
  const width = size;
  const height = size;
  const channels = 3;
  const output = Buffer.alloc(width * height * channels);
  const fallback = estimateSourceBackgroundNear(source, centerX, centerY, size);
  for (let y = 0; y < height; y++) {
    const rawSy = Math.round(centerY + y - height / 2);
    for (let x = 0; x < width; x++) {
      const rawSx = Math.round(centerX + x - width / 2);
      const dstIndex = (y * width + x) * channels;
      if (rawSx < 0 || rawSx >= source.width || rawSy < 0 || rawSy >= source.height) {
        output[dstIndex] = fallback[0];
        output[dstIndex + 1] = fallback[1];
        output[dstIndex + 2] = fallback[2];
        continue;
      }
      const srcIndex = (rawSy * source.width + rawSx) * source.channels;
      output[dstIndex] = source.data[srcIndex];
      output[dstIndex + 1] = source.data[srcIndex + 1];
      output[dstIndex + 2] = source.data[srcIndex + 2];
    }
  }
  return { data: output, width, height, channels, hasAlpha: false };
}

function estimateSourceBackgroundNear(source, centerX, centerY, size) {
  const samples = [];
  const offsets = [-0.42, -0.28, 0.28, 0.42];
  for (const oy of offsets) {
    for (const ox of offsets) {
      const sx = Math.round(centerX + ox * size);
      const sy = Math.round(centerY + oy * size);
      if (sx < 0 || sx >= source.width || sy < 0 || sy >= source.height) continue;
      const index = (sy * source.width + sx) * source.channels;
      samples.push([source.data[index], source.data[index + 1], source.data[index + 2]]);
    }
  }
  if (!samples.length) {
    const sx = clamp(Math.round(centerX), 0, source.width - 1);
    const sy = clamp(Math.round(centerY), 0, source.height - 1);
    const index = (sy * source.width + sx) * source.channels;
    return [source.data[index], source.data[index + 1], source.data[index + 2]];
  }
  return medianRgb(samples);
}

function classifyPatch(patch, model) {
  const presence = detectPiecePresence(patch);
  if (
    presence.score < 0.22 ||
    presence.bodyRatio < 0.08 ||
    (presence.fillRatio < 0.16 && presence.coreRatio < 0.22 && presence.inkRatio < 0.16)
  ) {
    return { piece: "", confidence: 0, presence };
  }

  const side = inferPieceSide(patch, presence);
  const feature = extractGlyphFeature(patch, {
    fillColor: presence.fillColor,
    centerX: presence.centerX,
    centerY: presence.centerY,
    radius: presence.radius
  });
  const candidates = side === "red" ? model.red : model.black;
  let best = null;
  let second = null;

  for (const template of candidates) {
    const distance = compareFeatures(feature, template.feature);
    if (!best || distance < best.distance) {
      second = best;
      best = { template, distance };
    } else if (!second || distance < second.distance) {
      second = { template, distance };
    }
  }

  if (!best) return { piece: "", confidence: 0, presence };
  const margin = second ? second.distance - best.distance : 0.18;
  const confidence = clamp(1 - best.distance * 1.45 + margin * 0.45 + presence.score * 0.16, 0.08, 0.98);
  if (confidence < 0.18 && presence.score < 0.22) return { piece: "", confidence, presence };
  return {
    piece: best.template.piece,
    confidence,
    presence,
    setName: best.template.setName,
    distance: best.distance
  };
}

function detectPiecePresence(patch) {
  const bg = estimatePatchBackground(patch);
  const cx = (patch.width - 1) / 2;
  const cy = (patch.height - 1) / 2;
  const radius = Math.min(patch.width, patch.height) * 0.48;
  let total = 0;
  let far = 0;
  let coreTotal = 0;
  let coreFar = 0;
  let bodyTotal = 0;
  let bodyFar = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let red = 0;
  let dark = 0;
  let light = 0;
  const fillSamples = [];

  forEachPixel(patch, (r, g, b, a, x, y) => {
    if (a < 24) return;
    const distance = Math.hypot(x - cx, y - cy);
    if (distance > radius) return;
    const lum = luminance(r, g, b);
    const colorDistance = rgbDistance([r, g, b], bg);
    const redLike = isRedPixel(r, g, b);
    const darkLike = lum < 95 && !redLike;
    const lightLike = lum > 205;
    total++;
    if (distance < radius * 0.48) {
      coreTotal++;
      if (colorDistance > 48 || redLike || darkLike) coreFar++;
    }
    if (Math.abs(x - cx) > radius * 0.16 && Math.abs(y - cy) > radius * 0.16) {
      bodyTotal++;
      if (colorDistance > 48 || redLike || darkLike) bodyFar++;
    }
    const farLike = colorDistance > 48 || redLike || darkLike;
    if (farLike) {
      far++;
      fillSamples.push([r, g, b]);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (redLike) red++;
    if (darkLike) dark++;
    if (lightLike) light++;
  });

  if (!total) return { score: 0, bg, fillColor: bg };
  const fillRatio = far / total;
  const coreRatio = coreTotal ? coreFar / coreTotal : 0;
  const bodyRatio = bodyTotal ? bodyFar / bodyTotal : 0;
  const chromaScore = (red + dark) / total;
  const score = clamp(fillRatio * 0.42 + coreRatio * 0.46 + bodyRatio * 0.62 + chromaScore * 0.22, 0, 1);
  const fillColor = fillSamples.length ? medianRgb(fillSamples) : bg;
  const hasBounds = Number.isFinite(minX) && maxX > minX && maxY > minY;
  const pieceWidth = hasBounds ? maxX - minX + 1 : 0;
  const pieceHeight = hasBounds ? maxY - minY + 1 : 0;
  const detectedRadius = hasBounds
    ? clamp(Math.max(pieceWidth, pieceHeight) * 0.52, Math.min(patch.width, patch.height) * 0.28, Math.min(patch.width, patch.height) * 0.5)
    : Math.min(patch.width, patch.height) * 0.43;
  return {
    score,
    bg,
    fillColor,
    centerX: hasBounds ? (minX + maxX) / 2 : cx,
    centerY: hasBounds ? (minY + maxY) / 2 : cy,
    radius: detectedRadius,
    fillRatio,
    coreRatio,
    bodyRatio,
    inkRatio: chromaScore,
    redRatio: red / total,
    darkRatio: dark / total,
    lightRatio: light / total
  };
}

function estimatePatchBackground(patch) {
  const samples = [];
  const marginX = Math.max(2, Math.round(patch.width * 0.14));
  const marginY = Math.max(2, Math.round(patch.height * 0.14));
  forEachPixel(patch, (r, g, b, a, x, y) => {
    if (a < 24) return;
    const inCorner = (x < marginX || x >= patch.width - marginX) && (y < marginY || y >= patch.height - marginY);
    if (inCorner) samples.push([r, g, b]);
  });
  return samples.length ? medianRgb(samples) : [180, 160, 120];
}

function inferPieceSide(patch, presence) {
  let redInk = 0;
  let blackInk = 0;
  let redFill = 0;
  let blackFill = 0;
  let total = 0;
  const fill = presence.fillColor || [160, 130, 80];
  const cx = (patch.width - 1) / 2;
  const cy = (patch.height - 1) / 2;
  const radius = Math.min(patch.width, patch.height) * 0.43;

  forEachPixel(patch, (r, g, b, a, x, y) => {
    if (a < 24 || Math.hypot(x - cx, y - cy) > radius) return;
    const lum = luminance(r, g, b);
    const distance = rgbDistance([r, g, b], fill);
    total++;
    if (isRedPixel(r, g, b)) redFill++;
    if (lum < 72 && !isRedPixel(r, g, b)) blackFill++;
    if (distance > 34) {
      if (isRedPixel(r, g, b)) redInk++;
      if (lum < 115 && !isRedPixel(r, g, b)) blackInk++;
    }
  });

  if (!total) return "black";
  const redScore = redFill * 0.8 + redInk * 1.45;
  const blackScore = blackFill * 1.05 + blackInk * 1.35;
  return redScore >= blackScore * 0.82 ? "red" : "black";
}

function extractGlyphFeature(patch, options = {}) {
  const size = FEATURE_SIZE;
  const buckets = Array.from({ length: size * size }, () => ({ value: 0, count: 0 }));
  const fill = options.fillColor || estimateMedianFill(patch, options);
  const cx = Number.isFinite(options.centerX) ? options.centerX : (patch.width - 1) / 2;
  const cy = Number.isFinite(options.centerY) ? options.centerY : (patch.height - 1) / 2;
  const radius = Number.isFinite(options.radius)
    ? options.radius
    : Math.min(patch.width, patch.height) * (options.template ? 0.41 : 0.43);
  const glyphRadius = radius * 0.72;

  forEachPixel(patch, (r, g, b, a, x, y) => {
    if (a < 34) return;
    const nx = (x - cx) / glyphRadius;
    const ny = (y - cy) / glyphRadius;
    if (nx * nx + ny * ny > 1) return;
    const distance = rgbDistance([r, g, b], fill);
    const lum = luminance(r, g, b);
    const fillLum = luminance(fill[0], fill[1], fill[2]);
    const contrast = (lum - fillLum) / 110;
    const colorContrast = distance / 130;
    const ink = distance > 32 || Math.abs(lum - fillLum) > 28;
    const signedValue = ink
      ? clamp(Math.sign(contrast || (isRedPixel(r, g, b) ? -0.45 : 0.45)) * Math.max(Math.abs(contrast), colorContrast * 0.72), -1, 1)
      : 0;
    const ix = clamp(Math.floor((nx * 0.5 + 0.5) * size), 0, size - 1);
    const iy = clamp(Math.floor((ny * 0.5 + 0.5) * size), 0, size - 1);
    const bucket = buckets[iy * size + ix];
    bucket.value += signedValue;
    bucket.count++;
  });

  return buckets.map((bucket) => bucket.count ? bucket.value / bucket.count : 0);
}

function estimateMedianFill(patch, options = {}) {
  const samples = [];
  const cx = Number.isFinite(options.centerX) ? options.centerX : (patch.width - 1) / 2;
  const cy = Number.isFinite(options.centerY) ? options.centerY : (patch.height - 1) / 2;
  const radius = Number.isFinite(options.radius)
    ? options.radius
    : Math.min(patch.width, patch.height) * (options.template ? 0.44 : 0.46);
  forEachPixel(patch, (r, g, b, a, x, y) => {
    if (a < 70) return;
    const distance = Math.hypot(x - cx, y - cy);
    if (distance > radius) return;
    samples.push([r, g, b]);
  });
  return samples.length ? medianRgb(samples) : [160, 130, 80];
}

function compareFeatures(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    total += Math.abs(diff) * 0.72 + diff * diff * 0.28;
  }
  return total / Math.max(1, a.length);
}

function forEachPixel(image, callback) {
  const channels = image.channels || 3;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const index = (y * image.width + x) * channels;
      callback(
        image.data[index],
        image.data[index + 1],
        image.data[index + 2],
        channels >= 4 ? image.data[index + 3] : 255,
        x,
        y
      );
    }
  }
}

function isRedPixel(r, g, b) {
  return r > 86 && r > g * 1.18 && r > b * 1.1 && r - Math.max(g, b) > 18;
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rgbDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function medianRgb(samples) {
  const r = [];
  const g = [];
  const b = [];
  for (const sample of samples) {
    r.push(sample[0]);
    g.push(sample[1]);
    b.push(sample[2]);
  }
  return [median(r), median(g), median(b)];
}

function median(values) {
  if (!values.length) return 0;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundConfidence(value) {
  return Math.round(clamp(Number(value) || 0, 0, 1) * 100) / 100;
}

function countTrainingImages() {
  const directory = process.env.DMAIHXCAI_VISION_TRAINING_DIR || "D:\\anhbanco";
  try {
    return fs.readdirSync(directory).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).length;
  } catch {
    return 0;
  }
}

module.exports = {
  localVisionAvailable,
  localVisionStatus,
  recognizeLocalXiangqiBoard,
  _debugGetLocalVisionModel: getLocalVisionModel,
  _debugRecognizeGridCandidate: recognizeGridCandidate,
  _debugClassifyPatch: classifyPatch,
  _debugExtractGlyphFeature: extractGlyphFeature,
  _debugCompareFeatures: compareFeatures,
  _debugDetectPiecePresence: detectPiecePresence,
  _debugExtractPatch: extractPatch
};
