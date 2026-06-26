# Auth Service

Authentication service for Ticketing App using Express.js, Mongoose, and cookie-based sessions.

## Table of Contents

- [Auth Service](#auth-service)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Environment Variables](#environment-variables)
    - [Cookie \& Session Settings](#cookie--session-settings)
  - [API Reference](#api-reference)
    - [**POST `/api/users/signup`** — Register new user](#post-apiuserssignup--register-new-user)
    - [**POST `/api/users/signin`** — Authenticate existing user](#post-apiuserssignin--authenticate-existing-user)
    - [**GET `/api/users/currentuser`** — Retrieve authenticated user identity](#get-apiuserscurrentuser--retrieve-authenticated-user-identity)
    - [**POST `/api/users/signout`** — Destroy current session](#post-apiuserssignout--destroy-current-session)
  - [Request/Response Examples](#requestresponse-examples)
    - [**POST `/api/users/signup`**](#post-apiuserssignup)
    - [**POST `/api/users/signin`**](#post-apiuserssignin)
    - [**GET `/api/users/currentuser`**](#get-apiuserscurrentuser)
    - [**POST `/api/users/signout`**](#post-apiuserssignout)
  - [User Model/Schema](#user-modelschema)
  - [Auth/Session/Cookie/JWT Behavior](#authsessioncookiejwt-behavior)
  - [Dependencies on @venuepass/common](#dependencies-on-venuepasscommon)
  - [Development](#development)
  - [Testing](#testing)
  - [Docker \& Kubernetes/Skaffold Deployment](#docker--kubernetesskaffold-deployment)
  - [Kubernetes Deployment \& Manifests](#kubernetes-deployment--manifests)
    - [Kubernetes Ports](#kubernetes-ports)
    - [Secrets](#secrets)
  - [Security Considerations](#security-considerations)
    - [Password Storage](#password-storage)
    - [Session Security](#session-security)
    - [Input Validation](#input-validation)
    - [Database Configuration](#database-configuration)
    - [Proxy Configuration](#proxy-configuration)
  - [Error Handling](#error-handling)
  - [Troubleshooting](#troubleshooting)

## Overview

The Auth service is an Express.js microservice responsible for all user authentication and session management within the Ticketing App ecosystem. It operates independently as part of a multi-service architecture (alongside Orders, Tickets, and Client services), handling secure user registration, login, logout, and identity verification.

**Primary Responsibilities:**

- User registration (POST `/api/users/signup`)
- User authentication via email/password (POST `/api/users/signin`)
- Session management using HTTP-only cookies with embedded JWT tokens
- Current user identity retrieval from session (GET `/api/users/currentuser`)
- Session destruction/logout (POST `/api/users/signout`)
- Liveness/readiness health checks for K8s probes

Uses MongoDB for persistent storage with password hashing for security.

**Health Endpoints:**

- `GET /healthz` — Basic liveness check (always returns 200 OK)
- `GET /readyz` — Readiness check requiring MongoDB connection

## Features

**Core Capabilities:**

- **Cookie-based session management** — HTTP-only cookies store JWT tokens signed with `JWT_KEY` secret, encrypted in base64. Session expiry: 1 hour (3600000 ms).
- **Password hashing using scrypt** — Uses Node.js `crypto` module; hash format `<hex-hash>.<salt>` with timing-safe comparison to prevent timing attacks.
- **Input validation with express-validator** — All endpoints use middleware validation rules for email, password length (4-20 chars), and name format (`"FirstName LastName"`).
- **MongoDB integration via Mongoose v9** — Single `users` collection with unique index on email field; pre-save hook automatically hashes passwords.
- **Secure cookie handling** — Secure flag enabled when `NODE_ENV === "production"`; proxy trust enabled for reverse proxy deployments.

**Security Features:**

- Passwords never exposed in responses (omitted from all API payloads)
- Generic error messages prevent user enumeration
- JWT embedded in session tokens expire after 1 hour
- Case-insensitive email lookup with automatic lowercase normalization
- Idempotent signout works even without existing session

## Installation

**Note:** No `.env` file is required locally. Environment variables are typically provided by the deployment system (Kubernetes manifests) or set at runtime.

1. Clone the repository and navigate to the `auth/` directory:

   ```bash
   cd auth
   ```

2. Install dependencies using Yarn:

   ```bash
   yarn install
   ```

   _Note: The Dockerfile includes Caddy certificate (`caddy-root.crt`) for trusting private package registry at `https://npm.home.arpa` during dependency installation._

## Configuration

### Environment Variables

**Note:** No `.env` file exists locally. All environment variables are defined in Kubernetes deployment manifests (see [`../infra/k8s/auth-depl.yaml`](../infra/k8s/auth-depl.yaml)).

| Variable         | Required | Source            | Description                                                                     |
| ---------------- | -------- | ----------------- | ------------------------------------------------------------------------------- |
| `NODE_ENV`       | Yes      | K8s env or secret | Runtime mode: `development`, `test`, or `production`                            |
| `JWT_KEY`        | Yes      | K8s secretRef     | Secret for JWT token signing; stored in secret `jwt-secret` under key `JWT_KEY` |
| `AUTH_MONGO_URI` | Yes      | K8s inline env    | MongoDB connection string (e.g., `mongodb://auth-mongo-srv:27017/auth`)         |

### Cookie & Session Settings

- **Secure cookies**: Enabled when `NODE_ENV === "production"`; disabled in `development`/`test` modes for debugging
- **Session expiration**: 1 hour (`maxAge: 3600000` ms)
- **Cookie name**: `session`
- **Proxy trust**: Enabled (`trust proxy: true`) for deployments behind reverse proxies (e.g., Nginx, ALB)
- **Session storage**: In-memory via `cookie-session`; JWT token embedded in session cookie
- **Cookie encoding**: Session object base64-encoded; JWT stored in `{ jwt: "<token>" }` structure

## API Reference

### **POST `/api/users/signup`** — Register new user

| Field      | Required | Constraints                            | Error Message                                                                          |
| ---------- | -------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `email`    | Yes      | Valid email (e.g., `user@example.com`) | "Please provide a valid email"                                                         |
| `password` | Yes      | 4-20 characters                        | "Password must be between 4 and 20 characters"                                         |
| `name`     | Yes      | Format: `"FirstName LastName"`         | "Name must be a full name in format: 'firstName lastName', each at least 2 characters" |

**Response:** `201 Created` with `{ id, email, name }` and session cookie.

**Notes:** Email is normalized to lowercase. Duplicate emails (case-insensitive) return 400 Bad Request.

---

### **POST `/api/users/signin`** — Authenticate existing user

| Field      | Required | Constraints        | Error Message                  |
| ---------- | -------- | ------------------ | ------------------------------ |
| `email`    | Yes      | Valid email format | "Please provide a valid email" |
| `password` | Yes      | Not empty          | "Password is required"         |

**Response:** `200 OK` with `{ id, email, name }` and session cookie.

**Notes:** Generic "Invalid credentials" error for both non-existent users and wrong passwords (prevents user enumeration).

---

### **GET `/api/users/currentuser`** — Retrieve authenticated user identity

| Parameter | Required | Notes                         |
| --------- | -------- | ----------------------------- |
| Session   | Yes      | Session cookie with valid JWT |

**Response:** `200 OK` with `{ currentUser: { id, email, name } \| null }`.

**Notes:**

- Returns `currentUser: null` when no valid session cookie is present (public endpoint, returns 200 OK)
- Password and password hash are never exposed in responses

---

### **POST `/api/users/signout`** — Destroy current session

**No body required.**

**Response:** `200 OK` with `{}` and cleared session cookie.

**Notes:** Idempotent operation—works even if no existing session is present.

| Endpoint       | Method | Purpose                                      |
| -------------- | ------ | -------------------------------------------- |
| `GET /healthz` | GET    | Liveness check (always returns 200 OK)       |
| `GET /readyz`  | GET    | Readiness check requiring MongoDB connection |

**Startup Probe (`/healthz`):**

- Period: 5 seconds, Failure threshold: 30 attempts
- Used by Kubernetes to detect if container is alive

**Readiness Probe (`/readyz`):**

- Initial delay: 5 seconds, Period: 5 seconds, Failure threshold: 24 attempts
- Returns 503 when MongoDB not connected
- Used by Kubernetes to determine if service can accept traffic

## Request/Response Examples

### **POST `/api/users/signup`**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe"
}
```

### **POST `/api/users/signin`**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe"
}
```

### **GET `/api/users/currentuser`**

```json
{
  "currentUser": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

```json
{
  "currentUser": null
}
```

### **POST `/api/users/signout`**

```json
{}
```

> All responses omit password field. Session cookie set on success with base64-encoded `{ jwt: "<token>" }`.

## User Model/Schema

**Fields:**

| Field      | Type   | Constraints                           |
| ---------- | ------ | ------------------------------------- |
| `email`    | string | Valid email format, unique, lowercase |
| `password` | string | Hashed with scrypt, never exposed     |
| `name`     | string | Format: `"FirstName LastName"`        |
| `id`       | string | Mongoose ObjectId (auto-generated)    |

**Indexes:**

- Email unique index prevents duplicate accounts
- Name is NOT indexed (no unique constraint)

**Pre-save Hook:**

- Automatically hashes password before saving when `isModified("password")`

**toJSON Transform:**

- Exposes `{ id, email, name }` in API responses
- Password hash omitted from all responses

## Auth/Session/Cookie/JWT Behavior

**Session Storage:**

- In-memory via `cookie-session` package (not database-backed)
- Stored in HTTP-only session cookie named `session`
- Base64-encoded structure: `{ jwt: "<JWT_TOKEN>" }`

**Cookie Configuration:**

- **Secure flag**: Enabled when `NODE_ENV === "production"`; disabled in `development`/`test` modes
- **Session expiry**: 1 hour (`maxAge: 3600000` ms)
- **Proxy trust**: Enabled (`trust proxy: true`) for deployments behind reverse proxies

**JWT Details:**

- Signed with `process.env.JWT_KEY` secret (stored in K8s secret `jwt-secret`)
- Expiry: 1 hour from creation time
- Payload contains `{ id, email, name, iat, exp }`
- JWT verification is silent on failure (no currentUser set if invalid)

## Dependencies on @venuepass/common

The Auth service uses the local `@common` package for error handling and middleware functionality.

**Exports Used:**

| Export                   | File Location                         | Usage in Auth Service                           |
| ------------------------ | ------------------------------------- | ----------------------------------------------- |
| `BadRequestError`        | `/errors/bad-request-error.ts`        | Thrown for validation failures                  |
| `NotFoundError`          | `/errors/not-found-error.ts`          | Used in catch-all route                         |
| `ServiceConnectionError` | `/errors/service-connection-error.ts` | Thrown on MongoDB connection failures           |
| `errorHandler`           | `/middlewares/error-handler.ts`       | Centralized error handling middleware           |
| `currentUser`            | `/middlewares/current-user.ts`        | JWT verification, attaches to `req.currentUser` |

**Not Used:**

- `validateRequest` — Auth routes use express-validator directly instead

## Development

**Start Server:**

```bash
yarn start
```

Runs `tsx watch src/index.ts` in watch mode with TypeScript.

**Run Tests:**

```bash
yarn test
```

Uses Jest with ts-jest preset. Setup file: `src/test/setup.ts` initializes MongoDB memory server and provides `global.signin()` helper.

**Docker & Local Testing:**

```bash
docker build -t auth:local .
docker run --rm -p 3000:3000 \
    -e NODE_ENV=development \
    -e JWT_KEY=your-secret-key \
    -e AUTH_MONGO_URI=mongodb://localhost:27017/auth \
    auth:local
```

## Testing

**Test Structure:**

- `src/test/setup.ts` — Initializes MongoDB memory server before all tests, clears database between tests
- `routes/__test__/current-user.test.ts` — 17 tests for current user endpoint
- `routes/__test__/signin.test.ts` — 34 tests covering validation, errors, cookies
- `routes/__test__/signup.test.ts` — 36 tests for registration flow
- `routes/__test__/signout.test.ts` — 13 tests for session destruction

**Global Helper:**

```typescript
const cookie = await global.signin(email, password, name);
```

Automatically performs signup then signin and returns session cookie.

## Docker & Kubernetes/Skaffold Deployment

**Build Configuration:**

```yaml
# From skaffold.yaml
- image: ahsan2882/auth
  context: auth
  docker:
    dockerfile: Dockerfile
```

Skaffold uses manual sync of `src/**/*.ts` files (no rebuild on change).

## Kubernetes Deployment & Manifests

Located in [`../infra/k8s/`](../infra/k8s/):

- [`auth-depl.yaml`](../infra/k8s/auth-depl.yaml) — Auth service deployment with probes, init container
- [`auth-mongo-depl.yaml`](../infra/k8s/auth-mongo-depl.yaml) — MongoDB deployment
- [`ingress-srv.yaml`](../infra/k8s/ingress-srv.yaml) — Nginx ingress routing

### Kubernetes Ports

| Service          | Port  | Protocol |
| ---------------- | ----- | -------- |
| `auth-srv`       | 3000  | TCP      |
| `auth-mongo-srv` | 27017 | TCP      |

### Secrets

The deployment references the following K8s secret:

- **Name**: `jwt-secret`
- **Key**: `JWT_KEY`

## Security Considerations

### Password Storage

**Password Hashing:**

- Passwords are hashed using Node.js `crypto` module's `scrypt` algorithm
- Salt is 64 bytes (hex string representation)
- Hash format: `<hex-hash>.<salt>`
- Timing-safe comparison used to prevent timing attacks

### Session Security

**Secure Flag Logic:**

- `NODE_ENV === "production"`: Cookies are marked secure (`secure: true`)
- **Development/test mode**: Cookies are not marked secure for debugging
- Sessions expire after 1 hour of inactivity
- JWT tokens embedded in sessions also expire after 1 hour

### Input Validation

**Validation Rules:**

- Email: Regex validation for standard format
- Password: Minimum length enforced, no special character requirements
- Name: Must be exactly `"FirstName LastName"` format with word boundaries
- All inputs trimmed to prevent whitespace-based bypasses

### Database Configuration

- Single collection implied by Mongoose schema (`auth.users`)
- Email field normalized to lowercase automatically
- Unique index on email prevents duplicate accounts

### Proxy Configuration

- `trust proxy: true` enabled for reverse proxy deployments (Nginx, ALB)
- Prevents issues with forwarded headers from Nginx/alb/etc.

## Error Handling

**Error Classes (from @venuepass/common):**

| Class                    | HTTP Status | Usage                       |
| ------------------------ | ----------- | --------------------------- |
| `BadRequestError`        | 400         | Validation failures         |
| `NotFoundError`          | 404         | Catch-all routes            |
| `ServiceConnectionError` | 500         | MongoDB connection failures |

**errorHandler Middleware:**

- Catches all CustomError subclasses (BadRequestError, NotFoundError, etc.)
- Returns `{ errors: [{ message }] }` format
- Unknown errors logged to console with generic 500 response

## Troubleshooting

| Issue                      | Solution                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- |
| MongoDB connection fails   | Check AUTH_MONGO_URI is correct; verify auth-mongo-srv service name in cluster DNS     |
| JWT_KEY missing            | Ensure jwt-secret secret exists with JWT_KEY key in K8s                                |
| Health checks fail         | Verify `/healthz` returns 200 and `/readyz` shows mongo: true after MongoDB connection |
| Cookies not set on success | Check NODE_ENV allows session creation (not production-only secure mode context)       |
| Duplicate email errors     | Email lookup is case-insensitive; use same email format for signup/signin              |
