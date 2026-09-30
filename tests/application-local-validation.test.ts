import { describe, expect, it } from "vitest";
import {
  decodeExampleProfile,
  enterExampleDomain,
} from "../examples/application-local-validation.js";

describe("application-local validation boundary", () => {
  it("admits validated data before domain entry", () => {
    const input: unknown = {
      displayName: "Rook",
      difficulty: "hard",
    };

    expect(decodeExampleProfile(input)).toEqual({
      ok: true,
      value: {
        displayName: "Rook",
        difficulty: "hard",
      },
    });

    expect(enterExampleDomain(input)).toEqual({
      displayName: "Rook",
      difficulty: "hard",
    });
  });

  it("rejects untrusted data before domain entry with readable local errors", () => {
    const input: unknown = {
      displayName: "",
      difficulty: "nightmare",
    };

    expect(decodeExampleProfile(input)).toEqual({
      ok: false,
      errors: [
        {
          path: "$.displayName",
          message: "Expected a non-empty string.",
        },
        {
          path: "$.difficulty",
          message: 'Expected "easy", "normal", or "hard".',
        },
      ],
    });

    expect(() => enterExampleDomain(input)).toThrow("Invalid example profile data.");
  });
});
