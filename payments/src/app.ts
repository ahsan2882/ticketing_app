import { currentUser, errorHandler, NotFoundError } from "@venuepass/common";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import express from "express";
import helmet from "helmet";
import { healthState } from "./health";
import { createPaymentRouter } from "./routes/create-payment";
import { stripeWebhookRouter } from "./routes/stripe-webhook";

const app = express();
app.set("trust proxy", true);

// Security headers middleware - mount before routes
app.use(helmet());
app.use(stripeWebhookRouter);

app.use(bodyParser.json());
app.use(
  cookieSession({
    signed: false,
    secure:
      process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test",
    maxAge: 3600000,
  }),
);

app.use(currentUser);

app.use(createPaymentRouter);

app.get("/healthz", (_req, res) => {
  res.status(200).send({ status: "ok" });
});

app.get("/readyz", (_req, res) => {
  const mongo = healthState.isCheckReady("mongo");
  const nats = healthState.isCheckReady("nats");

  if (!healthState.isReady()) {
    return res.status(503).send({
      status: "not_ready",
      mongo,
      nats,
    });
  }

  res.status(200).send({
    status: "ready",
    mongo,
    nats,
  });
});

app.all("/{*splat}", async (req, res) => {
  throw new NotFoundError("Route not found in payments service");
});

app.use(errorHandler);

export { app };
