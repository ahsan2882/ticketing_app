import bodyParser from "body-parser";
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

app.use(bodyParser.json());

app.use(currentUserRouter);
app.use(signInRouter);
app.use(signUpRouter);
app.use(signOutRouter);

app.all("/{*splat}", async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

const start = async () => {
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
