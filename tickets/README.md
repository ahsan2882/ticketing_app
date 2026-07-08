# Tickets Service

Ticketing service for VenuePass.

The tickets service owns ticket creation, ticket listing, ticket lookup, ticket updates, ticket availability state, and the ticket-side reaction to order events. It exposes HTTP routes under `/api/tickets` and participates in the VenuePass event system through NATS JetStream.

No existing README was present in the uploaded `tickets` service archive, so this document is generated from the service source, tests, package scripts, Dockerfile, TypeScript configuration, and the related local Kubernetes manifests.

## Table of Contents

- [Tickets Service](#tickets-service)
  - [Table of Contents](#table-of-contents)
  - [Service Role](#service-role)
  - [Main Workflows](#main-workflows)
    - [Create Tickets Workflow](#create-tickets-workflow)
    - [List Tickets Workflow](#list-tickets-workflow)
    - [Find Ticket Workflow](#find-ticket-workflow)
    - [Update Ticket Workflow](#update-ticket-workflow)
    - [Reserve Ticket From Order](#reserve-ticket-from-order)
    - [Release Ticket From Cancelled Order](#release-ticket-from-cancelled-order)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Runtime Dependencies](#runtime-dependencies)
  - [Environment Variables](#environment-variables)
  - [Commands](#commands)
  - [Application Startup](#application-startup)
  - [HTTP Middleware](#http-middleware)
  - [Health and Readiness](#health-and-readiness)
  - [Authentication](#authentication)
  - [API Routes](#api-routes)
    - [Create Tickets](#create-tickets)
    - [List Tickets](#list-tickets)
    - [Find Ticket By Id](#find-ticket-by-id)
    - [Update Ticket](#update-ticket)
    - [Unknown Routes](#unknown-routes)
  - [Data Model](#data-model)
    - [Ticket](#ticket)
    - [Supported Enums](#supported-enums)
  - [Ticket Status Lifecycle](#ticket-status-lifecycle)
  - [Field Visibility](#field-visibility)
  - [Validation Rules](#validation-rules)
    - [Create Validation](#create-validation)
    - [Update Validation](#update-validation)
  - [Concurrency and Reservation Safety](#concurrency-and-reservation-safety)
    - [Transactional Batch Creation](#transactional-batch-creation)
    - [Optimistic Concurrency](#optimistic-concurrency)
    - [Atomic Reservation](#atomic-reservation)
    - [Atomic Release](#atomic-release)
  - [Event Integration](#event-integration)
    - [Consumed Events](#consumed-events)
    - [Published Events](#published-events)
  - [NATS and JetStream Behavior](#nats-and-jetstream-behavior)
  - [Docker](#docker)
  - [Kubernetes](#kubernetes)
    - [Init Containers](#init-containers)
    - [Runtime Environment](#runtime-environment)
    - [Probes](#probes)
    - [Service](#service)
    - [MongoDB](#mongodb)
    - [NATS](#nats)
    - [Ingress](#ingress)
  - [Testing](#testing)
    - [Route Test Coverage](#route-test-coverage)
    - [Model Test Coverage](#model-test-coverage)
    - [Listener Test Coverage](#listener-test-coverage)
  - [Build Output](#build-output)
  - [Troubleshooting](#troubleshooting)
    - [Service Fails on Missing Environment Variables](#service-fails-on-missing-environment-variables)
    - [`/readyz` Returns 503](#readyz-returns-503)
    - [Create Ticket Returns 400 for `seat`](#create-ticket-returns-400-for-seat)
    - [Public List Does Not Show Reserved or Sold Tickets](#public-list-does-not-show-reserved-or-sold-tickets)
    - [Ticket Update Returns Reserved or Sold Guard](#ticket-update-returns-reserved-or-sold-guard)
    - [Order Event Does Not Change Ticket State](#order-event-does-not-change-ticket-state)
  - [Known Limitations and Notes](#known-limitations-and-notes)

## Service Role

The tickets service is responsible for:

- Creating one or more tickets.
- Returning public ticket listings.
- Returning a single ticket by id.
- Updating ticket details for the owning user.
- Hiding private ticket fields from unauthenticated public reads.
- Publishing ticket creation and update events.
- Reserving tickets when an order is created.
- Releasing reserved tickets when an order is cancelled.

The service uses MongoDB as its persistence layer and NATS JetStream for event-driven coordination with the orders service and downstream services that consume ticket updates.

## Main Workflows

### Create Tickets Workflow

1. A signed-in user sends `POST /api/tickets`.
2. The service validates ticket fields, optional `seats`, and optional `quantity`.
3. The service starts a MongoDB session and transaction.
4. It creates one ticket per provided seat, or one seatless ticket per requested quantity.
5. If any ticket in the batch fails to save, the transaction rolls back the whole batch.
6. After the transaction succeeds, the service publishes one `ticket.created` event per ticket.
7. The service returns an array of created tickets with HTTP `201`.

### List Tickets Workflow

`GET /api/tickets` supports both public and authenticated listing:

- Unauthenticated users see only `available` tickets and only public fields.
- Authenticated users see tickets of all statuses and also receive `userId` and `seat`.

Results are sorted by `eventDate` ascending, then `_id` ascending, and are paginated with `limit` and `skip`.

### Find Ticket Workflow

`GET /api/tickets/:id` returns a single ticket by id.

- Unauthenticated users receive public fields.
- Authenticated users receive public fields plus `userId` and `seat`.
- Ownership is not required to read a ticket by id.
- Non-available tickets can still be fetched directly by id.

### Update Ticket Workflow

1. A signed-in user sends `PATCH /api/tickets/:id`.
2. The service validates the ticket id and request body.
3. The service loads the ticket.
4. The service verifies that the signed-in user owns the ticket.
5. The service rejects updates to `reserved` or `sold` tickets.
6. The service applies allowed fields.
7. The service saves the ticket with optimistic concurrency.
8. The service publishes `ticket.updated`.
9. The service returns the updated ticket.

### Reserve Ticket From Order

When the service receives `order.created`, it atomically changes the referenced ticket from `available` to `reserved`, stores the order id, increments the ticket version, and publishes `ticket.updated`.

### Release Ticket From Cancelled Order

When the service receives `order.cancelled`, it atomically changes the referenced ticket from `reserved` back to `available` only if the cancellation belongs to the order that currently holds the ticket. It unsets `orderId`, increments the ticket version, and publishes `ticket.updated`.

## Tech Stack

| Area                | Technology                                      |
| ------------------- | ----------------------------------------------- |
| Runtime             | Node.js                                         |
| Language            | TypeScript                                      |
| Module system       | ESM                                             |
| HTTP framework      | Express 5                                       |
| Database            | MongoDB with Mongoose                           |
| Events              | NATS JetStream                                  |
| Auth/session        | JWT in `cookie-session`                         |
| Validation          | `express-validator`                             |
| Security middleware | `helmet`                                        |
| Shared package      | `@venuepass/common`                             |
| Tests               | Jest, ts-jest, Supertest, mongodb-memory-server |
| Dev runner          | `tsx watch`                                     |
| Package manager     | Yarn 1.22.22                                    |
| Container           | Docker                                          |
| Orchestration       | Kubernetes                                      |

## Project Structure

```txt
tickets/
|-- src/
|   |-- __mocks__/
|   |   `-- nats-client.ts
|   |-- events/
|   |   |-- listeners/
|   |   |   |-- __test__/
|   |   |   |-- order-cancelled-listener.ts
|   |   |   `-- order-created-listener.ts
|   |   `-- publishers/
|   |       |-- ticket-created-publisher.ts
|   |       `-- ticket-updated-publisher.ts
|   |-- models/
|   |   |-- __test__/
|   |   `-- ticket.model.ts
|   |-- routes/
|   |   |-- __test__/
|   |   |-- create-ticket.ts
|   |   |-- find-all-tickets.ts
|   |   |-- find-ticket.ts
|   |   `-- update-ticket.ts
|   |-- test/
|   |   `-- setup.ts
|   |-- app.ts
|   |-- health.ts
|   |-- index.ts
|   `-- nats-client.ts
|-- Dockerfile
|-- package.json
|-- tsconfig.json
|-- tsconfig.build.json
|-- yarn.lock
`-- .npmrc
```

## Runtime Dependencies

| Dependency          | Purpose                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| MongoDB             | Stores tickets                                                                                                    |
| NATS JetStream      | Consumes order events and publishes ticket events                                                                 |
| `@venuepass/common` | Shared errors, middleware, event subjects, event types, ticket enums, base listeners/publishers, and health state |
| JWT secret          | Verifies signed-in users through the shared `currentUser` middleware                                              |

## Environment Variables

| Variable            | Required | Example / Source                            | Purpose                                                    |
| ------------------- | -------: | ------------------------------------------- | ---------------------------------------------------------- |
| `NODE_ENV`          |      Yes | `development`, `test`, `production`         | Controls environment validation and secure cookie behavior |
| `JWT_KEY`           |      Yes | Kubernetes secret `jwt-secret.JWT_KEY`      | Verifies JWT session payloads                              |
| `TICKETS_MONGO_URI` |      Yes | `mongodb://tickets-mongo-srv:27017/tickets` | MongoDB connection string                                  |
| `NATS_URL`          |      Yes | `nats://nats-srv:4222`                      | NATS server connection URL                                 |

Startup fails if any required variable is missing. `NODE_ENV` must be one of:

- `development`
- `test`
- `production`

## Commands

Install dependencies:

```bash
yarn install
```

Run the service in watch mode:

```bash
yarn start
```

Build TypeScript:

```bash
yarn build
```

Run tests in watch mode:

```bash
yarn test
```

There is no `lint` script in the uploaded `package.json`.

## Application Startup

The runtime entrypoint is `src/index.ts`.

Startup sequence:

1. Validate required environment variables.
2. Register graceful shutdown handlers for `SIGINT` and `SIGTERM`.
3. Start the Express app on port `3000`.
4. Connect to MongoDB using `TICKETS_MONGO_URI`.
5. Connect to NATS using `NATS_URL`.
6. Ensure the JetStream stream exists.
7. Start order event listeners.

Started listeners:

- `OrderCreatedListener`
- `OrderCancelledListener`

If MongoDB or NATS connection setup fails, startup throws a `ServiceConnectionError`.

Graceful shutdown closes:

- HTTP server
- NATS client, using `drain()`
- MongoDB connection

The process exits with code `1` if any shutdown step fails, otherwise it exits with code `0`.

## HTTP Middleware

The Express app is configured in `src/app.ts`.

Global middleware:

- `helmet()` for HTTP security headers.
- `bodyParser.json()` for JSON request bodies.
- `cookieSession()` for session cookies.
- `currentUser` from `@venuepass/common` to decode the JWT session into `req.currentUser`.
- Shared `errorHandler` from `@venuepass/common`.

Express is configured with:

```ts
app.set("trust proxy", true);
```

Session cookie settings:

```ts
cookieSession({
  signed: false,
  secure:
    process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test",
  maxAge: 3600000,
});
```

Cookies are secure outside `development` and `test`.

## Health and Readiness

| Method | Path       | Auth | Behavior                                       |
| ------ | ---------- | ---- | ---------------------------------------------- |
| `GET`  | `/healthz` | No   | Always returns `200` with `{ "status": "ok" }` |
| `GET`  | `/readyz`  | No   | Returns readiness for MongoDB and NATS         |

Ready response:

```json
{
  "status": "ready",
  "mongo": true,
  "nats": true
}
```

Not-ready response:

```json
{
  "status": "not_ready",
  "mongo": false,
  "nats": true
}
```

`/readyz` returns HTTP `503` if either MongoDB or NATS is not ready.

## Authentication

Routes use two different access modes:

| Route Type   | Auth Requirement                                               |
| ------------ | -------------------------------------------------------------- |
| Public reads | `GET /api/tickets`, `GET /api/tickets/:id` do not require auth |
| Mutations    | `POST /api/tickets`, `PATCH /api/tickets/:id` require auth     |

The shared `currentUser` middleware attempts to decode the JWT session and attach the user payload to `req.currentUser`.

Expected user payload shape from tests:

```ts
{
  id: string;
  email: string;
  name: string;
}
```

Unauthenticated mutation requests return HTTP `401`.

## API Routes

### Create Tickets

```http
POST /api/tickets
```

Auth: required.

Request body:

```json
{
  "title": "Jazz Night",
  "price": 49.99,
  "artist": "The Blue Notes",
  "venue": "Main Hall",
  "city": "Lahore",
  "eventDate": "2026-08-01T19:00:00.000Z",
  "eventType": "concert",
  "category": "standard",
  "seats": ["A1", "A2"],
  "quantity": 2,
  "description": "Evening show",
  "imageUrl": "https://example.com/jazz.jpg"
}
```

Success:

- Status: `201`
- Returns an array of created tickets.
- Publishes one `ticket.created` event per created ticket.

Batch creation behavior:

| Input                                   | Behavior                             |
| --------------------------------------- | ------------------------------------ |
| `seats` provided                        | Creates one ticket per seat          |
| `quantity` provided without `seats`     | Creates that many seatless tickets   |
| Neither `seats` nor `quantity` provided | Creates one seatless ticket          |
| Both `seats` and `quantity` provided    | `quantity` must match `seats.length` |

Limits:

- Maximum tickets per request: `50`.
- `seats` must be a non-empty array of at most `50` non-empty strings.
- `quantity` must be an integer from `1` to `50`.
- Clients must use `seats`, not singular `seat`, during creation.

Error behavior:

| Condition                                           | Status |
| --------------------------------------------------- | -----: |
| Missing or invalid auth                             |  `401` |
| Invalid request body                                |  `400` |
| Schema validation failure, such as past `eventDate` |  `400` |

### List Tickets

```http
GET /api/tickets
```

Auth: optional.

Query parameters:

| Name    | Default |              Maximum | Behavior                            |
| ------- | ------: | -------------------: | ----------------------------------- |
| `limit` |    `20` |                `100` | Maximum number of tickets to return |
| `skip`  |     `0` | Not capped in source | Number of matching tickets to skip  |

Invalid `limit` or `skip` values fall back to defaults.

Unauthenticated behavior:

- Returns only tickets with status `available`.
- Returns public fields only.

Authenticated behavior:

- Returns tickets of every status.
- Includes `userId` and `seat`.

Success:

- Status: `200`
- Returns an array.
- Empty collections return `[]`, not `404`.
- Results are sorted by `eventDate` ascending and `_id` ascending.

### Find Ticket By Id

```http
GET /api/tickets/:id
```

Auth: optional.

Success:

- Status: `200`
- Returns the requested ticket.
- Public users receive public fields.
- Authenticated users also receive `userId` and `seat`.
- Authenticated users do not need to own the ticket to read it.

Error behavior:

| Condition             | Status |
| --------------------- | -----: |
| Invalid ticket id     |  `400` |
| Ticket does not exist |  `404` |

Direct lookup by id can return non-available tickets, even though unauthenticated list results only include available tickets.

### Update Ticket

```http
PATCH /api/tickets/:id
```

Auth: required.

Allowed body fields:

```json
{
  "title": "Updated title",
  "price": 59.99,
  "artist": "Updated artist",
  "venue": "Updated venue",
  "city": "Updated city",
  "eventDate": "2026-08-02T19:00:00.000Z",
  "eventType": "concert",
  "category": "VIP",
  "seat": "B5",
  "description": "Updated description",
  "imageUrl": "https://example.com/updated.jpg"
}
```

Success:

- Status: `200`
- Returns the updated ticket.
- Publishes `ticket.updated`.

Error behavior:

| Condition                                    | Status |
| -------------------------------------------- | -----: |
| Missing or invalid auth                      |  `401` |
| Invalid ticket id                            |  `400` |
| Ticket does not exist                        |  `404` |
| Signed-in user does not own the ticket       |  `401` |
| No editable field is provided                |  `400` |
| Ticket is `reserved` or `sold`               |  `400` |
| Ticket was modified concurrently before save |  `400` |

The route does not allow client-driven status updates. Tests show that a `status` field sent alongside a valid update is ignored rather than applied.

### Unknown Routes

Any unmatched route throws:

```txt
Route not found in tickets service
```

The shared error handler formats the response.

## Data Model

### Ticket

Defined in `src/models/ticket.model.ts`.

Fields:

| Field         | Type             | Notes                                    |
| ------------- | ---------------- | ---------------------------------------- |
| `title`       | `string`         | Required, trimmed, minimum length `3`    |
| `price`       | `number`         | Required, minimum `0.01`                 |
| `userId`      | `string`         | Required, immutable                      |
| `artist`      | `string`         | Required, trimmed                        |
| `venue`       | `string`         | Required, trimmed                        |
| `city`        | `string`         | Required, trimmed                        |
| `eventDate`   | `Date`           | Required, must be in the future          |
| `eventType`   | `EventType`      | Required enum                            |
| `category`    | `TicketCategory` | Required enum                            |
| `seat`        | `string`         | Optional, trimmed                        |
| `description` | `string`         | Optional, trimmed                        |
| `imageUrl`    | `string`         | Optional, trimmed                        |
| `status`      | `TicketStatus`   | Defaults to `available`                  |
| `orderId`     | `string`         | Optional, stores the reserving order id  |
| `version`     | `number`         | Mongoose version key, renamed from `__v` |

Schema behavior:

- `optimisticConcurrency` is enabled.
- `versionKey` is `version`.
- JSON output hides Mongo `_id` and `__v`.
- JSON output includes `version`.
- JSON output does not include `orderId`.

Ticket JSON output includes:

```ts
{
  id: string;
  version: number;
  title: string;
  price: number;
  userId: string;
  artist: string;
  venue: string;
  city: string;
  eventDate: Date;
  eventType: EventType;
  category: TicketCategory;
  seat?: string;
  description?: string;
  imageUrl?: string;
  status: TicketStatus;
}
```

### Supported Enums

Event types from `@venuepass/common`:

| Enum         | Value        |
| ------------ | ------------ |
| `Concert`    | `concert`    |
| `Sports`     | `sports`     |
| `Theatre`    | `theatre`    |
| `Comedy`     | `comedy`     |
| `Festival`   | `festival`   |
| `Conference` | `conference` |

Ticket categories from `@venuepass/common`:

| Enum       | Value      |
| ---------- | ---------- |
| `STANDARD` | `standard` |
| `VIP`      | `VIP`      |
| `FLOOR`    | `floor`    |
| `BALCONY`  | `balcony`  |
| `BOX`      | `box`      |

Ticket statuses from `@venuepass/common`:

| Enum        | Value       |
| ----------- | ----------- |
| `AVAILABLE` | `available` |
| `RESERVED`  | `reserved`  |
| `SOLD`      | `sold`      |

## Ticket Status Lifecycle

| Status      | Meaning in this service                                      |
| ----------- | ------------------------------------------------------------ |
| `available` | Ticket can be listed publicly and reserved by an order       |
| `reserved`  | Ticket is held by an order and cannot be edited by the owner |
| `sold`      | Ticket is sold and cannot be edited by the owner             |

Implemented transitions:

| From        | To          | Trigger                                      |
| ----------- | ----------- | -------------------------------------------- |
| none        | `available` | `POST /api/tickets`                          |
| `available` | `reserved`  | `order.created`                              |
| `reserved`  | `available` | `order.cancelled` for the same holding order |

The uploaded source does not implement a listener that changes tickets to `sold`.

## Field Visibility

Public fields:

```txt
title price artist venue city eventDate eventType category status description imageUrl
```

Private fields added for authenticated reads:

```txt
userId seat
```

Visibility by route:

| Route                  | Unauthenticated                       | Authenticated                                        |
| ---------------------- | ------------------------------------- | ---------------------------------------------------- |
| `GET /api/tickets`     | Public fields, only available tickets | Public fields plus `userId` and `seat`, all statuses |
| `GET /api/tickets/:id` | Public fields                         | Public fields plus `userId` and `seat`               |

## Validation Rules

### Create Validation

| Field         | Rule                                                            |
| ------------- | --------------------------------------------------------------- |
| `title`       | Required string, trimmed, non-empty, minimum length `3`         |
| `price`       | Required number greater than `0`                                |
| `artist`      | Required string, trimmed, non-empty                             |
| `venue`       | Required string, trimmed, non-empty                             |
| `city`        | Required string, trimmed, non-empty                             |
| `eventDate`   | Required ISO8601 date, then schema requires future date         |
| `eventType`   | Required, must be a valid `EventType`                           |
| `category`    | Required, must be a valid `TicketCategory`                      |
| `seat`        | Rejected on create; use `seats` array instead                   |
| `seats`       | Optional non-empty array, max `50`, each entry non-empty string |
| `quantity`    | Optional integer from `1` to `50`                               |
| `description` | Optional string, trimmed, non-empty                             |
| `imageUrl`    | Optional valid URL                                              |

If `seats` and `quantity` are both present, `quantity` must equal `seats.length`.

### Update Validation

All update fields are optional, but at least one editable field must be provided.

| Field         | Rule                                                    |
| ------------- | ------------------------------------------------------- |
| `title`       | Optional string, trimmed, non-empty, minimum length `3` |
| `price`       | Optional number greater than `0`                        |
| `artist`      | Optional string, trimmed, non-empty                     |
| `venue`       | Optional string, trimmed, non-empty                     |
| `city`        | Optional string, trimmed, non-empty                     |
| `eventDate`   | Optional strict ISO8601 date                            |
| `eventType`   | Optional valid `EventType`                              |
| `category`    | Optional valid `TicketCategory`                         |
| `seat`        | Optional string, trimmed, non-empty                     |
| `description` | Optional string, trimmed, non-empty                     |
| `imageUrl`    | Optional valid URL                                      |

## Concurrency and Reservation Safety

The service uses several safeguards around ticket state.

### Transactional Batch Creation

`POST /api/tickets` saves all tickets in a MongoDB transaction.

This avoids partial batch creation: if one ticket in a multi-seat batch fails, none of the tickets are committed and no events are published.

### Optimistic Concurrency

The `Ticket` schema enables:

```ts
optimisticConcurrency: true;
```

The update route catches Mongoose `VersionError` and returns:

```txt
Ticket was modified concurrently, please try again
```

with HTTP `400`.

### Atomic Reservation

`OrderCreatedListener` reserves a ticket with a single `findOneAndUpdate` filtered by:

```ts
{ _id: ticketId, status: TicketStatus.AVAILABLE }
```

It sets:

```ts
{ status: TicketStatus.RESERVED, orderId: data.id }
```

and increments `version`.

If the ticket is already reserved by the same order, the listener acknowledges the redelivered event without publishing another update.

If the ticket is already held by a different order, the listener logs a consistency error, acknowledges the event, and does not change the ticket.

### Atomic Release

`OrderCancelledListener` releases a ticket with a single `findOneAndUpdate` filtered by:

```ts
{ _id: ticketId, status: TicketStatus.RESERVED, orderId: data.id }
```

It sets the ticket back to `available`, unsets `orderId`, increments `version`, and publishes `ticket.updated`.

If the ticket is already available, sold, or reserved by another order, the listener logs a warning, acknowledges the event, and does not publish.

## Event Integration

### Consumed Events

| Subject           | Listener                 | Durable Name                      | Main Behavior                              |
| ----------------- | ------------------------ | --------------------------------- | ------------------------------------------ |
| `order.created`   | `OrderCreatedListener`   | `tickets-service-order-created`   | Reserves an available ticket for the order |
| `order.cancelled` | `OrderCancelledListener` | `tickets-service-order-cancelled` | Releases a ticket reserved by that order   |

### Published Events

| Subject          | Publisher                | Trigger                                           |
| ---------------- | ------------------------ | ------------------------------------------------- |
| `ticket.created` | `TicketCreatedPublisher` | Successful ticket creation                        |
| `ticket.updated` | `TicketUpdatedPublisher` | Successful ticket update, reservation, or release |

Published `ticket.created` payload:

```ts
{
  id: ticket.id;
  title: ticket.title;
  price: ticket.price;
  userId: ticket.userId;
  status: ticket.status;
  version: ticket.version;
}
```

Published `ticket.updated` payload:

```ts
{
  id: ticket.id;
  title: ticket.title;
  price: ticket.price;
  userId: ticket.userId;
  status: ticket.status;
  version: ticket.version;
}
```

## NATS and JetStream Behavior

The service connects to NATS with:

```ts
connect({
  servers: [process.env.NATS_URL],
  name: "tickets-service",
  pingInterval: 5000,
  maxPingOut: 2,
  waitOnFirstConnect: true,
  maxReconnectAttempts: -1,
  reconnectTimeWait: 2000,
});
```

After connecting, it ensures the JetStream stream exists through `JetStreamSetupService`.

The shared event stream name in the available common source is:

```txt
EVENTS
```

Connection health handling:

| NATS status                  | Service behavior                            |
| ---------------------------- | ------------------------------------------- |
| Connected and stream ensured | Marks NATS ready                            |
| Disconnect                   | Marks NATS not ready                        |
| Reconnect                    | Re-ensures JetStream, then marks NATS ready |
| Error                        | Marks NATS not ready                        |
| Closed                       | Marks NATS not ready                        |

The shared base listener uses explicit acknowledgement and durable consumers.

## Docker

The Dockerfile uses:

```txt
node:alpine
```

Container setup:

- Installs `ca-certificates`.
- Copies `caddy-root.crt` into the trusted certificate store.
- Sets `NODE_OPTIONS=--use-openssl-ca`.
- Sets `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt`.
- Enables Corepack.
- Creates `/app` owned by the `node` user.
- Runs the container as `node`.
- Installs production dependencies with `yarn install --frozen-lockfile --production=true`.
- Starts with `yarn start`.

Docker command:

```dockerfile
CMD ["yarn", "start"]
```

The `.dockerignore` excludes:

- `node_modules`
- `.git`
- Markdown files
- `.env*`
- npm debug logs
- test files
- `__test__` folders
- `.dockerignore`
- `Dockerfile`

Because Markdown files are ignored, this README is not copied into the image by the current Dockerfile build context.

## Kubernetes

The tickets deployment is defined as:

```txt
tickets-depl
```

Container image:

```txt
ahsan2882/tickets
```

The deployment runs one replica.

### Init Containers

| Init Container           | Waits For                 |
| ------------------------ | ------------------------- |
| `wait-for-nats`          | `nats-srv:4222`           |
| `wait-for-tickets-mongo` | `tickets-mongo-srv:27017` |

### Runtime Environment

Kubernetes config sets:

```yaml
NATS_URL: nats://nats-srv:4222
NODE_ENV: development
TICKETS_MONGO_URI: mongodb://tickets-mongo-srv:27017/tickets
```

`JWT_KEY` is loaded from:

```yaml
secretKeyRef:
  name: jwt-secret
  key: JWT_KEY
```

### Probes

The tickets container defines:

| Probe     | Path       |   Port | Timing                                                                |
| --------- | ---------- | -----: | --------------------------------------------------------------------- |
| Startup   | `/healthz` | `3000` | `periodSeconds: 5`, `failureThreshold: 30`                            |
| Readiness | `/readyz`  | `3000` | `initialDelaySeconds: 5`, `periodSeconds: 5`, `failureThreshold: 24`  |
| Liveness  | `/healthz` | `3000` | `initialDelaySeconds: 20`, `periodSeconds: 10`, `failureThreshold: 3` |

### Service

Kubernetes service:

```txt
tickets-srv
```

Port mapping:

```yaml
port: 3000
targetPort: 3000
```

### MongoDB

Mongo deployment:

```txt
tickets-mongo-depl
```

Mongo service:

```txt
tickets-mongo-srv:27017
```

The Mongo container sets:

```yaml
GLIBC_TUNABLES: glibc.pthread.rseq=1
```

The Mongo readiness probe checks TCP port `27017`.

### NATS

The local NATS manifest enables JetStream and exposes:

| Service Port | Purpose                 |
| -----------: | ----------------------- |
|       `4222` | NATS client connections |
|       `8222` | NATS monitoring         |

NATS JetStream stores data under:

```txt
/data/nats/jetstream
```

The provided manifest uses an `emptyDir` volume for NATS storage.

### Ingress

The local ingress routes:

```txt
/api/tickets/?(.*) -> tickets-srv:3000
```

Host:

```txt
ticketing-app.com
```

## Testing

Test stack:

- Jest
- ts-jest
- Supertest
- mongodb-memory-server
- MongoMemoryReplSet

Jest setup file:

```txt
src/test/setup.ts
```

Test setup behavior:

- Sets `JWT_KEY` to `testing_jwt_key`.
- Starts an in-memory MongoDB replica set using `wiredTiger`.
- Connects Mongoose to the in-memory Mongo URI.
- Clears all collections before each test.
- Drops and closes the database after all tests.
- Stops the in-memory MongoDB replica set after all tests.
- Mocks `../nats-client`.
- Adds `global.signin()` to create a session cookie.

The NATS mock exposes a fake JetStream publisher that resolves:

```ts
{ seq: 1, stream: "mock", duplicate: false }
```

### Route Test Coverage

The uploaded tests cover:

- Create-ticket authentication.
- Create-ticket validation for required fields, strings, price, dates, enums, seats, quantity, description, and image URL.
- Multi-seat and quantity-based batch creation.
- Transactional rollback on partial batch failure.
- Event publishing for created tickets.
- Mass-assignment protection for `id`, `userId`, `status`, and `version` during create.
- Public and authenticated ticket listing.
- Public vs private field projection.
- Pagination with `limit` and `skip`.
- Sorting and empty-list behavior.
- Single-ticket lookup validation and not-found behavior.
- Direct lookup of non-available tickets.
- Update-ticket authentication, ownership, validation, status guards, event publishing, and concurrent modification handling.

### Model Test Coverage

The uploaded model tests cover:

- Ticket model validation.
- Required fields.
- Default status behavior.
- JSON transform behavior.
- Version behavior.
- Field trimming and persistence behavior.

### Listener Test Coverage

The uploaded listener tests cover:

- `OrderCreatedListener` reserving available tickets.
- `OrderCreatedListener` setting `orderId`.
- Version increments on reservation.
- `ticket.updated` publishing after reservation.
- Idempotent redelivery handling.
- Concurrent reservation behavior.
- `OrderCancelledListener` releasing tickets for the matching order.
- `OrderCancelledListener` unsetting `orderId`.
- Version increments on release.
- `ticket.updated` publishing after release.
- No-op behavior for stale or non-cancellable cancellations.
- Missing-ticket error behavior.

## Build Output

The build command uses:

```bash
tsc -p tsconfig.build.json
```

The TypeScript config compiles from:

```txt
src
```

to:

```txt
build
```

Important compiler options:

| Option                         | Value     |
| ------------------------------ | --------- |
| `module`                       | `es2022`  |
| `target`                       | `es2022`  |
| `moduleResolution`             | `bundler` |
| `strict`                       | `true`    |
| `isolatedModules`              | `true`    |
| `verbatimModuleSyntax`         | `true`    |
| `noUncheckedSideEffectImports` | `true`    |
| `noUncheckedIndexedAccess`     | `true`    |
| `exactOptionalPropertyTypes`   | `true`    |
| `rootDir`                      | `./src`   |
| `outDir`                       | `./build` |

The build config excludes:

- `node_modules`
- `src/**/*.test.ts`
- `src/**/*.spec.ts`
- `src/**/__tests__/**`
- `src/test/*.ts`
- `src/__mocks__/**`

Note: the uploaded test folders are named `__test__`, while `tsconfig.build.json` excludes `__tests__`. The Docker `.dockerignore` excludes `**/__test__`, but the TypeScript build exclusion does not explicitly exclude `__test__`.

## Troubleshooting

### Service Fails on Missing Environment Variables

Check that all required variables are present:

```bash
NODE_ENV=development
JWT_KEY=...
TICKETS_MONGO_URI=mongodb://tickets-mongo-srv:27017/tickets
NATS_URL=nats://nats-srv:4222
```

### `/readyz` Returns 503

`/readyz` returns `503` when either MongoDB or NATS is not ready.

Check:

- MongoDB connection state.
- `TICKETS_MONGO_URI`.
- NATS connection state.
- `NATS_URL`.
- NATS JetStream availability.

### Create Ticket Returns 400 for `seat`

The create route rejects singular `seat`. Use:

```json
{
  "seats": ["A1", "A2"]
}
```

or use `quantity` for multiple seatless tickets.

### Public List Does Not Show Reserved or Sold Tickets

Unauthenticated `GET /api/tickets` only returns tickets with status `available`. Use direct lookup by id or an authenticated request when the workflow requires other statuses.

### Ticket Update Returns Reserved or Sold Guard

Owners cannot edit tickets while their status is `reserved` or `sold`. The ticket must be available again before updates are accepted.

### Order Event Does Not Change Ticket State

`OrderCreatedListener` only reserves tickets currently in `available` status.

`OrderCancelledListener` only releases tickets currently in `reserved` status and held by the same order id from the event.

Stale or duplicate events are acknowledged without changing the ticket.

## Known Limitations and Notes

- The service has no OpenAPI/Swagger route.
- The uploaded package has no `lint` script.
- The uploaded source does not implement a listener that marks tickets as `sold`.
- The `Ticket` JSON transform does not include `orderId`, even though the field is stored internally.
- Authenticated ticket reads include private fields for any authenticated user, not only the ticket owner.
- The create route publishes ticket-created events after the transaction commits. If event publishing fails after database commit, the created tickets remain saved.
- `tsconfig.build.json` excludes `__tests__` but the uploaded test folders are named `__test__`; verify the build output if tests are unexpectedly compiled.
