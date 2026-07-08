import { currentUser, errorHandler, NotFoundError } from "@venuepass/common";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import express from "express";
import helmet from "helmet";
import { healthState } from "./health";
import { createTicketRouter } from "./routes/create-ticket";
import { findAllTicketRouter } from "./routes/find-all-tickets";
import { findTicketRouter } from "./routes/find-ticket";
import { updateTicketRouter } from "./routes/update-ticket";

const app = express();
app.set("trust proxy", true);
app.use(helmet());
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

app.use(createTicketRouter);
app.use(findTicketRouter);
app.use(findAllTicketRouter);
app.use(updateTicketRouter);

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
  throw new NotFoundError("Route not found in tickets service");
});

app.use(errorHandler);

export { app };
