# @venuepass/common

A shared library containing common utilities, middlewares, errors, event publishers/listeners, and models for the VenuePass ticketing system.

## **Table of contents**

- [@venuepass/common](#venuepasscommon)
  - [**Table of contents**](#table-of-contents)
  - [Overview](#overview)
  - [Installation](#installation)
  - [Tech Stack](#tech-stack)
  - [Package Scripts](#package-scripts)
  - [Project Structure](#project-structure)
  - [Exports](#exports)
    - [Errors](#errors)
    - [Middleware](#middleware)
    - [Events](#events)
    - [Models And Enums](#models-and-enums)
    - [Health](#health)
  - [Components](#components)
    - [Error System](#error-system)
      - [BadRequestError](#badrequesterror)
      - [NotFoundError](#notfounderror)
      - [RequestValidationError](#requestvalidationerror)
      - [ServiceConnectionError](#serviceconnectionerror)
      - [UnauthorizedError](#unauthorizederror)
    - [Middlewares](#middlewares)
      - [`currentUser`](#currentuser)
      - [`requireAuth`](#requireauth)
      - [`validateRequest`](#validaterequest)
      - [`errorHandler`](#errorhandler)
    - [Event System (NATS)](#event-system-nats)
      - [Subjects](#subjects)
      - [Publisher Base Class](#publisher-base-class)
      - [Listener Base Class](#listener-base-class)
      - [JetStream Setup](#jetstream-setup)
        - [`ensureStream()`](#ensurestream)
        - [`ensureConsumer(config)`](#ensureconsumerconfig)
      - [Event Contracts](#event-contracts)
        - [Ticket Events](#ticket-events)
        - [Order Events](#order-events)
        - [Payment Events](#payment-events)
        - [Expiration Events](#expiration-events)
    - [Shared Models](#shared-models)
      - [**OrderStatus**](#orderstatus)
      - [**EventType**](#eventtype)
      - [**TicketCategory**](#ticketcategory)
      - [**TicketStatus**](#ticketstatus)
      - [**UserPayload**](#userpayload)
    - [Health State](#health-state)
      - [Usage with Express](#usage-with-express)
  - [Environment Variables](#environment-variables)
    - [`JWT_KEY`](#jwt_key)
  - [TypeScript Configuration](#typescript-configuration)
  - [Publishing](#publishing)
    - [Known Limitations](#known-limitations)
  - [License](#license)

## Overview

A shared library providing:

- **Express Middlewares**: Authentication (currentUser, requireAuth), validation (validateRequest), and error handling (errorHandler)
- **Custom Errors**: Type-safe error classes (BadRequestError, NotFoundError, UnauthorizedError, RequestValidationError, ServiceConnectionError) with serialization for consistent API responses
- **Event System**: NATS-based pub/sub with abstract `Publisher<T>` and `Listener<T>` patterns for inter-service communication
- **Models**: Shared TypeScript interfaces/types (UserPayload, Event, OrderStatus, EventType, TicketCategory, TicketStatus, SerializedError)
- **JetStream Setup**: JetStreamSetupService for managing NATS streams and durable consumers

## Installation

```bash
yarn add @venuepass/common
```

Or if you're a contributor:

```bash
cd /ticketing_app/common
yarn build
```

This compiles TypeScript source (src/) to build/ and regenerates type definitions (build/index.d.ts).

## Tech Stack

- TypeScript
- Node.js
- Express
- express-validator
- cookie-session request typing
- jsonwebtoken
- NATS JetStream
- TypeORM
- Jest

## Package Scripts

```bash
yarn build
```

Runs `yarn clean && tsc`, removing the previous build output and compiling `src/` into `build/`

```bash
yarn clean
```

Removes files from `build/` using `del-cli`.

```bash
yarn sync-readme-version
```

Updates the README package version marker from `package.json`.

```bash
yarn version
```

Runs the README version sync and stages `README.md`.

```bash
yarn release:patch
yarn release:minor
yarn release:major
```

Bumps the package version and publishes the package.

## Project Structure

```txt
common/
 ├── src/
 │   ├── errors/              # Custom error classes extending CustomError
 │   │   ├── base-error.ts            # Abstract CustomError with serializeErrors()
 │   │   ├── bad-request-error.ts     # BadRequestError (400)
 │   │   ├── not-found-error.ts       # NotFoundError (404)
 │   │   ├── request-validation-error.ts  # RequestValidationError (400, express-validator errors)
 │   │   ├── service-connection-error.ts # ServiceConnectionError (500)
 │   │   └── unauthorized-error.ts    # UnauthorizedError (401)
 │   ├── events/              # NATS event system
 │   │   ├── base/            # Abstract Publisher/Listener patterns
 │   │   │   ├── base-listener.ts           # Listener<T> with durable name pattern
 │   │   │   └── base-publisher.ts          # Publisher<T> for pub/sub
 │   │   ├── expiration/      # Expiration event types
 │   │   │   └── expiration-complete-event.ts
 │   │   ├── jetstream-setup.ts      # JetStreamSetupService (stream/consumer management)
 │   │   ├── orders/          # Order lifecycle events
 │   │   │   ├── order-awaiting-payment-event.ts
 │   │   │   ├── order-cancelled-event.ts
 │   │   │   ├── order-completed-event.ts
 │   │   │   └── order-created-event.ts
 │   │   ├── payments/        # Payment lifecycle events
 │   │   │   └── payment-cleared-event.ts
 │   │   ├── tickets/         # Ticket events
 │   │   │   ├── ticket-created-event.ts
 │   │   │   └── ticket-updated-event.ts
 │   │   └── event.model.ts           # Event interface, EVENTS stream, SUBJECTS enum
 │   ├── health/              # Health check state
 │   │   └── health-state.ts
 │   ├── middlewares/         # Express middleware functions
 │   │   ├── current-user.ts      # JWT session auth: req.currentUser
 │   │   ├── error-handler.ts     # Global error handler with CustomError support
 │   │   ├── require-auth.ts      # Authentication guard (throws UnauthorizedError)
 │   │   └── validate-request.ts  # express-validator middleware
 │   ├── models/             # Shared TypeScript interfaces
 │   │   ├── event.model.ts       # Event<T>, EVENTS stream, SUBJECTS enum
 │   │   ├── order.model.ts       # OrderStatus enum
 │   │   ├── serialize-error.model.ts      # SerializedError interface
 │   │   ├── ticket.model.ts      # EventType, TicketCategory, TicketStatus enums
 │   │   └── user.model.ts        # UserPayload interface
 │   └── index.ts             # Barrel exports
 ├── build/                  # Compiled output (after yarn build)
 │   ├── errors/
 │   ├── events/
 │   ├── health/
 │   ├── middlewares/
 │   ├── models/
 │   ├── index.js            # CommonJS entry point
 │   ├── index.d.ts          # Type definitions
 │   └── index.d.ts.map      # Source map for types
 ├── package.json
 ├── tsconfig.json           # TypeScript config (strict mode, ES2022, CommonJS)
 ├── scripts/
 │   └── sync-readme-version.js  # Automation: updates README version marker
 └── yarn.lock
```

## Exports

The public API is exported from `src/index.ts`.

### Errors

- CustomError
- BadRequestError
- NotFoundError
- RequonestValidationError
- ServiceConnectionError
- UnauthorizedError

### Middleware

- currentUser
- requireAuth
- validateRequest
- errorHandler

### Events

- Publisher
- Listener
- JetStreamSetupService
- ConsumerConfig
- ExpirationCompleteEvent
- OrderAwaitingPaymentEvent
- OrderCancelledEvent
- OrderCompletedEvent
- OrderCreatedEvent
- PaymentClearedEvent
- TicketCreatedEvent
- TicketUpdatedEvent

### Models And Enums

- STREAM_NAME
- SUBJECTS
- Event
- OrderStatus
- SerializedError
- EventType
- TicketCategory
- TicketStatus
- UserPayload

### Health

- HealthState

## Components

### Error System

All errors extend `CustomError` and implement `serializeErrors()`:

The shared API error response shape is:

```typescript
interface SerializedError {
  message: string;
  field?: string;
}
```

#### BadRequestError

Represents a `400` response.

```typescript
new BadRequestError("Invalid email", "email");
```

Serializes to:

```typescript
[{ message: "Invalid email", field: "email" }];
```

#### NotFoundError

Represents a `404` response.

```typescript
new NotFoundError("Ticket not found");
```

#### RequestValidationError

Represents a `400` response from `express-validator` validation failures.
It serializes only field validation errors and maps each error to:

```typescript
{
  message: error.msg;
  field: error.path;
}
```

#### ServiceConnectionError

Represents a `500` response for service dependency failures.

```typescript
new ServiceConnectionError("Error connecting to NATS");
```

#### UnauthorizedError

Represents a `401` response with the message `Not authorized`.

### Middlewares

#### `currentUser`

Reads `req.session.jwt`, verifies it with `process.env.JWT_KEY`, and attaches the decoded user payload to `req.currentUser` when the token is valid.

Expected payload fields:

```typescript
interface UserPayload {
  id: string;
  email: string;
  name: string;
}
```

If the session has no JWT, or verification fails, the middleware continues without setting `req.currentUser`.

#### `requireAuth`

Requires `req.currentUser` to be present.

If no current user exists, it throws `UnauthorizedError`.

Use it after `currentUser`.

#### `validateRequest`

Reads validation results from `express-validator`.

If validation errors exist, it throws `RequestValidationError`.

#### `errorHandler`

Handles errors in a consistent response format.

For `CustomError` instances:

```typescript
{
  errors: error.serializeErrors();
}
```

For unexpected errors:

```typescript
{
  errors: [{ message: "Something went wrong" }];
}
```

### Event System (NATS)

The package provides a shared NATS JetStream event envelope:

```typescript
interface Event<TData> {
  subject: SUBJECTS;
  data: TData;
}
```

All supported events publish to the shared stream:

```typescript
const STREAM_NAME = "EVENTS";
```

#### Subjects

| Enum                            | Subject                  |
| ------------------------------- | ------------------------ |
| `SUBJECTS.ExpirationComplete`   | `expiration.complete`    |
| `SUBJECTS.OrderAwaitingPayment` | `order.awaiting-payment` |
| `SUBJECTS.OrderCreated`         | `order.created`          |
| `SUBJECTS.OrderCancelled`       | `order.cancelled`        |
| `SUBJECTS.OrderCompleted`       | `order.completed`        |
| `SUBJECTS.PaymentCleared`       | `payment.cleared`        |
| `SUBJECTS.PaymentRefund`        | `payment.refund`         |
| `SUBJECTS.TicketCreated`        | `ticket.created`         |
| `SUBJECTS.TicketUpdated`        | `ticket.updated`         |

#### Publisher Base Class

`Publisher<TEvent>` wraps JetStream publishing.

A concrete publisher must define a `subject` and pass a NATS connection to the base class.

```typescript
import {
  Publisher,
  SUBJECTS,
  type TicketCreatedEvent,
} from "@venuepass/common";
import type { NatsConnection } from "nats";

class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  readonly subject = SUBJECTS.TicketCreated;

  constructor(client: NatsConnection) {
    super(client);
  }
}
```

Usage:

```typescript
await new TicketCreatedPublisher(client).publish({
  id: ticket.id,
  title: ticket.title,
  price: ticket.price,
  userId: ticket.userId,
  status: ticket.status,
  version: ticket.version,
});
```

The publisher wraps the payload in the shared event envelope before publishing:

```typescript
{
  subject: (this.subject, data);
}
```

#### Listener Base Class

`Listener<TEvent>` wraps durable JetStream consumption.

A concrete listener must define:

- `subject`
- `durableName`
- `onMessage(data, msg)`

```typescript
import { Listener, SUBJECTS, type TicketUpdatedEvent } from "@venuepass/common";
import type { JsMsg, NatsConnection } from "nats";

class TicketUpdatedListener extends Listener<TicketUpdatedEvent> {
  readonly subject = SUBJECTS.TicketUpdated;
  readonly durableName = "orders-ticket-updated-listener";

  constructor(client: NatsConnection) {
    super(client);
  }

  protected async onMessage(
    data: TicketUpdatedEvent["data"],
    msg: JsMsg,
  ): Promise<void> {
    msg.ack();
  }
}
```

When `listen()` starts, the listener:

1. Gets a JetStream manager from the NATS connection.
2. Ensures the shared EVENTS stream exists.
3. Ensures the durable consumer exists for the listener subject.
4. Starts consuming messages.
5. Parses the shared event envelope.
6. Calls onMessage(data, msg).
7. Sends msg.nak() if message processing throws.

Defaults:

```typescript
ackWaitMs = 5000;
maxDeliveryAttempts = 5;
```

#### JetStream Setup

`JetStreamSetupService` manages the shared stream and durable consumer setup.

##### `ensureStream()`

Checks whether the `EVENTS` stream exists.

If it does not exist, it creates the stream with all values from `SUBJECTS`.

##### `ensureConsumer(config)`

Ensures a durable consumer exists and matches the expected configuration.

```typescript
interface ConsumerConfig {
  readonly durableName: string;
  readonly filterSubject: string;
  readonly ackWaitMs: number;
  readonly maxDeliveryAttempts: number;
}
```

If the consumer does not exist, it is created with:

- explicit ack policy
- deliver all policy
- configured filter subject
- configured ack wait
- configured max delivery attempts

If the consumer already exists, changed values are reconciled with `consumers.update()`.

#### Event Contracts

##### Ticket Events

```typescript
interface TicketCreatedEvent {
  subject: SUBJECTS.TicketCreated;
  data: {
    id: string;
    title: string;
    price: number;
    userId: string;
    status: TicketStatus;
    version: number;
  };
}
```

```typescript
interface TicketUpdatedEvent {
  subject: SUBJECTS.TicketUpdated;
  data: {
    id: string;
    title: string;
    price: number;
    userId: string;
    status: TicketStatus;
    version: number;
  };
}
```

##### Order Events

```typescript
interface OrderCreatedEvent {
  subject: SUBJECTS.OrderCreated;
  data: {
    id: string;
    userId: string;
    status: OrderStatus;
    expiresAt: string;
    version: number;
    ticket: {
      id: string;
      price: number;
    };
  };
}
```

```typescript
interface OrderAwaitingPaymentEvent {
  subject: SUBJECTS.OrderAwaitingPayment;
  data: {
    id: string;
    userId: string;
    status: OrderStatus;
    version: number;
    ticket: {
      id: string;
      price: number;
    };
  };
}
```

```typescript
interface OrderCancelledEvent {
  subject: SUBJECTS.OrderCancelled;
  data: {
    id: string;
    version: number;
    status: OrderStatus;
    ticket: {
      id: string;
    };
  };
}
```

```typescript
interface OrderCompletedEvent {
  subject: SUBJECTS.OrderCompleted;
  data: {
    id: string;
    version: number;
    status: OrderStatus;
  };
}
```

##### Payment Events

```typescript
interface PaymentClearedEvent {
  subject: SUBJECTS.PaymentCleared;
  data: {
    orderId: string;
    stripeId: string;
  };
}
```

##### Expiration Events

```typescript
interface ExpirationCompleteEvent {
  subject: SUBJECTS.ExpirationComplete;
  data: {
    orderId: string;
  };
}
```

### Shared Models

#### **OrderStatus**

```typescript
enum OrderStatus {
  CREATED = "created",
  AWAITING_PAYMENT = "awaiting_payment",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}
```

#### **EventType**

```typescript
enum EventType {
  Concert = "concert",
  Sports = "sports",
  Theatre = "theatre",
  Comedy = "comedy",
  Festival = "festival",
  Conference = "conference",
}
```

#### **TicketCategory**

```typescript
enum TicketCategory {
  STANDARD = "standard",
  VIP = "VIP",
  FLOOR = "floor",
  BALCONY = "balcony",
  BOX = "box",
}
```

#### **TicketStatus**

```typescript
enum TicketStatus {
  AVAILABLE = "available",
  SOLD = "sold",
  RESERVED = "reserved",
}
```

#### **UserPayload**

```typescript
interface UserPayload {
  id: string;
  email: string;
  name: string;
}
```

### Health State

`HealthState<TKey>` tracks readiness across named dependencies.

```typescript
import { HealthState } from "@venuepass/common";

type Dependency = "mongo" | "nats";

const healthState = new HealthState<Dependency>(["mongo", "nats"]);

healthState.setReady("mongo");
healthState.setNotReady("nats");

healthState.isCheckReady("mongo"); // true
healthState.isReady(); // false
healthState.getStatus(); // { mongo: true, nats: false }
```

**Methods**:

| Method              | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `setReady(key)`     | Marks one dependency as ready                                |
| `setNotReady(key)`  | Marks one dependency as not ready                            |
| `isCheckReady(key)` | Returns readiness for one dependency.                        |
| `isReady()`         | Returns `true` only when all tracked dependencies are ready. |
| `getStatus()`       | Returns the readiness map as an object.                      |

#### Usage with Express

```typescript
import express from "express";
import { body } from "express-validator";
import {
  currentUser,
  errorHandler,
  requireAuth,
  validateRequest,
} from "@venuepass/common";

const app = express();

app.use(currentUser);

app.post(
  "/api/tickets",
  requireAuth,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("Price must be greater than 0"),
  ],
  validateRequest,
  async (req, res) => {
    res.status(201).send({ ticket: req.body });
  },
);

app.use(errorHandler);
```

## Environment Variables

### `JWT_KEY`

Required by `currentUser`

```bash
JWT_KEY=your-secret-key-here
```

`currentUser` uses this value to verify `req.session.jwt`.

## TypeScript Configuration

The package compiles from src/ to build/.

Important compiler options:

| Option                         | Value      |
| ------------------------------ | ---------- |
| `rootDir`                      | `./src`    |
| `outDir`                       | `./build`  |
| `module`                       | `commonjs` |
| `target`                       | `es2022`   |
| `moduleResolution`             | `bundler`  |
| `strict`                       | `true`     |
| `declaration`                  | `true`     |
| `declarationMap`               | `true`     |
| `sourceMap`                    | `true`     |
| `noUncheckedIndexedAccess`     | `true`     |
| `exactOptionalPropertyTypes`   | `true`     |
| `isolatedModules`              | `true`     |
| `skipLibCheck`                 | `true`     |
| `esModuleInterop`              | `true`     |
| `allowSyntheticDefaultImports` | `true`     |

## Publishing

Only files under `build/` are included in the published package:

```json
"files": [
  "build/**/*"
]
```

Before publishing, `prepublishOnly` runs:

```bash
yarn build
```

Version helper scripts are available for patch, minor, and major releases:

```bash
yarn release:patch
yarn release:minor
yarn release:major
```

The README version marker is updated by `scripts/sync-readme-version.js`.

### Known Limitations

- No test script is currently defined.
- The package does not create NATS connections itself; consuming services provide the `NatsConnection`.
- `currentUser` depends on cookie-session-style `req.session.jwt`.
- `currentUser` logs JWT verification failures and continues without setting `req.currentUser`.
- Dead-letter stream support is present only as commented TODO code.
- Consumers are configured with explicit acknowledgements, so listener implementations should acknowledge successfully processed messages with `msg.ack()`.

## License

MIT

---

**Version**: <!-- PACKAGE_VERSION -->1.0.67<!-- /PACKAGE_VERSION -->

**Author**: ahsan2882

**Main Entry**: `build/index.js`

**Type Definitions**: `build/index.d.ts`
