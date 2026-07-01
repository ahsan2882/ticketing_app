# @venuepass/common

A shared library containing common utilities, middlewares, errors, event publishers/listeners, and models for the VenuePass ticketing system.

## Overview

This package provides:

- **Express Middlewares**: Authentication, validation, and error handling utilities
- **Custom Errors**: Type-safe error classes with serialization support
- **Event System**: NATS-based pub/sub for inter-service communication
- **Models**: Shared TypeScript interfaces and types

## Installation

```bash
yarn add @venuepass/common
```

Or if you're a contributor:

```bash
cd /mnt/drive1/llm-projects/ticketing_app/common
yarn build
```

## Project Structure

```txt
common/
├── src/
│   ├── errors/           # Custom error classes
│   │   ├── base-error.ts
│   │   ├── bad-request-error.ts
│   │   ├── not-found-error.ts
│   │   ├── request-validation-error.ts
│   │   ├── service-connection-error.ts
│   │   └── unauthorized-error.ts
│   ├── events/           # NATS event system
│   │   ├── base/         # Abstract Listener/Publisher classes
│   │   ├── tickets/      # Ticket-specific events
│   │   ├── jetstream-setup.ts
│   │   ├── nats-client.ts
│   │   └── event.model.ts
│   ├── middlewares/      # Express middleware functions
│   │   ├── current-user.ts
│   │   ├── error-handler.ts
│   │   ├── require-auth.ts
│   │   └── validate-request.ts
│   ├── models/          # TypeScript interfaces
│   │   ├── serialize-error.model.ts
│   │   └── user.model.ts
│   └── index.ts         # Barrel exports
├── build/               # Compiled output (after yarn build)
├── package.json
├── tsconfig.json
└── README.md
```

## Components

### Error System

All errors extend `CustomError` and implement `serializeErrors()`:

#### Base Errors

- **CustomError** - Abstract base class for all custom errors
- **BadRequestError** (400) - Invalid request body with field identification
- **NotFound error** (404) - Resource not found
- **RequestValidationError** (400) - Express-validator errors
- **ServiceConnectionError** (500) - External service connection failures
- **UnauthorizedError** (401) - Authentication failures

#### Error Serialization

```typescript
export interface SerializedError {
  message: string;
  field?: string; // For request validation errors
}
```

### Middlewares

#### `currentUser`

Verifies JWT from session and attaches user payload to `req.currentUser`:

```typescript
req: Request, res: Response, next: NextFunction
// Sets req.currentUser = { id, email, name } if valid
```

#### `requireAuth`

Ensures user is authenticated before proceeding:

```typescript
throw new UnauthorizedError(); // If no currentUser
```

#### `validateRequest`

Validates request data using express-validator:

```typescript
throw new RequestValidationError(errors); // If validation fails
```

#### `errorHandler`

Global error handler that:

- Sends custom errors with proper status codes
- Logs unhandled errors to console
- Returns generic 500 for unexpected errors

### Event System (NATS)

#### Publisher Pattern

All publishers extend `Publisher<TEvent>` and declare a `subject`:

```typescript
abstract class Publisher<TEvent extends Event<any>> {
  readonly subject: TEvent["subject"];

  async publish(data: TEvent["data"]): Promise<PubAck>;
}
```

#### Listener Pattern

All listeners extend `Listener<TEvent>` and declare a `subject` + `durableName`:

```typescript
abstract class Listener<TEvent extends Event<any>> {
  readonly subject: TEvent["subject"];
  readonly durableName: string;

  async listen(): Promise<void>;
  protected abstract onMessage(data: TEvent["data"], msg: JsMsg): Promise<void>;
}
```

#### Stream Configuration

- **Stream Name**: `EVENTS`
- **Subjects**:
  - `ticket.created` (TicketCreated)
  - `ticket.updated` (TicketUpdated)

#### JetStream Setup

Provides `JetStreamSetupService` to:

- Ensure stream exists (`ensureStream`)
- Ensure durable consumer exists (`ensureConsumer`)

### Event Types

#### Ticket Events

**Events**:

- `TicketCreatedEvent` → `ticket.created`
- `TicketUpdatedEvent` → `ticket.updated`

**Event Category Types**:

```typescript
type EventType =
  | "concert"
  | "sports"
  | "theatre"
  | "comedy"
  | "festival"
  | "conference";

type TicketCategory = "GA" | "VIP" | "floor" | "balcony" | "box";

type TicketStatus = "available" | "sold" | "reserved" | "cancelled";
```

**TicketCreatedEvent Data**:

```typescript
{
  id: string;
  title: string;
  price: number;
  userId: string;
  artist: string;
  venue: string;
  city: string;
  eventDate: Date;
  eventType: EventType;
  category: TicketCategory;
  seat: string;
  quantity?: number;
  description?: string;
  imageUrl?: string;
  status?: TicketStatus;
}
```

**TicketUpdatedEvent Data**: (most fields optional)

```typescript
{
  id: string;
  title?: string; // rest are all optional
  price?, userId, artist?, venue?, city?, eventDate?, eventType?, category?, seat?, quantity?, description?, imageUrl?, status?
}
```

### User Model

```typescript
interface UserPayload {
  id: string;
  email: string;
  name: string;
}
```

## Usage Example

### Creating a Publisher

```typescript
import type { Publisher } from "@venuepass/common";
import { natsClient } from "@venuepass/common";

class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  readonly subject = SUBJECTS.TicketCreated;

  constructor(client: typeof natsClient.client) {
    super(client);
  }

  async publish(
    ticketData: Omit<TicketCreatedEvent["data"], "id">,
  ): Promise<void> {
    await this.publish({ ...ticketData, id: uuid() });
  }
}
```

### Creating a Listener

```typescript
import type { Listener } from "@venuepass/common";
import { natsClient } from "@venuepass/common";

class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  readonly subject = SUBJECTS.TicketCreated;
  readonly durableName = "tickets-service-ticket-created-consumer";

  constructor(client: typeof natsClient.client) {
    super(client);
  }

  protected async onMessage(data: TicketCreatedEvent["data"], msg) {
    // Handle the new ticket
    await this.processNewTicket(data);
  }

  private async processNewTicket(data): Promise<void> {
    // Your business logic here
  }
}
```

### Using Middlewares

```typescript
import express from "express";
import {
  currentUser,
  requireAuth,
  validateRequest,
  errorHandler,
} from "@venuepass/common";

const app = express();

// Error handler middleware (last error handling middleware)
app.use(errorHandler);

// Public route without auth
app.get("/public", someController);

// Protected route with validation
app.post(
  "/tickets",
  validateRequest, // Validate request body
  requireAuth, // Check authentication
  ticketsController.createTicket, // Your controller
);
```

## Building

```bash
yarn build
```

This runs:

1. Clean (delete build folder)
2. TypeScript compilation with source maps

## TypeScript Configuration

- **Target**: ES2022
- **Module**: CommonJS
- **Strict Mode**: Enabled (`strict: true`)
- **Source Maps**: Generated
- **Declaration Files**: Generated with maps
- **ES Module Interop**: Enabled
- **No Unused Checks**: Disabled

## Environment Variables

Required for middleware operations:

```bash
JWT_KEY=your-secret-key-here
```

NATS Connection (default):

```yaml
nats://nats-srv:4222 # Kubernetes deployment
# nats://localhost:4222  # Local development
```

## License

ISC

---

**Version**: <!-- PACKAGE_VERSION -->1.0.54<!-- /PACKAGE_VERSION -->

**Author**: ahsan2882

**Main Entry**: `build/index.js`

**Type Definitions**: `build/index.d.ts`
