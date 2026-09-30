# Dependency Policy

Every new dependency requires an explicit justification covering:

1. problem solved;
2. why the browser/platform or trivial local code is insufficient;
3. runtime or development scope;
4. transitive dependency count;
5. license;
6. maintenance status;
7. bundle/runtime impact;
8. replacement cost;
9. security exposure.

Rules:

- exact versions in package manifests;
- committed `pnpm-lock.yaml`;
- frozen-lockfile CI;
- prefer small, mature, zero/few-dependency libraries;
- do not add packages to avoid trivial utilities;
- unusual install/postinstall behavior requires additional review;
- no secrets in browser code or repository history.
