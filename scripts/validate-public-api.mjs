import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const baselinePath = path.join(root, "docs", "release", "public-api-baseline.json");

export function comparePublicApiSnapshots(expected, actual) {
  const differences = [];

  if (expected?.schemaVersion !== actual?.schemaVersion) {
    differences.push(
      `schema version changed from ${expected?.schemaVersion} to ${actual?.schemaVersion}`,
    );
  }
  const packageKeys = new Set([
    ...Object.keys(expected?.packages ?? {}),
    ...Object.keys(actual?.packages ?? {}),
  ]);

  for (const packageKey of [...packageKeys].sort()) {
    const expectedPackage = expected?.packages?.[packageKey];
    const actualPackage = actual?.packages?.[packageKey];

    if (!expectedPackage || !actualPackage) {
      differences.push(`${packageKey}: package baseline ${expectedPackage ? "removed" : "added"}`);
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
    const exportMap = manifest.exports ?? {};
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
    fs.writeFileSync(baselinePath, `${JSON.stringify(actual, null, 2)}\n`);
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
  return readDeclarationExports(fs.readFileSync(declarationPath, "utf8"), declarationPath);
}

export function readDeclarationExports(sourceText, label = "declaration") {
  const source = sourceText
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  assert(
    !/\bexport\s+(?:type\s+)?\*\s+from\b/.test(source),
    `${label}: wildcard exports are unsupported in public entrypoints; use explicit named exports`,
  );
  assert(
    !/\bexport\s+(?:default\b|=\s*|as\s+namespace\b)/.test(source),
    `${label}: unsupported public export form`,
  );

  const symbols = new Set();
  const namedExportPattern =
    /\bexport\s+(?:type\s+)?\{([\s\S]*?)\}\s*(?:from\s+["\'][^"\']+["\'])?\s*;/g;

  for (const match of source.matchAll(namedExportPattern)) {
    for (const rawSpecifier of match[1].split(",")) {
      let specifier = rawSpecifier.trim();
      if (!specifier) continue;
      specifier = specifier.replace(/^type\s+/, "").trim();

      const aliasParts = specifier.split(/\s+as\s+/);
      assert(aliasParts.length <= 2, `${label}: invalid export specifier: ${specifier}`);
      const publicName = (aliasParts[1] ?? aliasParts[0]).trim();
      assert(
        /^[A-Za-z_$][\w$]*$/.test(publicName),
        `${label}: unsupported exported name: ${publicName}`,
      );
      symbols.add(publicName);
    }
  }

  const directExportPattern =
    /\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:class|function|interface|type|enum|namespace|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(directExportPattern)) {
    symbols.add(match[1]);
  }

  return [...symbols].sort();
}

function collectObjectDiff(differences, label, expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main();
}
