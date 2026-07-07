# Expiration Service

Expiration worker service for the VenuePass ticketing system.

This service listens for newly created orders, schedules an expiration job based on each order's `expiresAt` timestamp, and publishes an expiration event when the delay has elapsed. It is a background worker service; it does not expose business API routes.

## Table of Contents

- [Expiration Service](#expiration-service)
  - [Table of Contents](#table-of-contents)
  - [Purpose](#purpose)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Runtime Dependencies](#runtime-dependencies)
  - [Environment Variables](#environment-variables)
  - [Commands](#commands)
  - [Startup Flow](#startup-flow)
  - [Health Checks](#health-checks)
  - [Events](#events)
    - [Consumed Event](#consumed-event)
    - [Published Event](#published-event)
  - [Queue Behavior](#queue-behavior)
  - [NATS / JetStream Behavior](#nats--jetstream-behavior)
  - [Redis / Bull Behavior](#redis--bull-behavior)
  - [Docker](#docker)
  - [Kubernetes](#kubernetes)
  - [TypeScript Configuration](#typescript-configuration)
  - [Limitations and Notes](#limitations-and-notes)

## Purpose

The expiration service coordinates delayed order expiration in the event-driven VenuePass architecture.

Main workflow:

1. Receive an `order.created` event from NATS JetStream.
2. Read the order id and `expiresAt` timestamp from the event payload.
3. Add a delayed Bull job to Redis using the computed expiration delay.
4. When the delayed job runs, publish an `expiration.complete` event with the expired `orderId`.

## Tech Stack

- Node.js
- TypeScript
- ESM modules
- NATS JetStream
- Bull queue
- Redis
- `@venuepass/common`
- `tsx`
- Jest / ts-jest
- Docker
- Kubernetes

## Project Structure

```txt
expiration/
|-- src/
|   |-- events/
|   |   |-- listeners/
|   |   |   `-- order-created-listener.ts
|   |   `-- publishers/
|   |       `-- expiration-complete-publisher.ts
|   |-- queues/
|   |   `-- expiration-queue.ts
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

The service requires:

| Dependency          | Purpose                                                                    |
| ------------------- | -------------------------------------------------------------------------- |
| NATS JetStream      | Receives `order.created` and publishes `expiration.complete`               |
| Redis               | Stores Bull delayed jobs                                                   |
| `@venuepass/common` | Shared events, subjects, base listener/publisher, errors, and health state |
| Node.js             | Runtime for the worker process                                             |

## Environment Variables

| Variable                | Required | Supported / Example Value           | Purpose                       |
| ----------------------- | -------: | ----------------------------------- | ----------------------------- |
| `NODE_ENV`              |      Yes | `development`, `test`, `production` | Validates runtime environment |
| `NATS_URL`              |      Yes | `nats://nats-srv:4222`              | NATS server connection URL    |
| `EXPIRATION_REDIS_HOST` |      Yes | `expiration-redis-srv`              | Redis host used by Bull       |

The service fails startup if any required environment variable is missing. `NODE_ENV` must be one of `development`, `test`, or `production`.

## Commands

```bash
yarn install
```

Install dependencies.

```bash
yarn start
```

Run the service with `tsx watch src/index.ts`.

```bash
yarn build
```

Compile TypeScript using `tsconfig.build.json`.

```bash
yarn test
```

Run Jest in watch mode with no cache.

Note: the uploaded service source does not include test files or `src/test/setup.ts`, although the Jest config references `./src/test/setup.ts`.

## Startup Flow

On startup, `src/index.ts` performs the following sequence:

1. Validate `NODE_ENV`, `NATS_URL`, and `EXPIRATION_REDIS_HOST`.
2. Register graceful shutdown handlers for `SIGINT` and `SIGTERM`.
3. Start the health server on port `3000`.
4. Initialize the Bull expiration queue using Redis.
5. Connect to NATS.
6. Ensure the JetStream stream exists.
7. Start the `order.created` listener.

If Redis or NATS cannot be initialized, startup throws a `ServiceConnectionError`.

## Health Checks

The service starts an HTTP health server on port `3000`.

| Endpoint       | Response                                       |
| -------------- | ---------------------------------------------- |
| `GET /healthz` | Always returns `200` with `{ "status": "ok" }` |
| `GET /readyz`  | Returns `200` when Redis and NATS are ready    |
| `GET /readyz`  | Returns `503` when Redis or NATS is not ready  |
| Any other path | Returns `404` with `{ "status": "not_found" }` |

Readiness response shape:

```json
{
  "status": "ready",
  "redis": true,
  "nats": true
}
```

Not-ready response shape:

```json
{
  "status": "not_ready",
  "redis": false,
  "nats": true
}
```

## Events

### Consumed Event

| Field            | Value                              |
| ---------------- | ---------------------------------- |
| Subject          | `order.created`                    |
| Shared type      | `OrderCreatedEvent`                |
| Listener         | `OrderCreatedListener`             |
| Durable consumer | `expiration-service-order-created` |

Expected event data:

```ts
{
  id: string;
  userId: string;
  status: OrderStatus;
  expiresAt: string;
  version: number;
  ticket: {
    id: string;
    price: number;
  }
}
```

### Published Event

| Field       | Value                         |
| ----------- | ----------------------------- |
| Subject     | `expiration.complete`         |
| Shared type | `ExpirationCompleteEvent`     |
| Publisher   | `ExpirationCompletePublisher` |

Published event data:

```ts
{
  orderId: string;
}
```

## Queue Behavior

The service uses a Bull queue named:

```txt
order:expiration
```

When an `order.created` event is received:

1. The listener parses `expiresAt`.
2. It computes the delay as `expiresAt - now`.
3. If the order is already expired, the delay is clamped to `0`.
4. It adds a Bull job containing the `orderId`.
5. It acknowledges the NATS message after the job is successfully queued.

Bull default job options:

```ts
{
  attempts: 3,
  backoff: 5000
}
```

When a job is processed, the queue publishes:

```ts
{
  orderId: job.data.orderId;
}
```

to `expiration.complete`.

## NATS / JetStream Behavior

The service connects to NATS using:

```ts
connect({
  servers: [process.env.NATS_URL],
  name: "expiration-worker-service",
  pingInterval: 5000,
  maxPingOut: 2,
  waitOnFirstConnect: true,
  maxReconnectAttempts: -1,
  reconnectTimeWait: 2000,
});
```

The shared `JetStreamSetupService` ensures the `EVENTS` stream exists with all shared VenuePass subjects.

The shared base listener configures durable consumers with:

| Setting               | Value    |
| --------------------- | -------- |
| Ack policy            | Explicit |
| Deliver policy        | All      |
| Ack wait              | `5000ms` |
| Max delivery attempts | `5`      |

If message processing fails, the shared base listener logs the error and calls `msg.nak()`.

## Redis / Bull Behavior

Redis readiness is tracked through the Bull queue and Redis client events.

The service marks Redis as ready after:

```ts
expirationQueue.isReady();
```

Redis is marked not ready when:

- Bull emits an `error`
- Redis client emits `end`
- Redis client emits `reconnecting`

Permanent Bull job failure is logged after all retry attempts are exhausted. The source currently has a TODO to surface failed jobs to alerting or a dead-letter queue.

## Docker

The Dockerfile uses:

```txt
node:alpine
```

Important Docker behavior:

- Installs `ca-certificates`
- Copies `caddy-root.crt` into the container trust store
- Sets OpenSSL-related certificate environment variables
- Enables Corepack
- Runs as the `node` user
- Installs production dependencies with `yarn install --frozen-lockfile --production=true`
- Starts the service with `yarn start`

Container command:

```bash
yarn start
```

## Kubernetes

The expiration deployment is defined as `expiration-depl`.

Container image:

```txt
ahsan2882/expiration
```

Configured environment variables:

```yaml
NATS_URL: nats://nats-srv:4222
NODE_ENV: development
EXPIRATION_REDIS_HOST: expiration-redis-srv
```

The deployment uses init containers to wait for:

| Init container   | Waits for                   |
| ---------------- | --------------------------- |
| `wait-for-nats`  | `nats-srv:4222`             |
| `wait-for-redis` | `expiration-redis-srv:6379` |

The Redis deployment is defined as `expiration-redis-depl` and exposes:

```txt
expiration-redis-srv:6379
```

The provided expiration deployment does not define Kubernetes startup, readiness, or liveness probes, even though the service exposes `/healthz` and `/readyz`.

## TypeScript Configuration

The service compiles TypeScript from `src` into `build`.

Important compiler settings:

| Setting                      | Value     |
| ---------------------------- | --------- |
| `module`                     | `es2022`  |
| `target`                     | `es2022`  |
| `moduleResolution`           | `bundler` |
| `strict`                     | `true`    |
| `rootDir`                    | `./src`   |
| `outDir`                     | `./build` |
| `declaration`                | `true`    |
| `sourceMap`                  | `true`    |
| `noUncheckedIndexedAccess`   | `true`    |
| `exactOptionalPropertyTypes` | `true`    |

The build config excludes tests, specs, test setup files, and mocks from the compiled output.

## Limitations and Notes

- The service has no business HTTP API routes.
- The service starts a health server on port `3000`, but the provided Kubernetes expiration deployment does not expose probes or a service for it.
- Failed Bull jobs are logged, but there is no implemented dead-letter queue or alerting path.
- The shared event infrastructure contains TODO comments for poison/dead-letter queue handling.
- Shutdown logs currently say `orders service`, which appears to be a copy/paste message in the expiration service.
- Startup fatal error also says `Error starting orders service`, which appears to be another copy/paste message.
- The uploaded source does not include tests, despite having a Jest command and setup-file reference.
