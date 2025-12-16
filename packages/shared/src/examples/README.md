# Type Inference Examples

This directory contains demonstration files that serve as verification artifacts for schema and type implementations.

## Files

### type-inference-demo.ts

Verification artifact for **Task 4.3: Schema & Type Implementation**.

Demonstrates that TypeScript correctly infers types from Zod schemas, including:
- Type inference from schema validation (`z.infer`)
- Compile-time type checking
- Type safety for all schema definitions
- Enum type inference
- Partial schema transformations
- Array type inference

**Verification Command:**
```bash
pnpm -F @radio-inventar/shared typecheck
```

This file is intentionally executable but not included in the build output. It serves as a living proof that the type system works correctly.
