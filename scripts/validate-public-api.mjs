import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const baselinePath = path.join(root, "docs", "release", "public-api-baseline.json");

const packageSpecs = {
  foundation: path.join(root, "packages", "foundation"),
  testing: path.join(root, "packages", "testing"),
};

export function comparePublicApiSnapshots(expected, actual) {
  const expectedText = stableStringify(expected);
  const actualText = stableStringify(actual);
  if (expectedText === actualText) return [];

  const differences = [];
  const packageKeys = new Set([
    ...Object.keys(expected?.packages ?? {}),
    ...Object.keys(actual?.packages ?? {}),
  ]);

  for (const packageKey of [...packageKeys].sort()) {
    const expectedPackage = expected?.packages?.[packageKey];
    const actualPackage = actual?.packages?.[packageKey];

    if (!expectedPackage || !actualPackage) {
      differences.push(
        `${packageKey}: package baseline ${expectedPackage ? "removed" : "added"}`,
      );
      continue;
    }

    if (expectedPackage.name !== actualPackage.name) {
      differences.push(
        `${packageKey}: package name changed from ${expectedPackage.name} to ${actualPackage.name}`,
      );
    }

    collectObjectDiff(
      differences,
      `${packageKey}: export map`,
      expectedPackage.exports,
      actualPackage.exports,
    );

    const subpaths = new Set([
      ...Object.keys(expectedPackage.symbols ?? {}),
      ...Object.keys(actualPackage.symbols ?? {}),
    ]);
    for (const subpath of [...subpaths].sort()) {
      collectArrayDiff(
        differences,
        `${packageKey} ${subpath}: public symbols`,
        expectedPackage.symbols?.[subpath] ?? [],
        actualPackage.symbols?.[subpath] ?? [],
      );
    }
  }

  return differences;
}

export function createPublicApiSnapshot(repositoryRoot = root) {
  const packages = {};

  for (const [key, packageDir] of Object.entries(packageSpecsForRoot(repositoryRoot))) {
    const manifest = readJson(path.join(packageDir, "package.json"));
    const exportMap = normalizeExportMap(manifest.exports ?? {});
    const symbols = {};

    for (const [subpath, entry] of Object.entries(exportMap)) {
      assert(typeof entry.types === "string", `${manifest.name} ${subpath}: missing types target`);
      const declarationPath = path.resolve(packageDir, entry.types);
      assert(
        fs.existsSync(declarationPath),
        `${manifest.name} ${subpath}: declaration target missing: ${entry.types}; run pnpm build first`,
      );
      symbols[subpath] = readExportedSymbols(declarationPath);
    }

    packages[key] = {
      name: manifest.name,
      exports: exportMap,
      symbols,
    };
  }

  return { schemaVersion: 1, packages };
}

function main() {
  const write = process.argv.includes("--write");
  const unknown = process.argv.slice(2).filter((argument) => argument !== "--write");
  assert(unknown.length === 0, `unknown arguments: ${unknown.join(", ")}`);

  const actual = createPublicApiSnapshot();

  if (write) {
    fs.writeFileSync(baselinePath, `${stableStringify(actual)}\n`);
    console.log(`Public API baseline updated: ${path.relative(root, baselinePath)}`);
    return;
  }

  assert(
    fs.existsSync(baselinePath),
    `public API baseline missing: ${path.relative(root, baselinePath)}`,
  );
  const expected = readJson(baselinePath);
  const differences = comparePublicApiSnapshots(expected, actual);

  if (differences.length > 0) {
    throw new Error(
      [
        "Public API/export surface drift detected.",
        ...differences.map((difference) => `- ${difference}`),
        "If this change is intentional and approved, run pnpm build && node scripts/validate-public-api.mjs --write and review the baseline diff.",
      ].join("\n"),
    );
  }

  console.log("Public API/export baseline validation: OK");
}

function packageSpecsForRoot(repositoryRoot) {
  return {
    foundation: path.join(repositoryRoot, "packages", "foundation"),
    testing: path.join(repositoryRoot, "packages", "testing"),
  };
}

function readExportedSymbols(declarationPath) {
  const program = ts.createProgram({
    rootNames: [declarationPath],
    options: {
      allowJs: false,
      declaration: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      skipLibCheck: false,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert(
    diagnostics.length === 0,
    `${declarationPath}: TypeScript declaration diagnostics:\n${formatDiagnostics(diagnostics)}`,
  );

  const sourceFile = program.getSourceFile(declarationPath);
  assert(sourceFile, `${declarationPath}: declaration source file unavailable`);
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  assert(moduleSymbol, `${declarationPath}: declaration module symbol unavailable`);

  return checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol) => symbol.getName())
    .filter((name) => name !== "default")
    .sort();
}

function normalizeExportMap(exportsField) {
  const normalized = {};
  for (const subpath of Object.keys(exportsField).sort()) {
    const entry = exportsField[subpath];
    assert(entry && typeof entry === "object" && !Array.isArray(entry), `${subpath}: invalid export entry`);
    normalized[subpath] = {};
    for (const condition of ["types", "import"]) {
      if (entry[condition] !== undefined) normalized[subpath][condition] = entry[condition];
    }
  }
  return normalized;
}

function collectObjectDiff(differences, label, expected, actual) {
  if (stableStringify(expected) !== stableStringify(actual)) {
    differences.push(
      `${label} changed from ${JSON.stringify(expected)} to ${JSON.stringify(actual)}`,
    );
  }
}

function collectArrayDiff(differences, label, expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const removed = expected.filter((item) => !actualSet.has(item));
  const added = actual.filter((item) => !expectedSet.has(item));
  if (removed.length > 0) differences.push(`${label} removed: ${removed.join(", ")}`);
  if (added.length > 0) differences.push(`${label} added: ${added.join(", ")}`);
}

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => root,
    getNewLine: () => "\n",
  });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function stableStringify(value) {
  return JSON.stringify(sortRecursively(value), null, 2);
}

function sortRecursively(value) {
  if (Array.isArray(value)) return [...value].sort();
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortRecursively(child)]),
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main();
}
