# Rule: Code Style & Readability

> Scope: All source code in this monorepo (`apps/**`, `packages/**`).
> Source: Constitution §I + global user rules.

## Naming Conventions

- Use **descriptive, intention-revealing names**. Prefer `calculateTotalRevenue` over `calcTr`.
- Avoid cryptic abbreviations. Names should be readable without a dictionary.
- Use **camelCase** for variables and functions, **PascalCase** for classes and interfaces, **UPPER_SNAKE_CASE** for constants.
- No "magic numbers" or "magic strings" inline — extract them as named constants.

## Function Design

- **Single Responsibility Principle (SRP)**: Every function does one thing only. If you need to describe a function with "and", split it.
- Functions must be **small and focused** — ideally under 20 lines. Complexity is a defect.
- Prefer **pure functions** with explicit inputs and outputs over functions with hidden side effects.
- Prefer **returning new values** over mutating arguments or shared state.

## TypeScript Typing

- **No `any`**. Use specific types, interfaces, or generics.
- Define **interfaces for all data structures** that cross function or module boundaries.
- All function parameters and return types must be explicitly typed.
- Use `unknown` instead of `any` when the type is genuinely unknown, then narrow it explicitly.

## Comments Policy

- Code must be **self-documenting through clear naming**. Comments that restate what the code does are noise and must be removed.
- Only acceptable comments: explaining **why** a non-obvious decision was made (the rationale, not the mechanics).
- **No commented-out code** in commits. Use version control (git) for history.
- JSDoc comments are required for all **public API functions** in shared packages.

## DRY (Don't Repeat Yourself)

- Duplicate logic is a defect. Extract shared logic into utilities or shared packages.
- Before writing new code, check if it already exists in `packages/shared-*`.
- When adding a helper that could be reused, place it in the appropriate shared package.

## Module Structure

- Every service MUST follow the same directory layout established by `packages/service-template`.
- Keep imports organized: external packages first, then internal monorepo packages, then local files.
- Avoid deep relative import chains (more than 2 levels `../../..`). Use path aliases where supported.
