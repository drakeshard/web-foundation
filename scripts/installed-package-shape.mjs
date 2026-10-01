import fs from "node:fs";
import path from "node:path";

export function findInstalledPackageShapeViolations(
  packageDir,
  { expectedName, expectedVersion, expectedExports },
) {
  const violations = [];
  const manifestPath = path.join(packageDir, "package.json");

  if (!fs.existsSync(manifestPath)) {
    return [`${expectedName}: installed manifest missing`];
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    return [`${expectedName}: installed manifest is not valid JSON: ${formatError(error)}`];
  }

  if (manifest.name !== expectedName) {
    violations.push(`${expectedName}: installed name mismatch`);
  }
  if (manifest.version !== expectedVersion) {
    violations.push(
      `${expectedName}: installed version ${String(manifest.version)} does not match ${expectedVersion}`,
    );
  }

  const exportKeys = Object.keys(manifest.exports ?? {});
  if (JSON.stringify(exportKeys) !== JSON.stringify(expectedExports)) {
    violations.push(
      `${expectedName}: installed export surface mismatch: ${JSON.stringify(exportKeys)}`,
    );
  }

  if (!fs.existsSync(path.join(packageDir, "dist"))) {
    violations.push(`${expectedName}: dist missing`);
  }
  if (!fs.existsSync(path.join(packageDir, "README.md"))) {
    violations.push(`${expectedName}: README missing from package`);
  }
  if (!fs.existsSync(path.join(packageDir, "LICENSE"))) {
    violations.push(`${expectedName}: LICENSE missing from package`);
  }
  if (manifest.license !== "Apache-2.0") {
    violations.push(`${expectedName}: license metadata mismatch`);
  }
  if (manifest.publishConfig?.access !== "public") {
    violations.push(`${expectedName}: public npm publish configuration missing`);
  }
  if (JSON.stringify(manifest).includes("workspace:")) {
    violations.push(`${expectedName}: workspace protocol leaked into installed manifest`);
  }
  if (fs.existsSync(path.join(packageDir, "src"))) {
    violations.push(`${expectedName}: source files leaked into package`);
  }
  if (fs.existsSync(path.join(packageDir, "dist", "index.js"))) {
    violations.push(`${expectedName}: obsolete root runtime artifact leaked`);
  }
  if (fs.existsSync(path.join(packageDir, "dist", "index.d.ts"))) {
    violations.push(`${expectedName}: obsolete root type artifact leaked`);
  }

  for (const subpath of expectedExports) {
    const entry = manifest.exports?.[subpath];
    if (!entry || typeof entry !== "object") {
      violations.push(`${expectedName} ${subpath}: missing export entry`);
      continue;
    }

    for (const condition of ["types", "import"]) {
      const target = entry[condition];
      if (typeof target !== "string") {
        violations.push(`${expectedName} ${subpath}: missing ${condition} target`);
        continue;
      }

      if (!fs.existsSync(path.resolve(packageDir, target))) {
        violations.push(
          `${expectedName} ${subpath}: installed ${condition} target does not exist: ${target}`,
        );
      }
    }
  }

  return violations;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
