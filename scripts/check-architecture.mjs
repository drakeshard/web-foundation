import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = [{ kind: "foundation", dir: path.join(root, "packages/foundation/src") }];

const appsDir = path.join(root, "apps");
if (fs.existsSync(appsDir)) {
  for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    sourceRoots.push({
      kind: "domain",
      dir: path.join(appsDir, entry.name, "src/domain"),
    });
  }
}

const forbiddenPackages = new Set(["phaser", "playcanvas", "preact", "@preact/signals"]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);
const violations = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(absolute);
  }

  return files;
}

function packageRoot(specifier) {
  if (specifier.startsWith("@")) {
    return specifier.split("/").slice(0, 2).join("/");
  }

  return specifier.split("/")[0];
}

function stripComments(source) {
  let result = "";
  let index = 0;
  let state = "code";

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      if (current === "\n") {
        state = "code";
        result += current;
      } else {
        result += " ";
      }
      index += 1;
      continue;
    }

    if (state === "block-comment") {
      if (current === "*" && next === "/") {
        result += "  ";
        state = "code";
        index += 2;
      } else {
        result += current === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }

    if (current === "/" && next === "/") {
      result += "  ";
      state = "line-comment";
      index += 2;
      continue;
    }

    if (current === "/" && next === "*") {
      result += "  ";
      state = "block-comment";
      index += 2;
      continue;
    }

    result += current;
    index += 1;
  }

  return result;
}

function collectSpecifiers(source) {
  const cleaned = stripComments(source);
  const specifiers = [];

  const patterns = [
    /^\s*import\s+(?:type\s+)?(?:[^"'\n]+?\s+from\s+)?["']([^"']+)["']/gm,
    /^\s*export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/gm,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of cleaned.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function checkImport(file, specifier, kind) {
  if (forbiddenPackages.has(packageRoot(specifier))) {
    violations.push(`${path.relative(root, file)}: ${kind} code must not import "${specifier}"`);
    return;
  }

  if (!specifier.startsWith(".")) return;

  const resolved = path.resolve(path.dirname(file), specifier);
  const normalized = resolved.split(path.sep).join("/");

  if (normalized.includes("/presentation/") || normalized.includes("/ui/")) {
    violations.push(
      `${path.relative(root, file)}: ${kind} code must not depend on presentation/UI path "${specifier}"`,
    );
  }

  if (kind === "foundation" && normalized.includes("/apps/")) {
    violations.push(
      `${path.relative(root, file)}: foundation code must not depend on application path "${specifier}"`,
    );
  }
}

for (const sourceRoot of sourceRoots) {
  for (const file of walk(sourceRoot.dir)) {
    const source = fs.readFileSync(file, "utf8");

    for (const specifier of collectSpecifiers(source)) {
      checkImport(file, specifier, sourceRoot.kind);
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Architecture boundaries: OK");
