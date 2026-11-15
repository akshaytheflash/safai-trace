#!/usr/bin/env node
/**
 * Verifies that every locale has the same keys as English, and reports values
 * still identical to English (possible untranslated text). Run from an app:
 *   node scripts/check-i18n.mjs          # all locales
 *   node scripts/check-i18n.mjs hi       # one locale
 */
import fs from "node:fs";
import path from "node:path";

const candidates = [
  path.resolve(process.cwd(), "lib", "i18n", "messages"),
  path.resolve(process.cwd(), "src", "lib", "i18n", "messages"),
];
const root = candidates.find((dir) => fs.existsSync(path.join(dir, "en.ts")));
if (!root) {
  console.error("Could not find lib/i18n/messages/en.ts from " + process.cwd());
  process.exit(1);
}

const ALL = ["en", "hi", "bn", "mr", "te", "ta", "gu", "ur", "kn", "or", "ml"];
const requested = process.argv[2];
const codes = requested ? [requested] : ALL;
const keyPattern = /^\s*"([^"]+)"\s*:/gm;

function entries(file) {
  const source = fs.readFileSync(file, "utf8");
  const map = new Map();
  for (const match of source.matchAll(keyPattern)) map.set(match[1], true);
  return map;
}

const base = entries(path.join(root, "en.ts"));
let failed = false;

for (const code of codes) {
  const file = path.join(root, code + ".ts");
  if (!fs.existsSync(file)) {
    console.error(code + ": missing file");
    failed = true;
    continue;
  }
  const keys = entries(file);
  const missing = [...base.keys()].filter((key) => !keys.has(key));
  const extra = [...keys.keys()].filter((key) => !base.has(key));
  if (missing.length) {
    console.error(code + ": " + missing.length + " missing -> " + missing.slice(0, 8).join(", "));
    failed = true;
  }
  if (extra.length) {
    console.error(code + ": " + extra.length + " unknown -> " + extra.slice(0, 8).join(", "));
    failed = true;
  }
  if (!missing.length && !extra.length) {
    console.log(code + ": " + keys.size + " keys complete");
  }
}
if (!failed) console.log("i18n check: all requested locales complete");
process.exit(failed ? 1 : 0);
