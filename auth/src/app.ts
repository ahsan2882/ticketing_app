import { errorHandler, NotFoundError } from "@venuepass/common";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import express from "express";
import { healthState } from "./health";
import { currentUserRouter } from "./routes/current-user";
import { signInRouter } from "./routes/signin";
import { signOutRouter } from "./routes/signout";
import { signUpRouter } from "./routes/signup";

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

app.use(currentUserRouter);
app.use(signInRouter);
app.use(signUpRouter);
app.use(signOutRouter);

app.get("/healthz", (_req, res) => {
  res.status(200).send({ status: "ok" });
});

app.get("/readyz", (_req, res) => {
  if (!healthState.isReady()) {
    return res.status(503).send({
      status: "not_ready",
      mongo: false,
    });
  }

  res.status(200).send({
    status: "ready",
    mongo: true,
  });
});

app.all("/{*splat}", async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
