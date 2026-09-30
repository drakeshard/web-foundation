export interface ExampleProfile {
  readonly displayName: string;
  readonly difficulty: "easy" | "normal" | "hard";
}

export type ProfileDecodeResult =
  | { readonly ok: true; readonly value: ExampleProfile }
  | {
      readonly ok: false;
      readonly errors: readonly {
        readonly path: string;
        readonly message: string;
      }[];
    };

export function decodeExampleProfile(input: unknown): ProfileDecodeResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ path: "$", message: "Expected an object." }],
    };
  }

  const errors: { path: string; message: string }[] = [];

  if (typeof input.displayName !== "string" || input.displayName.length === 0) {
    errors.push({
      path: "$.displayName",
      message: "Expected a non-empty string.",
    });
  }

  if (input.difficulty !== "easy" && input.difficulty !== "normal" && input.difficulty !== "hard") {
    errors.push({
      path: "$.difficulty",
      message: 'Expected "easy", "normal", or "hard".',
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      displayName: input.displayName as string,
      difficulty: input.difficulty as ExampleProfile["difficulty"],
    },
  };
}

export function enterExampleDomain(input: unknown): ExampleProfile {
  const decoded = decodeExampleProfile(input);
  if (!decoded.ok) {
    throw new Error("Invalid example profile data.");
  }

  return decoded.value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
