import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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
    const node = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);

    for (const statement of node.statements) {
      if (
        (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        checkImport(file, statement.moduleSpecifier.text, sourceRoot.kind);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Architecture boundaries: OK");
