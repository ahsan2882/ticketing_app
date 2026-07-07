# Common Package Documentation Instructions

## Scope

- Common package source is referenced as `@common`.
- Do not inspect or modify any `node_modules` directory.
- This package provides shared code used by the VenuePass services.
- When documenting behavior, verify it directly from `@common` source, package scripts, tests, exports, and type definitions.

## README Rules

- The only permitted file edit for this documentation task is `@common/README.md`.
- Read any existing `@common/README.md` before editing it.
- Preserve content that is accurate and still useful.
- Verify claims from source code, tests, package scripts, TypeScript configuration, and package exports.
- Do not infer or invent undocumented behavior.
- Do not document service-specific behavior unless it is directly represented in `@common`.
- Use `@common`-style paths in README documentation where practical.

## README Sections

Document only code-supported details:

- Package purpose and role in the VenuePass system.
- Important exports, shared types, events, errors, middlewares, utilities, and constants.
- Tech stack and important dependencies.
- Important folder structure.
- Install, development, build, lint, and test commands.
- How services consume the package.
- Versioning, publishing, or local development workflow when present.
- Testing approach and known limitations when present.

## Section-by-Section Workflow

- Update only one README section in each turn.
- After a non-final section update, state:
  1. the section updated;
  2. a brief summary;
  3. remaining sections;
  4. `Say continue to update the next section.`
- Do not update another section until the user explicitly says `continue`.
- On a later turn, determine progress from the current README before selecting the next unfinished section.
- When every planned, code-supported section is complete, respond with exactly:

update README successful
