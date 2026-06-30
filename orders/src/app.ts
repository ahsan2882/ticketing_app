import { currentUser, errorHandler, NotFoundError } from "@venuepass/common";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import express from "express";
import { healthState } from "./health";
import { cancelOrderRouter } from "./routes/cancel-order";
import { createOrderRouter } from "./routes/create-order";
import { findAllOrdersRouter } from "./routes/find-all-orders";
import { findOrderRouter } from "./routes/find-order";
import { findOrdersByTicketRouter } from "./routes/find-orders-by-ticket";

const app = express();
app.set("trust proxy", true);

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

app.use(createOrderRouter);
app.use(findAllOrdersRouter);
app.use(findOrderRouter);
app.use(cancelOrderRouter);
app.use(findOrdersByTicketRouter);

app.get("/healthz", (_req, res) => {
  res.status(200).send({ status: "ok" });
});

app.get("/readyz", (_req, res) => {
  const mongo = healthState.isMongoReady();
  const nats = healthState.isNatsReady();

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
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
