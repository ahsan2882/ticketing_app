# Payments Service

Payment service for VenuePass.

The payments service owns Stripe PaymentIntent creation, Stripe webhook handling, payment persistence, payment-cleared event publishing, and a local order projection used to validate whether an order can be paid. It exposes HTTP routes under `/api/payments` and participates in the VenuePass event system through NATS JetStream.

## Table of Contents

- [Payments Service](#payments-service)
  - [Table of Contents](#table-of-contents)
  - [Service Role](#service-role)
  - [Main Workflows](#main-workflows)
    - [Create PaymentIntent](#create-paymentintent)
    - [Stripe Webhook flow](#stripe-webhook-flow)
    - [Order Projection Sync](#order-projection-sync)
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
    - [Create Payment](#create-payment)
    - [Stripe Webhook](#stripe-webhook)
  - [Stripe Integration](#stripe-integration)
    - [PaymentIntent Creation](#paymentintent-creation)
    - [Webhook Verification](#webhook-verification)
    - [Refunds](#refunds)
  - [Data Models](#data-models)
    - [Order](#order)
    - [Payment](#payment)
  - [Order Status Handling](#order-status-handling)
  - [Event Integration](#event-integration)
    - [Consumed Events Started at Runtime](#consumed-events-started-at-runtime)
    - [Listener Present but Not Started](#listener-present-but-not-started)
    - [Published Events](#published-events)
    - [Order Event Processing and Versioning](#order-event-processing-and-versioning)
  - [NATS and JetStream Behavior](#nats-and-jetstream-behavior)
  - [Docker](#docker)
  - [Kubernetes and Ingress](#kubernetes-and-ingress)
  - [Testing](#testing)
    - [Mocks](#mocks)
    - [Route Test Coverage](#route-test-coverage)
    - [Listener Test Coverage](#listener-test-coverage)
  - [Build Output](#build-output)
  - [Troubleshooting](#troubleshooting)
    - [Service Fails on Missing Environment Variables](#service-fails-on-missing-environment-variables)
    - [`/readyz` Returns 503](#readyz-returns-503)
    - [Stripe Webhook Returns 400](#stripe-webhook-returns-400)
    - [Payment Creation Returns 404](#payment-creation-returns-404)
    - [Payment Creation Returns Already Cancelled or Already Paid](#payment-creation-returns-already-cancelled-or-already-paid)
    - [Duplicate Stripe Webhooks](#duplicate-stripe-webhooks)
  - [Known Limitations and Notes](#known-limitations-and-notes)

## Service Role

The payments service is responsible for:

- Creating Stripe PaymentIntents for payable orders.
- Returning Stripe client secrets to authenticated buyers.
- Validating Stripe webhook signatures.
- Persisting successful payments.
- Publishing `payment.cleared` after a successful Stripe payment.
- Refunding payments for orders that were already cancelled by the time Stripe reports success.
- Maintaining a local order projection from order events.
- Keeping payment-side order status in sync with the orders service.

The service uses MongoDB as its persistence layer, Stripe as the payment processor, and NATS JetStream for cross-service events.

## Main Workflows

### Create PaymentIntent

1. A signed-in user sends `POST /api/payments` with an `orderId`.
2. The service validates that `orderId` is present and is a valid Mongo ObjectId.
3. The service loads the local order projection.
4. The service verifies that the order belongs to the signed-in user.
5. The service rejects cancelled or completed orders.
6. If the order already has a usable Stripe PaymentIntent, the service returns that PaymentIntent's `client_secret`.
7. Otherwise, the service creates a new Stripe PaymentIntent.
8. The service stores the PaymentIntent id on the local order.
9. The service returns the Stripe `clientSecret`.

### Stripe Webhook flow

1. Stripe sends `POST /api/payments/webhook`.
2. The route reads the raw request body.
3. The route verifies the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`.
4. Only `payment_intent.succeeded` is processed.
5. The route reads `metadata.orderId` from the PaymentIntent.
6. The service loads the local order projection.
7. Completed orders are treated as already processed.
8. Cancelled orders are refunded through Stripe.
9. Active orders create a `Payment` record and publish `payment.cleared`.
10. Duplicate Stripe webhook delivery is deduplicated by `stripeId`.

### Order Projection Sync

The service listens to order events and keeps a local copy of order payment-relevant fields:

- `order.created` creates the local order projection.
- `order.awaiting-payment` moves the local order to `awaiting_payment`.
- `order.cancelled` moves the local order to `cancelled`.
- `order.completed` moves the local order to `completed`.

## Tech Stack

| Area                | Technology                                      |
| ------------------- | ----------------------------------------------- |
| Runtime             | Node.js                                         |
| Language            | TypeScript                                      |
| Module system       | ESM                                             |
| HTTP framework      | Express 5                                       |
| Database            | MongoDB with Mongoose                           |
| Payment provider    | Stripe                                          |
| Events              | NATS JetStream                                  |
| Auth/session        | JWT in `cookie-session`                         |
| Validation          | `express-validator`                             |
| Security middleware | `helmet`                                        |
| Shared package      | `@venuepass/common`                             |
| Tests               | Jest, ts-jest, Supertest, mongodb-memory-server |
| Dev runner          | `tsx watch`                                     |
| Package manager     | Yarn 1.22.22                                    |
| Container           | Docker                                          |

## Project Structure

```txt
payments/
|-- src/
|   |-- __mocks__/
|   |   |-- nats-client.ts
|   |   `-- stripe.ts
|   |-- events/
|   |   |-- listeners/
|   |   |   |-- __test__/
|   |   |   |-- order-awaiting-payment-listener.ts
|   |   |   |-- order-cancelled-listener.ts
|   |   |   |-- order-completed-listener.ts
|   |   |   |-- order-created-listener.ts
|   |   |   `-- payment-refund-listener.ts
|   |   `-- publishers/
|   |       `-- payment-cleared-publisher.ts
|   |-- models/
|   |   |-- order.model.ts
|   |   `-- payment.model.ts
|   |-- routes/
|   |   |-- __test__/
|   |   |-- create-payment.ts
|   |   `-- stripe-webhook.ts
|   |-- test/
|   |   `-- setup.ts
|   |-- app.ts
|   |-- health.ts
|   |-- index.ts
|   |-- nats-client.ts
|   `-- stripe.ts
|-- Dockerfile
|-- package.json
|-- tsconfig.json
|-- tsconfig.build.json
|-- yarn.lock
`-- .npmrc
```

## Runtime Dependencies

| Dependency          | Purpose                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| MongoDB             | Stores local order projections and successful payment records                                 |
| NATS JetStream      | Consumes order lifecycle events and publishes payment lifecycle events                        |
| Stripe              | Creates PaymentIntents, validates webhook signatures, and issues refunds                      |
| `@venuepass/common` | Shared errors, middleware, event types, subjects, base listeners/publishers, and health state |
| JWT secret          | Verifies signed-in users through the shared `currentUser` middleware                          |

## Environment Variables

| Variable                | Required | Example / Source                              | Purpose                                                    |
| ----------------------- | -------: | --------------------------------------------- | ---------------------------------------------------------- |
| `NODE_ENV`              |      Yes | `development`, `test`, `production`           | Controls environment validation and secure cookie behavior |
| `JWT_KEY`               |      Yes | Secret value                                  | Verifies JWT session payloads                              |
| `PAYMENTS_MONGO_URI`    |      Yes | `mongodb://payments-mongo-srv:27017/payments` | MongoDB connection string                                  |
| `NATS_URL`              |      Yes | `nats://nats-srv:4222`                        | NATS server connection URL                                 |
| `STRIPE_SECRET_KEY`     |      Yes | Secret value                                  | Initializes the Stripe SDK                                 |
| `STRIPE_WEBHOOK_SECRET` |      Yes | Secret value                                  | Verifies Stripe webhook signatures                         |

Startup fails if any required variable is missing. `NODE_ENV` must be one of:

- `development`
- `test`
- `production`

Do not commit real Stripe keys, webhook secrets, JWT secrets, or private credentials.

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
4. Connect to MongoDB using `PAYMENTS_MONGO_URI`.
5. Connect to NATS using `NATS_URL`.
6. Ensure the JetStream stream exists.
7. Start order lifecycle listeners.

Started listeners:

- `OrderCreatedListener`
- `OrderCancelledListener`
- `OrderAwaitingPaymentListener`
- `OrderCompletedListener`

If MongoDB or NATS connection setup fails, startup throws a `ServiceConnectionError`.

Graceful shutdown closes:

- HTTP server
- NATS client, using `drain()`
- MongoDB connection

The process exits with code `1` if any shutdown step fails, otherwise it exits with code `0`.

## HTTP Middleware

The Express app is configured in `src/app.ts`.

Global behavior:

- `app.set("trust proxy", true)` is enabled.
- `helmet()` is mounted before routes.
- `stripeWebhookRouter` is mounted before JSON parsing so the webhook route can read the raw body.
- `bodyParser.json()` is mounted after the Stripe webhook route.
- `cookieSession()` stores unsigned sessions.
- `currentUser` from `@venuepass/common` decodes JWT session data into `req.currentUser`.
- Shared `errorHandler` from `@venuepass/common` handles thrown errors.

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

`POST /api/payments` requires authentication through `requireAuth` from `@venuepass/common`.

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

The Stripe webhook route does not use user authentication. It is protected by Stripe signature verification through `STRIPE_WEBHOOK_SECRET`.

## API Routes

### Create Payment

```http
POST /api/payments
```

Auth: required.

Request body:

```json
{
  "orderId": "64f000000000000000000001"
}
```

Validation:

- `orderId` must be a string.
- `orderId` must not be empty.
- `orderId` must be a valid Mongo ObjectId.

Success:

- Status: `201`
- Returns a Stripe client secret.

Response body:

```json
{
  "clientSecret": "pi_mock_123_secret_abc"
}
```

Error behavior:

| Condition                                            | Status |
| ---------------------------------------------------- | -----: |
| Missing or invalid auth                              |  `401` |
| Missing, empty, or invalid `orderId`                 |  `400` |
| Order does not exist in the local payment projection |  `404` |
| Order belongs to another user                        |  `401` |
| Order is cancelled                                   |  `400` |
| Order is completed                                   |  `400` |

PaymentIntent creation behavior:

- Amount is `Math.round(order.price * 100)`.
- Currency is `usd`.
- Payment method type is `card`.
- Description is `Payment for order ${orderId}`.
- Metadata includes `orderId` and `userId`.
- Stripe idempotency key is `payment-intent-order-${orderId}`.
- The created PaymentIntent id is saved on the local order as `stripeId`.

If the order already has a `stripeId`, the service retrieves the existing Stripe PaymentIntent. If its status is not `canceled` and not `succeeded`, the route returns the existing `client_secret` instead of creating a new PaymentIntent.

### Stripe Webhook

```http
POST /api/payments/webhook
```

Auth: Stripe signature required.

Required header:

```http
stripe-signature: <signature from Stripe>
```

The route uses:

```ts
express.raw({ type: "application/json" });
```

This is required because Stripe verifies the exact raw request body.

Processed event:

```txt
payment_intent.succeeded
```

Success response:

```json
{
  "received": true
}
```

Webhook behavior:

| Condition                                       | Behavior                                                    |
| ----------------------------------------------- | ----------------------------------------------------------- |
| Missing `stripe-signature` header               | Returns `400`                                               |
| Invalid webhook signature                       | Returns `400`                                               |
| Event type is not `payment_intent.succeeded`    | Returns `200` and does nothing                              |
| `metadata.orderId` is missing or invalid        | Throws an error                                             |
| Order is not found                              | Returns `404`                                               |
| Order is already completed                      | Returns `200` and does nothing                              |
| Order is cancelled                              | Creates a Stripe refund and returns `200`                   |
| Payment with matching `stripeId` already exists | Returns `200` and does not republish                        |
| New successful payment                          | Saves `Payment`, publishes `payment.cleared`, returns `200` |

## Stripe Integration

Stripe is initialized in `src/stripe.ts`:

```ts
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-06-24.dahlia",
});
```

### PaymentIntent Creation

The service creates PaymentIntents with:

```ts
{
  amount: Math.round(order.price * 100),
  currency: "usd",
  payment_method_types: ["card"],
  description: `Payment for order ${orderId}`,
  metadata: {
    orderId,
    userId: req.currentUser!.id
  }
}
```

The idempotency key is:

```ts
payment-intent-order-${orderId}
```

### Webhook Verification

The webhook route uses:

```ts
stripe.webhooks.constructEvent(
  req.body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!,
);
```

### Refunds

The webhook route creates a refund when a succeeded PaymentIntent belongs to an order that is already cancelled:

```ts
stripe.refunds.create({ payment_intent: paymentIntent.id });
```

`PaymentRefundListener` also exists and creates refunds for `payment.refund` events:

```ts
stripe.refunds.create({ payment_intent: data.stripeId });
```

However, that listener is not started in `src/index.ts` in the uploaded source.

## Data Models

### Order

Defined in `src/models/order.model.ts`.

The payments service stores a local projection of orders, not the full orders service model.

Fields:

| Field        | Type          | Notes                                    |
| ------------ | ------------- | ---------------------------------------- |
| `_id` / `id` | `string`      | Uses the order id from order events      |
| `userId`     | `string`      | Buyer id                                 |
| `price`      | `number`      | Required, minimum `0`                    |
| `status`     | `OrderStatus` | Required                                 |
| `stripeId`   | `string`      | Optional Stripe PaymentIntent id         |
| `version`    | `number`      | Mongoose version key, renamed from `__v` |

Schema behavior:

- `optimisticConcurrency` is enabled.
- `versionKey` is `version`.
- JSON output returns `id`, `userId`, `price`, `status`, and `version`.
- `stripeId` is stored but not included in the model's `toJSON` transform.

### Payment

Defined in `src/models/payment.model.ts`.

Fields:

| Field      | Type     | Notes               |
| ---------- | -------- | ------------------- |
| `orderId`  | `string` | Required            |
| `stripeId` | `string` | Required and unique |

JSON output:

```ts
{
  id: string;
  orderId: string;
  stripeId: string;
}
```

The unique `stripeId` constraint supports webhook idempotency and prevents duplicate payment records for repeated Stripe webhook deliveries.

## Order Status Handling

The payments service reacts to these statuses from `@venuepass/common`:

| Status             | Payment Service Behavior                                                        |
| ------------------ | ------------------------------------------------------------------------------- |
| `created`          | Payment creation is allowed by the current route logic                          |
| `awaiting_payment` | Payment creation is allowed                                                     |
| `cancelled`        | Payment creation is rejected; succeeded webhook creates a refund                |
| `completed`        | Payment creation is rejected; succeeded webhook is treated as already processed |

Payment creation rejects:

- `cancelled`
- `completed`

Payment creation accepts:

- `created`
- `awaiting_payment`

## Event Integration

### Consumed Events Started at Runtime

| Subject                  | Listener                       | Durable Name                              | Main Behavior                                    |
| ------------------------ | ------------------------------ | ----------------------------------------- | ------------------------------------------------ |
| `order.created`          | `OrderCreatedListener`         | `payments-service-order-created`          | Creates local order projection                   |
| `order.cancelled`        | `OrderCancelledListener`       | `payments-service-order-cancelled`        | Updates local order status to `cancelled`        |
| `order.awaiting-payment` | `OrderAwaitingPaymentListener` | `payments-service-order-awaiting-payment` | Updates local order status to `awaiting_payment` |
| `order.completed`        | `OrderCompletedListener`       | `payments-service-order-completed`        | Updates local order status to `completed`        |

### Listener Present but Not Started

| Subject          | Listener                | Durable Name                      | Behavior                                    |
| ---------------- | ----------------------- | --------------------------------- | ------------------------------------------- |
| `payment.refund` | `PaymentRefundListener` | `payments-service-payment-refund` | Creates a Stripe refund for `data.stripeId` |

`PaymentRefundListener` is present in source but is not included in the `Promise.all([...])` listener startup list in `src/index.ts`.

### Published Events

| Subject           | Publisher                 | Trigger                                                       |
| ----------------- | ------------------------- | ------------------------------------------------------------- |
| `payment.cleared` | `PaymentClearedPublisher` | Stripe `payment_intent.succeeded` webhook for an active order |

Published payload:

```ts
{
  orderId: order.id;
  stripeId: paymentIntent.id;
}
```

### Order Event Processing and Versioning

`OrderCreatedListener` uses `findOneAndUpdate` with `$setOnInsert` and `upsert: true`. Redelivered `order.created` events do not create duplicate local orders.

`OrderAwaitingPaymentListener`, `OrderCancelledListener`, and `OrderCompletedListener` update using:

```ts
{ _id: data.id, version: data.version - 1 }
```

and:

```ts
{
  $set: { status: ... },
  $inc: { version: 1 }
}
```

If the update does not match:

| Existing local order state                                 | Listener behavior                  |
| ---------------------------------------------------------- | ---------------------------------- |
| Order is missing                                           | Throws `Order not found`           |
| Existing version is greater than or equal to event version | Acknowledges as stale/duplicate    |
| Existing version is behind expected version                | Throws to let NATS redeliver later |

## NATS and JetStream Behavior

The service connects to NATS with:

```ts
connect({
  servers: [process.env.NATS_URL],
  name: "payments-service",
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

## Kubernetes and Ingress

No payments-specific Kubernetes deployment or service manifest was present in the provided files.

The available ingress manifest routes:

| Path                 | Backend            |
| -------------------- | ------------------ |
| `/api/users/?(.*)`   | `auth-srv:3000`    |
| `/api/tickets/?(.*)` | `tickets-srv:3000` |
| `/api/orders/?(.*)`  | `orders-srv:3000`  |
| `/?(.*)`             | `client-srv:3000`  |

The available ingress manifest does not include a `/api/payments` route. If this service is deployed behind that ingress, a route similar to `/api/payments/?(.*)` would need to exist in the relevant infrastructure, but that route is not present in the provided manifest.

The available NATS manifest exposes:

| Service Port | Purpose                 |
| -----------: | ----------------------- |
|       `4222` | NATS client connections |
|       `8222` | NATS monitoring         |

NATS JetStream stores data under:

```txt
/data/nats/jetstream
```

The provided NATS manifest uses an `emptyDir` volume for NATS storage.

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
- Mocks `../stripe`.
- Adds `global.signin()` to create a session cookie.

### Mocks

The NATS mock exposes a fake JetStream publisher that resolves:

```ts
{ seq: 1, stream: "mock", duplicate: false }
```

The Stripe mock includes:

- `paymentIntents.create`
- `webhooks.constructEvent`

The route tests also mock `PaymentClearedPublisher`.

### Route Test Coverage

The uploaded tests cover:

- Authentication failure for payment creation.
- `orderId` validation.
- Missing order behavior.
- Ownership enforcement.
- Cancelled and completed order rejection.
- Successful payment creation for `created` and `awaiting_payment` orders.
- Stripe PaymentIntent amount conversion to cents.
- Fractional-cent rounding.
- Stripe PaymentIntent metadata.
- Stripe signature header requirement.
- Invalid webhook signature behavior.
- Ignoring non-`payment_intent.succeeded` events.
- Missing order behavior in webhook processing.
- Successful payment persistence.
- `payment.cleared` publishing.
- Webhook response body.
- Completed-order webhook idempotency.
- Duplicate Stripe webhook delivery deduplication.

### Listener Test Coverage

The uploaded tests cover:

- `OrderCreatedListener` durable name and custom durable names.
- Local order projection creation.
- Idempotent redelivery for `order.created`.
- `OrderAwaitingPaymentListener` version-gated updates.
- Stale/duplicate acknowledgement.
- Out-of-order retry behavior.
- `OrderCancelledListener` version-gated updates.
- Stale/duplicate acknowledgement.
- Out-of-order retry behavior.

No uploaded tests were present for:

- `OrderCompletedListener`
- `PaymentRefundListener`

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
PAYMENTS_MONGO_URI=mongodb://payments-mongo-srv:27017/payments
NATS_URL=nats://nats-srv:4222
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

### `/readyz` Returns 503

`/readyz` returns `503` when either MongoDB or NATS is not ready.

Check:

- MongoDB connection state.
- `PAYMENTS_MONGO_URI`.
- NATS connection state.
- `NATS_URL`.
- NATS JetStream availability.

### Stripe Webhook Returns 400

Common causes:

- Missing `stripe-signature` header.
- Invalid Stripe webhook signature.
- Request body was parsed as JSON before reaching the webhook route.
- `STRIPE_WEBHOOK_SECRET` does not match the Stripe webhook endpoint secret.

The webhook route must receive the raw body, which is why it is mounted before `bodyParser.json()`.

### Payment Creation Returns 404

The payment route reads from the local payment-side order projection. If an order exists in the orders service but not in the payments service database, the payments service has not processed the relevant `order.created` event yet.

### Payment Creation Returns Already Cancelled or Already Paid

The route rejects:

- `cancelled` orders with `Order has already been cancelled`
- `completed` orders with `Order has already been paid`

### Duplicate Stripe Webhooks

The webhook route first checks for an existing `Payment` with the same `stripeId`, and the `Payment` schema also marks `stripeId` as unique.

If duplicate webhook deliveries race, duplicate-key errors for `stripeId` are intended to be treated as already processed.

## Known Limitations and Notes

- No payments-specific Kubernetes deployment or service manifest was present in the provided files.
- The available ingress manifest does not include `/api/payments`.
- The service has no OpenAPI/Swagger route.
- The uploaded package has no `lint` script.
- `PaymentRefundListener` exists but is not started in `src/index.ts`.
- `OrderCompletedListener` exists and is started, but no uploaded test file covers it.
- `PaymentRefundListener` has no uploaded test file.
- The health type alias is named `TicketsHealthCheck` even though this is the payments service.
- The fatal startup catch throws `ServiceConnectionError("Error starting tickets service")`, which appears to be a copy-paste message.
- `tsconfig.build.json` excludes `__tests__` but the uploaded test folders are named `__test__`; verify the build output if tests are unexpectedly compiled.
- In the duplicate-key webhook catch, the code compares `mongoError.keyPattern?.stripeId` to the PaymentIntent id. MongoDB duplicate-key errors commonly store the duplicate value in `keyValue`, so this check should be verified against the actual runtime driver error shape.
