import type { PersistenceFailure } from "../contracts.js";

export type BrowserStorageFallbackFailure =
  | "read-failed"
  | "write-failed"
  | "delete-failed"
  | "list-failed";

export function classifyBrowserStorageFailure(
  error: unknown,
  fallback: BrowserStorageFallbackFailure,
): PersistenceFailure["kind"] {
  if (hasErrorName(error, "QuotaExceededError")) {
    return "quota-exceeded";
  }

  if (
    hasErrorName(error, "SecurityError") ||
    hasErrorName(error, "InvalidStateError") ||
    hasErrorName(error, "NotAllowedError")
  ) {
    return "storage-unavailable";
  }

  return fallback;
}

function hasErrorName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}
