# Expiration Service Documentation Instructions

## Scope

- Expiration service source is referenced as `@expiration`.
- The local shared package is referenced as `@common`.
- Infrastructure files are referenced as `@infra`.
- Do not inspect or modify any `node_modules` directory.
- When `@venuepass/common` behavior must be understood, inspect `@common`.
- When service behavior depends on Kubernetes, Docker, Redis, NATS, or other services, inspect the relevant local configuration and contracts. Do not guess.

## README Rules

- The only permitted file edit for this documentation task is `@expiration/README.md`.
- Read any existing `@expiration/README.md` before editing it.
- Preserve content that is accurate and still useful.
- Verify claims from source, tests, package scripts, Dockerfile, TypeScript configuration, and relevant infrastructure configuration.
- Inspect relevant files under `@infra/k8s/` and `@skaffold.yaml` when documenting deployment or runtime behavior.
- Do not infer or invent undocumented behavior.
- Use `@expiration`-style paths in README documentation where practical.

## README Sections

Document only code-supported details:

- Service purpose and role in the VenuePass system.
- Main workflows handled by the service.
- Tech stack and important dependencies.
- Important folder structure.
- Environment variables and runtime dependencies.
- Install, development, build, lint, test, and start commands.
- Event, queue, Redis, and NATS integration patterns when present.
- API endpoints only if the service exposes them.
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
