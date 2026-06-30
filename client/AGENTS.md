<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

## Client Agent Overview

**Name:** VenuePass Client Agent

**Purpose:** Build and maintain the Next.js client application for VenuePass ticketing platform. Handles all browser-side functionality including UI rendering, state management, user interactions, API integration, and client-side routing.

**Capabilities & Responsibilities:**

- Implement client-side React components with proper "use client" directives where needed
- Manage local state using hooks (useState, useEffect, useMemo, etc.)
- Handle browser events, form submissions, and user interactions
- Integrate with backend APIs via existing API clients or fetch requests
- Implement client-side routing with Next.js App Router conventions
- Manage loading, error, empty, and success states for all user-facing workflows
- Apply styling consistent with the existing design system
- Ensure keyboard accessibility and proper ARIA labeling
- Keep sensitive data out of browser bundles (no secrets without NEXT_PUBLIC_ prefix)

**Interface & Interaction Patterns:**

1. **API Calls:** Use existing API client utilities or Next.js `fetch` for server actions/data fetching. Respect existing request/response structures and error handling.

2. **State Management:** Prefer React hooks for local component state. Use existing global state patterns (Context, Zustand, Redux, etc.) as already established in the codebase.

3. **Navigation:** Follow Next.js App Router conventions. Use `next/link` for client-side navigation or server components where applicable.

4. **Form Handling:** Use controlled components. Validate inputs on submit. Handle async operations with proper loading/error states.

5. **Styling:** Match existing design system. Check CSS modules, Tailwind classes, styled-components, or other styling approaches already in use.

---

## Client UI Instructions

### Scope

- This repository is the Next.js client application for VenuePass.
- Do not inspect or modify any `node_modules` directory except to read the relevant Next.js guides required by the rules above.
- Use the repository's established structure, conventions, dependencies, and tooling before introducing new patterns.
- When client behavior depends on a backend endpoint, inspect the relevant local service or API contract. Do not guess its behavior.
- Keep changes within the requested feature or bug-fix scope. Do not make unrelated refactors.

### Next.js Implementation

- Determine whether the project uses the App Router or Pages Router from the current source structure; do not assume.
- Respect the server/client component boundary. Add `"use client"` only when browser APIs, event handlers, hooks, or client-only state genuinely require it.
- Keep secrets and server-only environment variables out of browser bundles. Only expose intentionally public values with the `NEXT_PUBLIC_` prefix.
- Check the locally installed Next.js documentation before using framework APIs, configuration, routing conventions, caching behavior, or deprecated features.
- Reuse existing UI components, API clients, type definitions, form patterns, state-management patterns, and error/loading states whenever suitable.

### UI Quality

- Match the existing design system and styling approach before adding styles or dependencies.
- Build complete user-facing states: loading, empty, error, disabled, and success states where the workflow needs them.
- Make interactive elements keyboard accessible, correctly labelled, and usable with assistive technologies.
- Prefer semantic HTML and native controls where appropriate.
- Keep responsive behavior stable on mobile and desktop. Avoid layout shifts, overflow, clipping, and overlapping controls.

### Validation and Verification

- Use the project's existing lint, type-check, test, and build commands where relevant.
- Add or update focused tests when behavior changes and the project has an established test pattern.
- Do not claim a command passed unless it was actually run successfully.
- Preserve existing user changes. Do not revert, reset, or overwrite unrelated work.

### Documentation Tasks

- For client documentation work, modify only `README.md` unless explicitly instructed otherwise.
- Read the existing README before editing it, and preserve content that remains accurate and useful.
- Verify claims using source code, `package.json`, Next.js configuration, environment-variable usage, tests, and relevant deployment configuration.
- Do not invent routes, API behavior, environment variables, commands, authentication behavior, or deployment details.

#### README Sections

Document only code-supported details:

- Client purpose and main user workflows.
- Tech stack and important dependencies.
- Important folder structure.
- Environment variables, distinguishing public `NEXT_PUBLIC_*` variables from server-only values.
- Install, development, build, lint, test, and production-start commands.
- API integration, authentication, routing, styling, and state-management patterns.
- Docker, Kubernetes, deployment, troubleshooting, and limitations when present.

#### Section-by-Section README Workflow

- Update only one README section per turn.
- After each non-final section update, state:
  1. The section updated.
  2. A brief summary of changes.
  3. Remaining planned sections.
  4. `Say continue to update the next section.`
- Do not update another section until the user explicitly says `continue`.
- On a continuation, inspect the current README to identify the next unfinished section.
- When every planned, code-supported section is complete, respond with exactly:

`update README successful`
