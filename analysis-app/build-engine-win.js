const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(SRC, "pikafish.exe");
const CXX = process.env.CXX || "clang++";
const BUILD = path.join(ROOT, "analysis-app", ".engine-build", CXX.replace(/[^a-z0-9_.-]+/gi, "_"));

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(SRC, full).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (rel === "universal" || rel === "temp_builds") continue;
      walk(full, files);
    } else if (/\.(cpp|S)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const sources = walk(SRC);
const commonFlags = [
  "-std=c++17",
  "-DNDEBUG",
  "-DIS_64BIT",
  "-DARCH=x86_64",
  "-DNO_PREFETCH",
  "-Wall",
  "-Wcast-qual",
  "-fno-exceptions"
];
if (CXX.includes("clang")) commonFlags.push("-fconstexpr-steps=500000000");
else commonFlags.push("-fconstexpr-ops-limit=500000000");
const linkFlags = [
  "-pthread",
  "-lwinpthread",
  "-lws2_32"
];

fs.mkdirSync(BUILD, { recursive: true });

function objectPath(source) {
  const rel = path.relative(SRC, source).replace(/[\\/]/g, "__");
  return path.join(BUILD, rel.replace(/\.(cpp|S)$/i, ".o"));
}

function isFresh(source, object) {
  if (!fs.existsSync(object)) return false;
  return fs.statSync(object).mtimeMs >= fs.statSync(source).mtimeMs;
}

function run(args) {
  const result = spawnSync(CXX, args, { cwd: SRC, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

function optimizeFlags(source) {
  const rel = path.relative(SRC, source).replace(/\\/g, "/");
  if (rel.startsWith("nnue/features/")) return ["-O0"];
  if (rel === "evaluate.cpp") return ["-O1"];
  if (rel.startsWith("nnue/")) return ["-O2"];
  return ["-O3"];
}

const objects = [];
console.log(`Compiling ${sources.length} source files with ${CXX}`);
for (const source of sources) {
  const object = objectPath(source);
  objects.push(object);
  if (isFresh(source, object)) {
    console.log(`fresh ${path.relative(SRC, source)}`);
    continue;
  }
  console.log(`compile ${path.relative(SRC, source)}`);
  run(["-c", source, "-o", object, ...optimizeFlags(source), ...commonFlags]);
}

console.log(`link ${OUT}`);
run(["-o", OUT, ...objects, "-O2", ...commonFlags, ...linkFlags]);
console.log(`Built ${OUT}`);
