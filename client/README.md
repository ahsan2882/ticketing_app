# VenuePass Client

VenuePass is the web client for an event-ticket marketplace where users can discover tickets, create seller listings, reserve a ticket through an order, and proceed to payment.

This repository contains the **Next.js App Router** frontend for the VenuePass microservices application. It combines server-rendered authentication checks with interactive React client components and communicates with the backend through same-origin `/api/*` routes exposed by the application ingress.

## Table of Contents

- [Features](#features)
- [Application Status](#application-status)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Routes](#routes)
- [API Integration](#api-integration)
- [Authentication](#authentication)
- [State and Data Handling](#state-and-data-handling)
- [Styling and UI](#styling-and-ui)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Package Registry](#package-registry)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Docker](#docker)
- [Deployment Assumptions](#deployment-assumptions)
- [Shared Models and Contracts](#shared-models-and-contracts)
- [Error, Loading, and Empty States](#error-loading-and-empty-states)
- [Known Limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

### Public experience

- Branded VenuePass landing page with:
  - hero carousel;
  - live-sales ticker;
  - event-category cards;
  - trending-event cards;
  - buyer/seller workflow explanation;
  - trust indicators;
  - seller call to action.
- Responsive desktop and mobile navigation.
- User registration and sign-in forms.
- Safe post-authentication redirects through a validated `returnTo` query parameter.
- Ticket browsing with:
  - text search across artist, title, city, and venue;
  - event-type filtering;
  - price sorting;
  - progressively revealed ticket cards;
  - loading and empty-result states.
- Ticket detail page with event information, optional description/image, venue details, and order creation.

### Authenticated experience

- Protected ticket-listing route.
- Seller form for publishing ticket listings.
- Quantity-based or specific-seat allocation input.
- Protected order checkout page.
- Live order-expiration countdown and visual progress ring.
- Order cancellation.
- Stripe Checkout modal integration.
- Sign-out action from the profile menu.

## Application Status

The client contains working implementations for authentication forms, ticket retrieval and creation, ticket details, order creation, order retrieval, order cancellation, and the initial Stripe Checkout interaction.

Some sections are intentionally incomplete or currently use static presentation data:

- the landing-page carousel, categories, ticker, and trending content are hard-coded UI data;
- several marketing, footer, profile, and navigation links point to `#`;
- the `/orders` index currently renders only a placeholder;
- the forgot-password workflow is not implemented;
- payment completion and confirmation navigation are not finished;
- ticket-list pagination is simulated on the client after fetching up to 100 tickets.

See [Known Limitations](#known-limitations) for the complete code-supported list.

## Tech Stack

| Area             | Technology                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Framework        | Next.js `16.2.10`                                                 |
| UI library       | React `19.2.7` and React DOM `19.2.7`                             |
| Language         | TypeScript `6.0.3` with strict mode                               |
| Routing          | Next.js App Router                                                |
| Styling          | Tailwind CSS `4.3.2` through `@tailwindcss/postcss`               |
| HTTP client      | Axios `1.18.1`                                                    |
| Icons            | Lucide React plus local SVG components                            |
| Payments         | `react-stripe-checkout`                                           |
| Shared contracts | `@venuepass/common/client`                                        |
| Fonts            | Geist and Geist Mono through `next/font`                          |
| Linting          | ESLint `10.6.0` with Next.js Core Web Vitals and TypeScript rules |
| Package manager  | Yarn `1.22.22`                                                    |

## Architecture

### App Router

The application uses the `app/` directory and Next.js App Router conventions.

- `app/layout.tsx` is the root server layout.
- Route files that require browser state, hooks, event handlers, or browser-side navigation use the `"use client"` directive.
- Server components perform authentication lookups before protected content is rendered.
- Route-specific layouts provide shared presentation and context.

### Server and client boundaries

The root layout calls `getCurrentUser()` on the server and passes the result to the header. This allows the navigation to render either authentication actions or the signed-in profile controls during the initial render.

The order layout repeats the server-side current-user lookup and places the result in `CurrentUserProvider`. The `/orders/[id]` client page consumes that context through `useCurrentUser()`.

The `/tickets/new` route performs its authentication check directly in a server page and redirects unauthenticated users to sign in.

### Backend communication

Browser-side requests use relative paths such as `/api/tickets` and `/api/orders`. The client therefore expects an ingress or reverse proxy to route these requests to the appropriate backend service while preserving the browser's authentication cookie.

The server-side current-user lookup forwards the incoming request headers to the auth service through the Kubernetes ingress controller's internal DNS name.

## Routes

| Route           | Access                  | Purpose                                               | Current state                            |
| --------------- | ----------------------- | ----------------------------------------------------- | ---------------------------------------- |
| `/`             | Public                  | Main VenuePass landing page                           | Implemented with static promotional data |
| `/home`         | Public                  | Direct route to the landing page                      | Implemented                              |
| `/auth/signin`  | Public                  | Sign-in experience                                    | Implemented                              |
| `/auth/signup`  | Public                  | Account-registration experience                       | Implemented                              |
| `/tickets`      | Public                  | Browse, search, filter, and sort ticket listings      | Implemented                              |
| `/tickets/[id]` | Public                  | View one ticket and start an order                    | Implemented                              |
| `/tickets/new`  | Authenticated           | Create a seller ticket listing                        | Implemented                              |
| `/orders`       | No explicit route guard | Intended order overview                               | Placeholder only                         |
| `/orders/[id]`  | Authenticated           | View an order, countdown, cancel, or initiate payment | Partially implemented                    |

## API Integration

The client expects backend endpoints to be available from the same public origin under `/api`.

### Authentication endpoints

| Method | Endpoint                 | Used by                                                      |
| ------ | ------------------------ | ------------------------------------------------------------ |
| `POST` | `/api/users/signup`      | Account-registration form                                    |
| `POST` | `/api/users/signin`      | Sign-in form                                                 |
| `POST` | `/api/users/signout`     | Header sign-out action                                       |
| `GET`  | `/api/users/currentuser` | Server-side current-user lookup through internal ingress DNS |

Signup sends:

```json
{
  "email": "user@example.com",
  "password": "password",
  "name": "Full Name"
}
```

Signin sends:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

### Ticket endpoints

| Method | Endpoint                 | Purpose                                            |
| ------ | ------------------------ | -------------------------------------------------- |
| `GET`  | `/api/tickets?limit=100` | Load the ticket collection used by the browse page |
| `GET`  | `/api/tickets/:id`       | Load one ticket                                    |
| `POST` | `/api/tickets`           | Publish a new listing                              |

The create-ticket form submits required ticket metadata and conditionally includes optional values. Its payload is shaped like:

```json
{
  "title": "Event ticket title",
  "price": 50,
  "artist": "Artist or event name",
  "venue": "Venue name",
  "city": "City",
  "eventDate": "2027-11-21T00:00:00.000Z",
  "eventType": "<EventType value>",
  "category": "<TicketCategory value>",
  "description": "Optional details",
  "imageUrl": "https://example.com/image.jpg",
  "quantity": "2"
}
```

When specific-seat allocation is selected, `seats` is sent as an array created by splitting the comma-separated input, while `quantity` is omitted.

### Order endpoints

| Method   | Endpoint          | Purpose                                    |
| -------- | ----------------- | ------------------------------------------ |
| `POST`   | `/api/orders`     | Reserve a ticket and create an order       |
| `GET`    | `/api/orders/:id` | Load an order and its expiration timestamp |
| `DELETE` | `/api/orders/:id` | Cancel an order                            |

Order creation sends:

```json
{
  "ticketId": "ticket-id"
}
```

### Payment endpoint

| Method | Endpoint        | Purpose                               |
| ------ | --------------- | ------------------------------------- |
| `POST` | `/api/payments` | Start payment processing for an order |

The current client sends:

```json
{
  "orderId": "order-id"
}
```

The Stripe token returned by `react-stripe-checkout` is currently logged but is not included in this request. Confirm the intended backend payment contract before treating checkout as complete.

### Request abstraction

`hooks/use-request.tsx` centralizes Axios calls for `GET`, `POST`, `PATCH`, and `DELETE` requests.

It provides:

- a memoized `doRequest()` function;
- structured API errors;
- a derived list of invalid field names;
- optional success callbacks;
- typed response data through a generic parameter.

The hook expects backend validation errors in this shape:

```json
{
  "errors": [
    {
      "message": "Human-readable error",
      "field": "optionalFieldName"
    }
  ]
}
```

## Authentication

### Current-user resolution

`lib/auth/get-current-user.ts` calls:

```text
http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/api/users/currentuser
```

It forwards all incoming Next.js request headers to preserve cookie-based authentication. The request has a five-second timeout.

If the lookup fails, the function logs the error and returns:

```json
{
  "currentUser": null
}
```

This keeps public pages renderable when the auth service is unavailable, but protected pages will treat the visitor as unauthenticated.

### Protected routes

- `/tickets/new` redirects unauthenticated users to `/auth/signin?returnTo=/tickets/new`.
- `/orders/[id]` redirects unauthenticated users to signin with the order path as `returnTo`.

### Safe return redirects

Signin and signup accept an optional `returnTo` query parameter. Before navigation, the value must:

- start with `/`; and
- not start with `//`.

Invalid values fall back to `/`, reducing the risk of redirecting users to an external origin.

### Shared user context

`CurrentUserProvider` stores only the current authenticated user for descendants of the order layout. It is intentionally small and does not provide authentication mutations or global application state.

## State and Data Handling

The application does not use Redux, Zustand, or another external state-management library.

Current patterns include:

- `useState` for form values, UI toggles, fetched entities, and countdown state;
- `useEffect` for initial requests, countdown intervals, and allocation-mode cleanup;
- `useMemo` for ticket filtering and sorting;
- `useCallback` for stable request and pagination callbacks;
- React Context for the current user within order routes;
- server-component props for the root header's current-user state.

### Custom hooks

| Hook            | Purpose                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| `useRequest`    | Axios request execution and structured error handling                                   |
| `useCarousel`   | Auto-advancing carousel state with pause, resume, next, previous, and direct navigation |
| `useInView`     | One-time Intersection Observer visibility detection                                     |
| `useOnReachEnd` | Reusable sentinel observer for end-of-list loading                                      |

### Ticket-list behavior

The ticket browse page currently:

1. fetches up to 100 tickets once;
2. filters and sorts them in browser memory;
3. displays nine tickets initially;
4. reveals nine more when the sentinel enters the viewport;
5. simulates a 500 ms loading delay.

This is progressive rendering, not backend pagination.

## Styling and UI

### Tailwind CSS

Global styles import Tailwind directly:

```css
@import "tailwindcss";
```

The PostCSS configuration registers `@tailwindcss/postcss`.

The design uses:

- a dark zinc background palette;
- violet-to-fuchsia gradients;
- monospaced uppercase labels;
- ticket-inspired perforations, notches, borders, and barcode elements;
- responsive Tailwind breakpoints;
- Geist and Geist Mono font variables.

### Reusable UI components

The client includes reusable components for:

- text, date, password, and textarea fields;
- select fields;
- gradient buttons and links;
- ticket cards and skeleton cards;
- ticket perforations and ticket-style footers;
- local SVG icons.

### Accessibility patterns present in the code

The UI includes several accessibility-oriented patterns, including:

- semantic `header`, `nav`, `main`, `section`, `footer`, `fieldset`, and `label` elements;
- `aria-label`, `aria-expanded`, `aria-controls`, `aria-haspopup`, and `aria-invalid` attributes;
- focus-visible rings on many interactive controls;
- native buttons, links, inputs, selects, and checkboxes;
- decorative elements marked with `aria-hidden`.

These patterns are present in the implementation, but the repository does not include an automated accessibility test suite.

## Project Structure

```text
client/
├── app/
│   ├── auth/
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   ├── home/
│   │   ├── components/
│   │   └── page.tsx
│   ├── orders/
│   │   ├── [id]/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── tickets/
│   │   ├── [id]/page.tsx
│   │   ├── new/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── create-ticket/
│   ├── header/
│   ├── signin/
│   ├── signup/
│   ├── tickets/
│   └── ui/
├── hooks/
│   ├── use-carousel.tsx
│   ├── use-in-view.tsx
│   ├── use-on-reach-end.tsx
│   └── use-request.tsx
├── lib/
│   ├── auth/get-current-user.ts
│   └── utils/utils.ts
├── models/
├── providers/
├── public/
├── Dockerfile
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── yarn.lock
```

### Directory responsibilities

- `app/`: routes, layouts, route-specific sections, and global styling.
- `components/`: reusable domain and presentation components.
- `hooks/`: reusable client-side behavior.
- `lib/`: authentication and formatting utilities.
- `models/`: client interfaces, option lists, and event styling maps.
- `providers/`: React context providers.
- `public/`: static assets.

## Prerequisites

The repository requires:

- Node.js compatible with the installed Next.js version;
- Yarn `1.22.22`;
- access to the configured internal npm registry;
- the VenuePass backend APIs exposed under `/api` for complete functionality;
- a valid public Stripe publishable key for checkout;
- cookie-compatible browser access to the frontend and API ingress.

The repository does not pin an exact local Node.js version. The Docker image currently uses the floating `node:alpine` tag.

## Package Registry

The checked-in `.npmrc` configures both the default registry and the `@venuepass` scope to use:

```text
https://npm.home.arpa/
```

The client depends on the private/shared package:

```text
@venuepass/common
```

That package supplies shared values and types such as:

- `EventType`;
- `TicketCategory`;
- `TicketStatus`;
- `OrderStatus`;
- `UserPayload`.

Dependency installation will fail when `npm.home.arpa` is unavailable or does not contain the required package version.

## Environment Variables

### Required public variable

| Variable                 | Exposure        | Purpose                                                    |
| ------------------------ | --------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_STRIPE_KEY` | Browser-visible | Stripe publishable key supplied to `react-stripe-checkout` |

Example `.env.local`:

```dotenv
NEXT_PUBLIC_STRIPE_KEY=pk_test_replace_with_your_publishable_key
```

Only a Stripe **publishable** key should use the `NEXT_PUBLIC_` prefix. Never place a Stripe secret key in a browser-exposed variable.

### Hard-coded server-side service address

The current-user service address is not configurable through an environment variable. It is hard-coded in `lib/auth/get-current-user.ts` as the ingress-nginx controller's cluster-local DNS name.

For environments that do not use this exact Kubernetes service name, update the implementation or introduce a server-only configuration variable before deployment.

## Getting Started

### 1. Enter the client directory

```bash
cd client
```

### 2. Ensure the internal registry is reachable

The `.npmrc` file points Yarn to `https://npm.home.arpa/`. Confirm DNS, TLS trust, and registry availability before installing dependencies.

### 3. Install dependencies

```bash
yarn install --frozen-lockfile
```

### 4. Configure Stripe

Create `.env.local`:

```dotenv
NEXT_PUBLIC_STRIPE_KEY=pk_test_replace_with_your_publishable_key
```

### 5. Make the backend available

For browser requests, the frontend origin must route `/api/*` to the VenuePass microservices. The code does not define local Next.js API route handlers or rewrites for these services.

For server-side authentication checks, the running Next.js server must also be able to resolve:

```text
ingress-nginx-controller.ingress-nginx.svc.cluster.local
```

When running outside Kubernetes, that internal DNS name will normally be unavailable unless the code is adjusted.

### 6. Start development mode

```bash
yarn dev
```

The standard local Next.js address is:

```text
http://localhost:3000
```

`next.config.ts` additionally allows `ticketing-app.com` as a development origin.

## Available Scripts

| Command      | Description                                  |
| ------------ | -------------------------------------------- |
| `yarn dev`   | Start the Next.js development server         |
| `yarn build` | Create a production build                    |
| `yarn start` | Start the previously built production server |
| `yarn lint`  | Run ESLint                                   |

### Tests

No test dependency, test directory, or `test` script is configured in the supplied client repository.

### Type checking

TypeScript strict mode and `noEmit` are enabled in `tsconfig.json`, but there is no dedicated `typecheck` package script.

## Docker

The included Dockerfile is development-oriented.

It performs the following steps:

1. starts from `node:alpine`;
2. installs CA certificates;
3. copies `caddy-root.crt` into the container trust store;
4. updates the CA bundle;
5. enables Corepack;
6. switches to the non-root `node` user;
7. installs dependencies with `yarn install --frozen-lockfile`;
8. copies the application source;
9. starts the client with `yarn dev`.

Build the image from the client directory:

```bash
docker build -t venuepass-client .
```

Run it with the Stripe public key:

```bash
docker run --rm \
  -p 3000:3000 \
  -e NEXT_PUBLIC_STRIPE_KEY=pk_test_replace_with_your_publishable_key \
  venuepass-client
```

### Docker considerations

- The image runs the development server, not `next build` followed by `next start`.
- The base image tag is not pinned to a Node.js version.
- The container must resolve the internal package registry during build.
- The custom Caddy root certificate must remain valid for services that depend on it.
- The running container must resolve the Kubernetes ingress service for server-side authentication.
- `.dockerignore` excludes `.env*`, so environment values must be supplied at runtime or through the deployment platform.

For a production image, use a multi-stage build that installs dependencies, runs `yarn build`, copies only production runtime assets, and starts with `yarn start`.

## Deployment Assumptions

No Kubernetes manifest is included in the supplied client archive, but the code clearly assumes a Kubernetes/ingress environment.

### Ingress routing

The browser sends requests to the current frontend origin:

```text
/api/users/*
/api/tickets/*
/api/orders/*
/api/payments/*
```

The ingress must route each path to its corresponding microservice.

### Internal server-side routing

Next.js server rendering calls the ingress-nginx controller directly at:

```text
ingress-nginx-controller.ingress-nginx.svc.cluster.local
```

The frontend deployment therefore needs network and DNS access to that service.

### Cookies and forwarded headers

The current-user request forwards incoming headers. Authentication depends on the browser's session cookie reaching the frontend and then being forwarded to the auth service.

Ensure that ingress hostnames, cookie domains, TLS configuration, and proxy headers are consistent across the frontend and backend services.

### Development origin

`next.config.ts` contains:

```ts
allowedDevOrigins: ["ticketing-app.com"];
```

This supports development access from that host. Additional development hosts require a configuration update.

## Shared Models and Contracts

### Ticket model

The local `TicketModel` includes:

```ts
interface TicketModel {
  id: string;
  userId: string;
  title: string;
  artist: string;
  venue: string;
  city: string;
  eventDate: string;
  eventType: EventType;
  category: TicketCategory;
  price: number;
  status: TicketStatus;
  description?: string;
  imageUrl?: string;
  seat?: string;
}
```

Event-type and category select options are generated from shared enums and converted to title case for display.

### Order model

```ts
interface Order {
  id: string;
  userId: string;
  ticket: {
    id: string;
    title: string;
    price: number;
    userId: string;
  };
  status: OrderStatus;
  createdAt: string;
  expiresAt: string;
}
```

The order page derives the remaining reservation time from `expiresAt` and updates it once per second.

## Error, Loading, and Empty States

Implemented states include:

- field-level highlighting from backend validation errors;
- general authentication and create-ticket error messages;
- ticket-list empty results;
- ticket-card skeletons for lazy visibility;
- ticket-detail loading and fetch errors;
- order-page skeleton while loading;
- order-load error with retry action;
- expired-order presentation;
- critical countdown styling during the final minute;
- disabled payment action while a payment request is in progress.

The shared request hook does not currently expose a general loading flag, success state, HTTP status, or thrown error to callers. Components manage loading independently when required.

## Known Limitations

The following limitations are visible in the supplied source code:

1. **Payment token is not submitted.** The Stripe callback receives and logs the token, but `/api/payments` receives only `orderId`.
2. **Payment completion flow is unfinished.** The payment response is logged and the intended confirmation redirect is commented out.
3. **Payment errors are not rendered.** `paymentErrors` state exists, but errors from the payment request are not connected to it.
4. **Orders index is a placeholder and is not explicitly protected.** `/orders` currently displays only `Orders`; its layout resolves the current user but does not redirect unauthenticated visitors.
5. **Forgot password is not implemented.** The link points to `#`.
6. **Several navigation destinations are placeholders.** This includes venue, how-it-works, live-now, profile-menu, marketing, legal, and footer links.
7. **Landing-page content is static.** Hero, category, trending, and ticker data are not loaded from backend services.
8. **Ticket pagination is client-side simulation.** The page fetches up to 100 records and reveals them in groups of nine.
9. **The Filters button has no behavior.** Search, event-type selection, and price sorting work, but the separate Filters control is not connected.
10. **The `soonest` sort option does not sort by date.** It preserves the API order because only price sorting is implemented.
11. **No automated tests are configured.** There is no test script or test suite in the archive.
12. **The Dockerfile is development-only.** It starts `next dev` and does not build an optimized production image.
13. **The internal auth URL is hard-coded.** Running outside the expected cluster requires a code or configuration change.
14. **Sign-out failure uses a browser alert.** Other flows use inline UI errors, but sign-out currently falls back to `alert("signout failed")`.
15. **Ticket image rendering uses a plain `<img>`.** The details page does not use Next.js image optimization.
16. **Quantity is submitted as a string.** The form converts price to a number but leaves `quantity` as its controlled string value.
17. **Seat input is split without trimming.** Comma-separated seat entries may retain leading whitespace.
18. **No explicit production Node.js version is pinned.** The Docker image uses `node:alpine`.

## Troubleshooting

### Dependency installation cannot reach `npm.home.arpa`

The repository uses an internal registry for all packages and the `@venuepass` scope.

Check:

- DNS resolution for `npm.home.arpa`;
- registry availability;
- TLS trust;
- presence of `@venuepass/common@^1.0.68`;
- whether the custom CA is installed in the environment performing the install.

### Public pages work, but protected routes always redirect to signin

The server-side current-user lookup may be failing and returning `currentUser: null`.

Check that the Next.js runtime can resolve and reach:

```text
http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/api/users/currentuser
```

Also verify that the incoming authentication cookie is present and accepted by the auth service.

### Browser API requests return `404`

The client contains no local `/api` route handlers for the microservices. Configure the ingress or reverse proxy so `/api/users`, `/api/tickets`, `/api/orders`, and `/api/payments` reach the correct services.

### Stripe checkout does not open or initialize

Confirm that `NEXT_PUBLIC_STRIPE_KEY` exists when the client is built and started, and that it contains a publishable Stripe key.

### Stripe modal succeeds, but payment is not completed

The current implementation does not send the Stripe token to `/api/payments` and does not navigate to a success page. Align the frontend payload with the payments-service contract and complete the success/error workflow.

### `ticketing-app.com` development access is rejected

Confirm the hostname matches `allowedDevOrigins` in `next.config.ts`. Add other development origins explicitly when needed.

### Authentication works in the browser but not during server rendering

The public browser hostname and internal server hostname use different request paths. Verify:

- cookies are forwarded in the incoming request headers;
- the auth cookie's domain/path rules allow it to be sent to the frontend;
- the cluster-local ingress service is reachable;
- the auth route accepts the forwarded `Host` and proxy headers expected by the deployment.

## License

This project is licensed under the MIT License, as declared in `package.json`.
