#!/usr/bin/env node
/**
 * Lint community workflow examples under examples/.
 *
 * For every examples/<id>/ directory (excluding TEMPLATE) it checks:
 *   - README.md exists with frontmatter containing the required fields
 *   - frontmatter id matches the directory name
 *   - category is one of the allowed values
 *   - features is a non-empty list
 *   - workflow.yml exists and looks like an Astron DSL (has flowData/flowMeta)
 *   - workflow.yml contains no embedded secrets (api keys, tokens, app ids)
 *
 * Dependency-free: runs on a clean Node (>= 18). Exits non-zero on any violation.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EXAMPLES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["TEMPLATE", "scripts"]);
const REQUIRED = ["id", "title", "description", "category", "features", "author", "dslVersion"];
const CATEGORIES = new Set([
  "productivity",
  "creative",
  "learning",
  "entertainment",
  "health",
  "finance",
  "other"
]);

// Lines that look like a live credential rather than a YOUR_* placeholder.
const SECRET_PATTERNS = [
  /^\s*apiKey:\s*(?!YOUR_)[A-Za-z0-9]{8,}/m,
  /^\s*apiSecret:\s*(?!YOUR_)[A-Za-z0-9+/=]{8,}/m,
  /^\s*appId:\s*(?!YOUR_)[A-Za-z0-9]{6,}/m,
  /\bsk-[A-Za-z0-9]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}\b/
];

/** Minimal frontmatter parser for our controlled template (key: value + simple lists). */
function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const data = {};
  let currentList = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && currentList) {
      data[currentList].push(item[1].trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kv) {
      const [, key, val] = kv;
      if (val === "") {
        data[key] = [];
        currentList = key;
      } else {
        data[key] = val.replace(/^["']|["']$/g, "");
        currentList = null;
      }
    }
  }
  return data;
}

const errors = [];
let checked = 0;

for (const name of readdirSync(EXAMPLES_DIR)) {
  if (SKIP.has(name)) continue;
  const dir = join(EXAMPLES_DIR, name);
  if (!statSync(dir).isDirectory()) continue;
  checked++;
  const fail = (msg) => errors.push(`examples/${name}: ${msg}`);

  const readmePath = join(dir, "README.md");
  const workflowPath = join(dir, "workflow.yml");

  if (!existsSync(readmePath)) {
    fail("missing README.md");
  } else {
    const fm = parseFrontmatter(readFileSync(readmePath, "utf8"));
    if (!fm) {
      fail("README.md has no YAML frontmatter");
    } else {
      for (const field of REQUIRED) {
        if (fm[field] === undefined || (Array.isArray(fm[field]) && fm[field].length === 0) || fm[field] === "") {
          fail(`frontmatter missing required field: ${field}`);
        }
      }
      if (fm.id && fm.id !== name) fail(`frontmatter id "${fm.id}" does not match directory name "${name}"`);
      if (fm.category && !CATEGORIES.has(fm.category)) {
        fail(`category "${fm.category}" is not one of: ${[...CATEGORIES].join(", ")}`);
      }
    }
  }

  if (!existsSync(workflowPath)) {
    fail("missing workflow.yml");
  } else {
    const yml = readFileSync(workflowPath, "utf8");
    if (!/flowData|flowMeta/.test(yml)) {
      fail("workflow.yml does not look like an Astron DSL export (no flowData/flowMeta)");
    }
    for (const re of SECRET_PATTERNS) {
      if (re.test(yml)) {
        fail(`workflow.yml appears to contain a secret (${re}). Replace it with a YOUR_* placeholder.`);
        break;
      }
    }
  }
}

if (errors.length) {
  console.error(`✗ examples lint failed (${errors.length} issue(s) across ${checked} example(s)):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ examples lint passed (${checked} example(s) checked).`);
