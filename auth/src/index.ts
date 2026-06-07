import mongoose from "mongoose";
import { app } from "./app";
import { DatabaseConnectionError } from "./errors/database-connection-error";

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
