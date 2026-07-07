# Payments Service Documentation Instructions

## Scope

- Payments service source is referenced as `@payments`.
- The local shared package is referenced as `@common`.
- Infrastructure files are referenced as `@infra`.
- Do not inspect or modify any `node_modules` directory.
- When `@venuepass/common` behavior must be understood, inspect `@common`.
- When service behavior depends on Stripe, another service, event, database, or backend contract, inspect the relevant local source or configuration. Do not guess.

## README Rules

- The only permitted file edit for this documentation task is `@payments/README.md`.
- Read any existing `@payments/README.md` before editing it.
- Preserve content that is accurate and still useful.
- Verify claims from source, tests, package scripts, Dockerfile, TypeScript configuration, database models, payment integration code, and relevant infrastructure configuration.
- Inspect relevant files under `@infra/k8s/` and `@skaffold.yaml` when documenting deployment or runtime behavior.
- Do not infer or invent undocumented behavior.
- Do not expose real secrets, webhook secrets, private keys, or credentials in the README.
- Use `@payments`-style paths in README documentation where practical.

## README Sections

Document only code-supported details:

- Service purpose and role in the VenuePass system.
- Main payment workflows.
- Tech stack and important dependencies.
- Important folder structure.
- Environment variables and runtime dependencies, with secrets described by name only.
- Install, development, build, lint, test, and start commands.
- API routes, request/response behavior, authentication, and validation.
- Stripe integration, webhook behavior, and payment status handling when present.
- Database models and persistence behavior when present.
- Event publishing/listening and NATS integration patterns when present.
- Docker, Kubernetes, Skaffold, probes, deployment, and service configuration when present.
- Testing approach, troubleshooting, and known limitations when present.

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
