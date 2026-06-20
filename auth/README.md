# Auth Service

Authentication service for Ticketing App using Express.js, Mongoose, and cookie-based sessions.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Development](#development)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)

## Overview

The Auth service manages user authentication including:

- User registration (sign up)
- User authentication (sign in)
- Session management (cookies/JWT)
- Current user retrieval

Uses MongoDB for persistent storage with password hashing for security.

## Features

- Cookie-based session management with JWT fallback
- Password hashing using scrypt (Node crypto)
- Input validation with express-validator
- MongoDB integration via Mongoose v9
- Secure cookie handling (NODE_ENV-aware secure flag)

## Installation

1. Clone the repository and navigate to the `auth/` directory:

   ```bash
   cd /mnt/drive1/llm-projects/ticketing_app/auth
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Set required environment variables in `.env`:

   ```bash
   NODE_ENV=development  # or test/production
   JWT_KEY=<your-secret-key>
   AUTH_MONGO_URI=mongodb://localhost:27017/auth
   ```

## Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Node environment mode | `development`, `test`, `production` |
| `JWT_KEY` | Yes | Secret for JWT token signing | 32+ character random string |
| `AUTH_MONGO_URI` | Yes | MongoDB connection string | `mongodb://auth-mongo-srv:27017/auth` |

### Cookie Settings

- **Secure cookies**: Enabled in production (`NODE_ENV !== development/test`)
- **Session expiration**: 1 hour (`maxAge: 3600000` ms)
- **Proxy trust**: Enabled for remote deployments (`trust proxy: true`)

## API Reference

### Sign Up - `POST /api/users/signup`

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "pass1234",
  "name": "John Doe"
}
```

**Validation Rules:**

| Field | Type | Constraints | Error Message |
|-------|------|-------------|---------------|
| `email` | string | Valid email format (regex) | "Please provide a valid email" |
| `password` | string | 4-20 characters minimum length | "Password must be between 4 and 20 characters" |
| `name` | string | Format: `"FirstName LastName"` (each part ≥2 letters) | "Name must be a full name in format: 'firstName lastName', each at least 2 characters" |

**Response on Success:** `201 Created`

```json
{
  "id": "<user-id>",
  "email": "user@example.com",
  "name": "John Doe"
}
```

---

### Sign In - `POST /api/users/signin`

Authenticate an existing user and create a session.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "pass1234"
}
```

**Validation Rules:**

| Field | Type | Constraints | Error Message |
|-------|------|-------------|---------------|
| `email` | string | Valid email format | "Please provide a valid email" |
| `password` | string | Required (not empty) | "Password is required" |

**Response on Success:** `200 OK`

```json
{
  "id": "<user-id>",
  "email": "user@example.com",
  "name": "John Doe"
}
```

---

### Get Current User - `GET /api/users/currentuser`

Retrieve the authenticated user from session.

**Response on Success:** `200 OK`

```json
{
  "currentUser": {
    "id": "<user-id>",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Note:** If no authenticated session exists, returns `{ "currentUser": null }`.

---

### Sign Out - `POST /api/users/signout`

Destroy current session and sign out user.

**Response on Success:** `200 OK`

```json
{}
```

## Development

### Start Server

```bash
yarn start
```

This runs `tsx watch src/index.ts` in watch mode for development.

### Run Tests

```bash
yarn test
```

Tests are configured with Jest and ts-jest preset. Test setup file: `src/test/setup.ts`.

### Docker Build & Local Test

```bash
docker build -t auth:local .
docker run --rm -p 3000:3000 \
    -e NODE_ENV=development \
    -e JWT_KEY=your-secret-key \
    -e AUTH_MONGO_URI=mongodb://localhost:27017/auth \
    auth:local
```

## Deployment

### Local Development with Skaffold

The service is configured for Skaffold-based local development and deployment. See [`../../skaffold.yaml`](../../skaffold.yaml) for build configuration.

Build artifacts sync source files from `src/**/*.ts` manually.

### Kubernetes

Kubernetes manifests are located in [`../infra/k8s/`](../infra/k8s/):

- [`auth-depl.yaml`](../infra/k8s/auth-depl.yaml): Auth service deployment
- [`auth-mongo-depl.yaml`](../infra/k8s/auth-mongo-depl.yaml): MongoDB deployment for auth database
- [`ingress-srv.yaml`](../infra/k8s/ingress-srv.yaml): Nginx ingress routing

#### Kubernetes Ports

| Service | Port | Protocol |
|---------|------|----------|
| `auth-srv` | 3000 | TCP |
| `auth-mongo-srv` | 27017 | TCP |

#### Secrets

The deployment references the following K8s secret:

- **Name**: `jwt-secret`
- **Key**: `JWT_KEY`

## Security Considerations

### Password Storage

- Passwords are hashed using Node.js `crypto` module's `scrypt` algorithm
- Salt is 64 bytes (hex string representation)
- Hash format: `<hex-hash>.<salt>`
- Timing-safe comparison used to prevent timing attacks

### Session Security

- **Production mode**: Cookies are marked secure (`secure: true`)
- **Development/test mode**: Cookies are not marked secure for debugging
- Sessions expire after 1 hour of inactivity
- JWT tokens embedded in sessions also expire after 1 hour

### Input Validation

- Email: Regex validation for standard format
- Password: Minimum length enforced, no special character requirements
- Name: Must be exactly `"FirstName LastName"` format with word boundaries
- All inputs trimmed to prevent whitespace-based bypasses

### Database

- Single collection implied by Mongoose schema (`auth.users`)
- Email field normalized to lowercase automatically
- Unique index on email prevents duplicate accounts

### Proxy Configuration

- `trust proxy: true` enabled for deployments behind reverse proxies
- Prevents issues with forwarded headers from Nginx/alb/etc.
