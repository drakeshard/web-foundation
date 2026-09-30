import type {
  PersistenceDiagnostic,
  PersistenceFailure,
  PersistenceResult,
} from "./contracts.js";

export function persistenceFailureResult(
  kind: PersistenceFailure["kind"],
  operation: PersistenceFailure["operation"],
  cause?: unknown,
): PersistenceResult<never> {
  const diagnostic = persistenceDiagnostic(cause);

  return diagnostic
    ? { ok: false, error: { kind, operation, diagnostic } }
    : { ok: false, error: { kind, operation } };
}

export function persistenceFailureMessage(
  kind: PersistenceFailure["kind"],
  operation: PersistenceFailure["operation"],
  message: string,
): PersistenceResult<never> {
  return {
    ok: false,
    error: {
      kind,
      operation,
      diagnostic: { message },
    },
  };
}

export function persistenceDiagnostic(cause: unknown): PersistenceDiagnostic | undefined {
  if (!(cause instanceof Error)) {
    return undefined;
  }

  return {
    name: cause.name,
    message: cause.message,
  };
}
