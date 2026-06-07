import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import express from "express";
import mongoose from "mongoose";
import { DatabaseConnectionError } from "./errors/database-connection-error";
import { NotFoundError } from "./errors/not-found-error";
import { errorHandler } from "./middlewares/error-handler";
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
  }),
);

app.use(currentUserRouter);
app.use(signInRouter);
app.use(signUpRouter);
app.use(signOutRouter);

app.all("/{*splat}", async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

const start = async () => {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    throw new Error("NODE_ENV environment variable is not defined");
  }
  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error(`Unsupported NODE_ENV value: ${nodeEnv}`);
  }
  if (!process.env.JWT_KEY) {
    throw new Error("JWT_KEY environment variable is not defined");
  }
  try {
    await mongoose.connect("mongodb://auth-mongo-srv:27017/auth");
    console.log("Connected to MongoDB");
    app.listen(3000, () => {
      console.log("Listening on port 3000!!!!");
    });
  } catch (err) {
    console.error(err);
    throw new DatabaseConnectionError();
  }
};

void start();
