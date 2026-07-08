# Orders Service

Ordering service for VenuePass.

The orders service owns order creation, order lookup, cancellation, order status transitions, and the order-side event reactions for tickets, expiration, and payments. It exposes authenticated HTTP routes under `/api/orders` and participates in the VenuePass event system through NATS JetStream.

## Table of Contents

- [Orders Service](#orders-service)
  - [Table of Contents](#table-of-contents)
  - [Service Role](#service-role)
  - [Main Workflows](#main-workflows)
    - [Create an Order](#create-an-order)
    - [Cancel an Order](#cancel-an-order)
    - [Ticket Event Synchronization](#ticket-event-synchronization)
    - [Expiration Workflow](#expiration-workflow)
    - [Payment Workflow](#payment-workflow)
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
    - [Create Order](#create-order)
    - [Find All Orders](#find-all-orders)
    - [Find Order By Id](#find-order-by-id)
    - [Cancel Order](#cancel-order)
    - [Find Order By Ticket](#find-order-by-ticket)
    - [Unknown Routes](#unknown-routes)
  - [Data Models](#data-models)
    - [Order](#order)
    - [Ticket](#ticket)
  - [Order Status Lifecycle](#order-status-lifecycle)
  - [Concurrency and Reservation Safety](#concurrency-and-reservation-safety)
    - [MongoDB Transaction on Create](#mongodb-transaction-on-create)
    - [Unique Partial Index](#unique-partial-index)
    - [Optimistic Concurrency](#optimistic-concurrency)
    - [Version-Gated Ticket Updates](#version-gated-ticket-updates)
  - [Event Integration](#event-integration)
    - [Consumed Events](#consumed-events)
    - [Published Events](#published-events)
    - [Event Payloads Used by the Service](#event-payloads-used-by-the-service)
    - [Listener Idempotency](#listener-idempotency)
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
    - [Listener Test Coverage](#listener-test-coverage)
  - [Build Output](#build-output)
  - [Troubleshooting](#troubleshooting)
    - [Service Fails on Missing Environment Variables](#service-fails-on-missing-environment-variables)
    - [`/readyz` Returns 503](#readyz-returns-503)
    - [Order Creation Returns "Ticket is already reserved"](#order-creation-returns-ticket-is-already-reserved)
    - [Ticket Updates Are Not Applied](#ticket-updates-are-not-applied)
    - [Payment Cleared Publishes Refund](#payment-cleared-publishes-refund)
  - [Known Limitations and Notes](#known-limitations-and-notes)

## Service Role

The orders service is responsible for:

- Creating orders for tickets.
- Preventing double reservation of the same ticket.
- Returning a signed-in user's orders.
- Returning a single order by id.
- Returning an order by ticket id for the ticket seller.
- Cancelling orders.
- Reacting to ticket, expiration, and payment events.
- Publishing order lifecycle events.

The service uses MongoDB as its persistence layer and NATS JetStream for event-driven coordination with the ticketing, expiration, and payment services.

## Main Workflows

### Create an Order

1. A signed-in user sends `POST /api/orders` with a `ticketId`.
2. The service validates that `ticketId` exists and is a valid Mongo ObjectId.
3. The service starts a MongoDB session and transaction.
4. The ticket is loaded from the local `Ticket` collection.
5. The service checks whether the ticket already has an active order.
6. If available, the service creates an order with status `created`.
7. The order receives a default expiration time 15 minutes in the future.
8. The service publishes `order.created`.
9. The service returns the created order with HTTP `201`.

### Cancel an Order

1. A signed-in user sends `DELETE /api/orders/:orderId`.
2. The service validates the order id.
3. The order is loaded and populated with its ticket.
4. The service verifies that the order belongs to the signed-in user.
5. The order status is set to `cancelled`.
6. The service publishes `order.cancelled`.
7. The service returns the cancelled order data with HTTP `200`.

### Ticket Event Synchronization

The orders service maintains a local copy of ticket data for order decisions.

- `ticket.created` creates the local ticket document.
- `ticket.updated` updates the local ticket using version-gated writes.
- If a ticket update says the ticket is reserved, the related order moves from `created` to `awaiting_payment`.

### Expiration Workflow

The expiration service publishes `expiration.complete` when an order's reservation window has elapsed.

The orders service receives that event and:

- Cancels the order if it is still non-terminal.
- Skips processing if the order is already `cancelled` or `completed`.
- Publishes `order.cancelled` when it cancels the order.

### Payment Workflow

The payments service publishes `payment.cleared` after a payment is confirmed.

The orders service receives that event and:

- Skips processing if the order is already `cancelled` or `completed`.
- Verifies that the ticket is still assigned to this order.
- Completes the order and publishes `order.completed` if ownership is still valid.
- Publishes `payment.refund` if the ticket has already been reassigned to another order.

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
orders/
|-- src/
|   |-- __mocks__/
|   |   `-- nats-client.ts
|   |-- events/
|   |   |-- listeners/
|   |   |   |-- __test__/
|   |   |   |-- expiration-complete-listener.ts
|   |   |   |-- payment-cleared-listener.ts
|   |   |   |-- ticket-created-listener.ts
|   |   |   `-- ticket-updated-listener.ts
|   |   `-- publishers/
|   |       |-- order-awaiting-payment-publisher.ts
|   |       |-- order-cancelled-publisher.ts
|   |       |-- order-completed-publisher.ts
|   |       |-- order-created-publisher.ts
|   |       `-- payment-refund-publisher.ts
|   |-- models/
|   |   |-- order.model.ts
|   |   `-- ticket.model.ts
|   |-- routes/
|   |   |-- __test__/
|   |   |-- cancel-order.ts
|   |   |-- create-order.ts
|   |   |-- find-all-orders.ts
|   |   |-- find-order.ts
|   |   `-- find-orders-by-ticket.ts
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

| Dependency          | Purpose                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| MongoDB             | Stores orders and the service's local ticket projection                                         |
| NATS JetStream      | Publishes and consumes domain events                                                            |
| `@venuepass/common` | Shared errors, middlewares, event subjects, event types, publishers/listeners, and health state |
| JWT secret          | Verifies the user session through the shared `currentUser` middleware                           |

## Environment Variables

| Variable           | Required | Supported / Example Value                 | Purpose                                                    |
| ------------------ | -------: | ----------------------------------------- | ---------------------------------------------------------- |
| `NODE_ENV`         |      Yes | `development`, `test`, `production`       | Controls environment validation and secure cookie behavior |
| `JWT_KEY`          |      Yes | Kubernetes secret `jwt-secret.JWT_KEY`    | Verifies JWT session payloads                              |
| `ORDERS_MONGO_URI` |      Yes | `mongodb://orders-mongo-srv:27017/orders` | MongoDB connection string                                  |
| `NATS_URL`         |      Yes | `nats://nats-srv:4222`                    | NATS server connection URL                                 |

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
4. Connect to MongoDB.
5. Connect to NATS.
6. Ensure the JetStream stream exists.
7. Start event listeners for tickets, expiration, and payment events.

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

Not ready response:

```json
{
  "status": "not_ready",
  "mongo": false,
  "nats": true
}
```

`/readyz` returns HTTP `503` if either MongoDB or NATS is not ready.

## Authentication

All business routes require authentication through `requireAuth` from `@venuepass/common`.

The service expects the shared `currentUser` middleware to read a JWT from the session cookie and attach the user payload to `req.currentUser`.

Expected user payload shape from tests:

```ts
{
  id: string;
  email: string;
  name: string;
}
```

Unauthenticated requests return HTTP `401`.

## API Routes

### Create Order

```http
POST /api/orders
```

Auth: required.

Request body:

```json
{
  "ticketId": "64f000000000000000000001"
}
```

Validation:

- `ticketId` is required.
- `ticketId` must be a valid Mongo ObjectId.

Success:

- Status: `201`
- Creates an order.
- Publishes `order.created`.

Example response shape:

```json
{
  "id": "64f000000000000000000101",
  "userId": "64f000000000000000000201",
  "ticket": {
    "id": "64f000000000000000000001",
    "title": "Concert",
    "price": 50,
    "userId": "64f000000000000000000301",
    "version": 0
  },
  "status": "created",
  "expiresAt": "2026-07-07T14:00:00.000Z",
  "createdAt": "2026-07-07T13:45:00.000Z",
  "version": 0
}
```

Error behavior:

| Condition                          | Status |
| ---------------------------------- | -----: |
| Missing or invalid auth            |  `401` |
| Missing or invalid `ticketId`      |  `400` |
| Ticket does not exist              |  `404` |
| Ticket already has an active order |  `400` |

### Find All Orders

```http
GET /api/orders
```

Auth: required.

Query parameters:

| Name    | Default |              Maximum | Behavior                           |
| ------- | ------: | -------------------: | ---------------------------------- |
| `limit` |    `20` |                `100` | Maximum number of orders to return |
| `skip`  |     `0` | Not capped in source | Number of matching orders to skip  |

Only non-negative integer strings are accepted as pagination values. Invalid values fall back to defaults.

Success:

- Status: `200`
- Returns orders belonging to the signed-in user only.
- Sorts by `createdAt` descending.
- Populates the `ticket` field.
- Includes orders of all statuses.

Example:

```http
GET /api/orders?limit=20&skip=0
```

### Find Order By Id

```http
GET /api/orders/:orderId
```

Auth: required.

Success:

- Status: `200`
- Returns the requested order.
- Populates the `ticket` field.
- Only allows the user who owns the order to read it.

Error behavior:

| Condition                     | Status |
| ----------------------------- | -----: |
| Missing or invalid auth       |  `401` |
| Invalid order id              |  `400` |
| Order does not exist          |  `404` |
| Order belongs to another user |  `401` |

### Cancel Order

```http
DELETE /api/orders/:orderId
```

Auth: required.

Success:

- Status: `200`
- Sets the order status to `cancelled`.
- Publishes `order.cancelled`.

Error behavior:

| Condition                                   | Status |
| ------------------------------------------- | -----: |
| Missing or invalid auth                     |  `401` |
| Invalid order id                            |  `400` |
| Order does not exist                        |  `404` |
| Order belongs to another user               |  `401` |
| Order was modified concurrently before save |  `400` |

The route comments note that concurrent modification is a `409`-shaped condition, but the service currently returns `BadRequestError` because no shared `ConflictError` is used.

### Find Order By Ticket

```http
GET /api/orders/by-ticket/:ticketId
```

Auth: required.

This route is intended for ticket sellers. It finds the non-cancelled order for a ticket and only returns it if the signed-in user owns the ticket.

Success:

- Status: `200`
- Returns the order for the ticket.
- Populates the `ticket` field.

Error behavior:

| Condition                                    | Status |
| -------------------------------------------- | -----: |
| Missing or invalid auth                      |  `401` |
| Invalid ticket id                            |  `400` |
| No non-cancelled order exists for the ticket |  `404` |
| Signed-in user is not the ticket seller      |  `401` |

### Unknown Routes

Any unmatched route throws:

```txt
Route not found in orders service
```

The shared error handler formats the response.

## Data Models

### Order

Defined in `src/models/order.model.ts`.

Fields:

| Field       | Type                        | Notes                                    |
| ----------- | --------------------------- | ---------------------------------------- |
| `userId`    | `string`                    | Required, immutable                      |
| `ticket`    | Mongo ObjectId ref `Ticket` | Required, immutable                      |
| `status`    | `OrderStatus`               | Defaults to `created`                    |
| `expiresAt` | `Date`                      | Required                                 |
| `createdAt` | `Date`                      | Created by Mongoose timestamps           |
| `version`   | `number`                    | Mongoose version key, renamed from `__v` |

Order JSON output includes:

```ts
{
  id: string;
  userId: string;
  ticket: Ticket;
  status: OrderStatus;
  expiresAt: Date;
  createdAt: Date;
  version: number;
}
```

Defaults:

- New orders expire after 15 minutes unless `expiresAt` is supplied while building the model.
- `optimisticConcurrency` is enabled.
- `versionKey` is `version`.

Indexes:

The order schema has a unique partial index on `ticket` for active statuses:

```ts
{
  ticket: 1;
}
```

Active statuses in the partial index:

- `created`
- `awaiting_payment`
- `completed`

This allows cancelled orders to exist historically while preventing multiple active orders for the same ticket.

### Ticket

Defined in `src/models/ticket.model.ts`.

The orders service stores a local ticket projection from ticket events.

Fields:

| Field        | Type     | Notes                                                |
| ------------ | -------- | ---------------------------------------------------- |
| `_id` / `id` | `string` | Uses the id from the ticket service event            |
| `title`      | `string` | Required                                             |
| `price`      | `number` | Required, minimum `0`                                |
| `userId`     | `string` | Required; ticket seller id                           |
| `orderId`    | `string` | Optional; set when a ticket is reserved for an order |
| `version`    | `number` | Mongoose version key, renamed from `__v`             |

Ticket JSON output includes:

```ts
{
  id: string;
  title: string;
  price: number;
  userId: string;
  version: number;
}
```

The model exposes:

```ts
isReserved(session?: mongoose.ClientSession): Promise<boolean>
```

`isReserved` checks for an order on the ticket whose status is one of:

- `created`
- `awaiting_payment`
- `completed`

## Order Status Lifecycle

Order statuses come from `@venuepass/common`.

| Status             | Meaning in this service                                                     |
| ------------------ | --------------------------------------------------------------------------- |
| `created`          | Order was created and is waiting for ticket reservation/payment progression |
| `awaiting_payment` | Ticket reservation event was received and the order is ready for payment    |
| `completed`        | Payment was cleared and the ticket still belongs to this order              |
| `cancelled`        | User cancelled the order or expiration completed before payment completion  |

Common transitions implemented by the service:

| From                           | To                 | Trigger                                                |
| ------------------------------ | ------------------ | ------------------------------------------------------ |
| none                           | `created`          | `POST /api/orders`                                     |
| `created`                      | `awaiting_payment` | `ticket.updated` with reserved status                  |
| `created` / `awaiting_payment` | `cancelled`        | `DELETE /api/orders/:orderId` or `expiration.complete` |
| `created` / `awaiting_payment` | `completed`        | `payment.cleared`                                      |

Terminal states in listener logic:

- `cancelled`
- `completed`

Expiration and payment listeners skip already-terminal orders.

## Concurrency and Reservation Safety

The service uses several safeguards to prevent unsafe duplicate reservations or stale updates.

### MongoDB Transaction on Create

`POST /api/orders` starts a MongoDB session and uses `session.withTransaction`.

Inside the transaction:

1. Load the ticket.
2. Check whether the ticket is already reserved.
3. Build and save the order.

### Unique Partial Index

The `Order` model enforces one active order per ticket through a unique partial index.

If two requests race and MongoDB raises duplicate key error `11000`, the route converts that into:

```txt
Ticket is already reserved
```

with HTTP `400`.

### Optimistic Concurrency

Both `Order` and `Ticket` schemas enable:

```ts
optimisticConcurrency: true;
```

The cancel route catches Mongoose `VersionError` and returns a clean `BadRequestError`:

```txt
Order was modified concurrently, please retry
```

### Version-Gated Ticket Updates

`TicketUpdatedListener` applies ticket updates only when the incoming event version is exactly one greater than the current local ticket version.

Behavior:

| Event version          | Behavior                                     |
| ---------------------- | -------------------------------------------- |
| `ticket.version + 1`   | Apply update                                 |
| `<= ticket.version`    | Treat as duplicate/stale and ack             |
| `> ticket.version + 1` | Treat as out-of-order and `nak` with backoff |

If a version-gated update matches zero documents because another writer advanced the version concurrently, the listener calls `msg.nak()` for redelivery.

## Event Integration

### Consumed Events

| Subject               | Listener                     | Durable Name                         | Main Behavior                                                            |
| --------------------- | ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `ticket.created`      | `TicketCreatedListener`      | `orders-service-ticket-created`      | Creates local ticket projection                                          |
| `ticket.updated`      | `TicketUpdatedListener`      | `orders-service-ticket-updated`      | Updates local ticket projection and may mark order as `awaiting_payment` |
| `expiration.complete` | `ExpirationCompleteListener` | `orders-service-expiration-complete` | Cancels non-terminal orders after expiration                             |
| `payment.cleared`     | `PaymentClearedListener`     | `orders-service-payment-cleared`     | Completes valid orders or requests refund if ticket was reassigned       |

### Published Events

| Subject                  | Publisher                       | Trigger                                      | Payload Source         |
| ------------------------ | ------------------------------- | -------------------------------------------- | ---------------------- |
| `order.created`          | `OrderCreatedPublisher`         | Successful `POST /api/orders`                | New order and ticket   |
| `order.cancelled`        | `OrderCancelledPublisher`       | User cancellation or expiration cancellation | Cancelled order        |
| `order.awaiting-payment` | `OrderAwaitingPaymentPublisher` | Reserved ticket update advances an order     | Awaiting-payment order |
| `order.completed`        | `OrderCompletedPublisher`       | Valid payment cleared                        | Completed order        |
| `payment.refund`         | `PaymentRefundPublisher`        | Payment cleared after ticket reassignment    | Order id and Stripe id |

### Event Payloads Used by the Service

`order.created` published payload:

```ts
{
  id: order.id;
  status: order.status;
  userId: order.userId;
  version: order.version;
  expiresAt: order.expiresAt.toISOString();
  ticket: {
    id: order.ticket.id;
    price: order.ticket.price;
  }
}
```

`order.cancelled` published payload:

```ts
{
  id: order.id;
  version: order.version;
  ticket: {
    id: order.ticket.id;
  }
  status: OrderStatus.CANCELLED;
}
```

`order.awaiting-payment` published payload:

```ts
{
  id: order.id;
  userId: order.userId;
  status: order.status;
  version: order.version;
  ticket: order.ticket;
}
```

`order.completed` published payload:

```ts
{
  id: order.id;
  version: order.version;
  status: order.status;
}
```

`payment.refund` published payload:

```ts
{
  orderId: order.id;
  stripeId: data.stripeId;
}
```

### Listener Idempotency

`TicketCreatedListener` is idempotent for redelivered create events:

- If the ticket already exists, it acknowledges the message.
- It does not overwrite the existing local ticket.

`TicketUpdatedListener` handles stale duplicate updates by acknowledging them when the incoming version is less than or equal to the current version.

`ExpirationCompleteListener` and `PaymentClearedListener` acknowledge and skip already-terminal orders.

## NATS and JetStream Behavior

The service connects to NATS with:

```ts
connect({
  servers: [process.env.NATS_URL],
  name: "order-service",
  pingInterval: 5000,
  maxPingOut: 2,
  waitOnFirstConnect: true,
  maxReconnectAttempts: -1,
  reconnectTimeWait: 2000,
});
```

After connecting, it ensures the JetStream stream exists through `JetStreamSetupService`.

The shared event stream name is:

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

The orders deployment is defined as:

```txt
orders-depl
```

Container image:

```txt
ahsan2882/orders
```

The deployment runs one replica.

### Init Containers

| Init Container          | Waits For                |
| ----------------------- | ------------------------ |
| `wait-for-nats`         | `nats-srv:4222`          |
| `wait-for-orders-mongo` | `orders-mongo-srv:27017` |

### Runtime Environment

Kubernetes config sets:

```yaml
NATS_URL: nats://nats-srv:4222
NODE_ENV: development
ORDERS_MONGO_URI: mongodb://orders-mongo-srv:27017/orders
```

`JWT_KEY` is loaded from:

```yaml
secretKeyRef:
  name: jwt-secret
  key: JWT_KEY
```

### Probes

The orders container defines:

| Probe     | Path       |   Port | Timing                                                                |
| --------- | ---------- | -----: | --------------------------------------------------------------------- |
| Startup   | `/healthz` | `3000` | `periodSeconds: 5`, `failureThreshold: 30`                            |
| Readiness | `/readyz`  | `3000` | `initialDelaySeconds: 5`, `periodSeconds: 5`, `failureThreshold: 24`  |
| Liveness  | `/healthz` | `3000` | `initialDelaySeconds: 20`, `periodSeconds: 10`, `failureThreshold: 3` |

### Service

Kubernetes service:

```txt
orders-srv
```

Port mapping:

```yaml
port: 3000
targetPort: 3000
```

### MongoDB

Mongo deployment:

```txt
orders-mongo-depl
```

Mongo service:

```txt
orders-mongo-srv:27017
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
/api/orders/?(.*) -> orders-srv:3000
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

- Auth failures for protected routes.
- Create order validation.
- Missing ticket handling.
- Already-reserved ticket handling.
- Successful order creation.
- `order.created` publishing.
- Find all orders.
- User isolation for order lists.
- Pagination using `limit` and `skip`.
- Find single order.
- Unauthorized reads of another user's order.
- Cancel order validation.
- Unauthorized cancellation.
- Successful cancellation.
- `order.cancelled` publishing.
- Find order by ticket for sellers.

### Listener Test Coverage

The uploaded tests cover:

- `TicketCreatedListener` creating a ticket projection.
- `TicketCreatedListener` idempotently acknowledging duplicate create events.
- `TicketUpdatedListener` version handling.
- `TicketUpdatedListener` stale event acknowledgement.
- `TicketUpdatedListener` out-of-order event redelivery.
- `TicketUpdatedListener` moving orders to `awaiting_payment`.
- `ExpirationCompleteListener` cancelling orders.
- `ExpirationCompleteListener` skipping terminal orders.
- `ExpirationCompleteListener` publish and ack behavior.

There is no uploaded test file for `PaymentClearedListener`.

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

Note: the service test folder in the upload is named `__test__` in several places, while `tsconfig.build.json` excludes `__tests__`. The Docker `.dockerignore` excludes `**/__test__`, but the TypeScript build exclusion does not explicitly exclude `__test__`.

## Troubleshooting

### Service Fails on Missing Environment Variables

Check that all required variables are present:

```bash
NODE_ENV=development
JWT_KEY=...
ORDERS_MONGO_URI=mongodb://orders-mongo-srv:27017/orders
NATS_URL=nats://nats-srv:4222
```

### `/readyz` Returns 503

`/readyz` returns `503` when either MongoDB or NATS is not ready.

Check:

- MongoDB connection state.
- `ORDERS_MONGO_URI`.
- NATS connection state.
- `NATS_URL`.
- NATS JetStream availability.

### Order Creation Returns "Ticket is already reserved"

This can happen when:

- The ticket already has an order in `created`, `awaiting_payment`, or `completed`.
- A concurrent request won the reservation race and MongoDB raised duplicate key error `11000`.

### Ticket Updates Are Not Applied

`TicketUpdatedListener` only applies the next expected version.

If the incoming event version is ahead of the local ticket version, the listener requests redelivery with backoff instead of applying it immediately.

### Payment Cleared Publishes Refund

`PaymentClearedListener` publishes `payment.refund` when the order's populated ticket has an `orderId` that does not match the payment's order id. This protects against completing an order after its ticket has been reassigned.

## Known Limitations and Notes

- The service does not expose API documentation or an OpenAPI/Swagger route.
- The uploaded package has no `lint` script.
- The Dockerfile installs production dependencies, then starts `tsx watch src/index.ts`. Because `tsx` is listed under regular dependencies, this works with the current package setup.
- The service imports `PaymentRefundEvent` and `SUBJECTS.PaymentRefund` from `@venuepass/common`, but the separate uploaded `common.zip` available in this workspace does not show that event in its listed source. The orders service source itself clearly uses the publisher and payload.
- `PaymentClearedListener` has no uploaded test file.
- `tsconfig.build.json` excludes `__tests__` but the uploaded test folders are named `__test__`; verify the build output if tests are unexpectedly compiled.
- The `find all orders` route falls back to default pagination for invalid `limit` and `skip` query values instead of returning validation errors.
- The cancel route returns `BadRequestError` for optimistic concurrency conflicts, although the source comment notes that a conflict-style error would be more semantically accurate.
