# Application-local validation boundary

## Status

Accepted Sprint 04 guidance after S04-01 / #45.

Web Foundation v0.1 does **not** expose a shared `Decoder<T>` or `DecodeResult<T>` runtime contract. No current consumer demonstrated that a Foundation wrapper provides a concrete compatibility, maintenance, or operational benefit over application-local validation.

## Default rule

Untrusted JSON/content must be validated before it enters authoritative game/domain state, but the validation implementation is application-owned by default.

Applications may use:

- a local custom validator;
- Zod;
- Valibot;
- another application-selected validator.

Those libraries and their error types stay outside Foundation runtime/public types unless a future admission review demonstrates a concrete shared boundary that requires otherwise.

## Example

`examples/application-local-validation.ts` demonstrates the intended boundary:

1. untrusted input enters an application-owned decode function;
2. the local validator returns either a typed value or local readable errors;
3. authoritative domain entry receives only the validated typed value;
4. invalid data is rejected before domain entry.

The example deliberately does not create a shared schema package, Foundation decoder abstraction, or validator dependency.

## Error ownership

Readable/structured validation errors are also application-owned while no shared decoder contract exists. Applications may choose path/category/message shapes appropriate to their validator and UI needs.

Foundation's existing persistence failures remain infrastructure failures; they are not a generic content-validation error framework.

## Future admission

A shared decoder contract may be reconsidered only when a current consumer identifies:

- the concrete integration problem;
- why application-local validation is insufficient;
- the shared compatibility or maintenance benefit;
- runtime/dependency/maintenance cost;
- the narrowest viable shared contract.

Genericity or potential reuse is not sufficient.
