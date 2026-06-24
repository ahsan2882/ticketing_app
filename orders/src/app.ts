import { currentUser, errorHandler, NotFoundError } from "@venuepass/common";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import express from "express";
import { cancelOrderRouter } from "./routes/cancel-order";
import { createOrderRouter } from "./routes/create-order";
import { findAllOrdersRouter } from "./routes/find-all-orders";
import { findOrderRouter } from "./routes/find-order";

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

app.all("/{*splat}", async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
