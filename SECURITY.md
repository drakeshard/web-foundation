# Security Policy

## Scope

This policy applies to source code, build configuration, dependencies, CI workflows, and release artifacts in this repository.

## Requirements

- Secrets must not be committed to source control or embedded in browser-delivered code.
- External data, save data, configuration, URL-derived values, and future user-generated content must be treated as untrusted input.
- Dependency versions must be locked and CI must use frozen installs.
- New dependencies require vulnerability, license, maintenance, and lifecycle-script review.
- GitHub Actions workflows must use least-privilege permissions.
- Security-sensitive changes require tests that cover the corrected behavior when reproducible.

## Reporting a vulnerability

Do not report suspected vulnerabilities in public issues.

Use GitHub private vulnerability reporting when enabled. If private reporting is unavailable, contact the repository owner through a private channel.

## Disclosure

Security fixes and release notes must avoid publishing exploit-enabling detail before a remediation is available to affected consumers.
