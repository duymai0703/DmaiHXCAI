const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const ACCESS_KEYS_FILE = path.join(ROOT, "analysis-app", "access-keys.json");
const DATA_DIR = path.join(ROOT, "analysis-app", "data");
const EXPORT_FILE = path.join(DATA_DIR, `license-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
const COUNT = 100;

function sanitizeAccessKey(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 64);
}

function hashLicenseKey(value) {
  const key = sanitizeAccessKey(value);
  return crypto.createHash("sha256").update(`dmaihxcai-license:${key}`).digest("hex");
}

function randomSegment(size) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const bytes = crypto.randomBytes(size * 2);
  for (let index = 0; index < size; index += 1) {
    result += alphabet[bytes[index] % alphabet.length];
  }
  return result;
}

function createKey(index) {
  return [
    "HXC",
    String(index).padStart(3, "0"),
    randomSegment(6),
    randomSegment(6),
    randomSegment(6)
  ].join("-");
}

function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const rawKeys = [];
  const hashes = new Set();
  while (rawKeys.length < COUNT) {
    const key = createKey(rawKeys.length + 1);
    const keyHash = hashLicenseKey(key);
    if (hashes.has(keyHash)) continue;
    hashes.add(keyHash);
    rawKeys.push({ slot: rawKeys.length + 1, key, keyHash });
  }

  const catalog = {
    version: 2,
    generatedAt: new Date().toISOString(),
    adminKeyHash: hashLicenseKey(process.env.DMAIHXCAI_ADMIN_ACCESS_KEY || "ADTAYDOC0703DUY"),
    adminName: "Admin",
    licenses: rawKeys.map((entry) => ({
      id: `lic-${String(entry.slot).padStart(3, "0")}`,
      slot: entry.slot,
      keyHash: entry.keyHash,
      status: "unused",
      customerName: "",
      activatedAt: "",
      expiresAt: ""
    }))
  };

  const exportData = {
    generatedAt: catalog.generatedAt,
    note: "File nay chua key goc de Admin phan phoi. Khong commit cong khai.",
    keys: rawKeys.map(({ slot, key }) => ({ slot, key }))
  };

  fs.writeFileSync(ACCESS_KEYS_FILE, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.writeFileSync(EXPORT_FILE, `${JSON.stringify(exportData, null, 2)}\n`);
  console.log(`Generated ${COUNT} license keys.`);
  console.log(`Server hash catalog: ${ACCESS_KEYS_FILE}`);
  console.log(`Admin raw-key export: ${EXPORT_FILE}`);
}

main();
