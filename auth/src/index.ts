import { ServiceConnectionError } from "@venuepass/common";
import mongoose from "mongoose";
import { app } from "./app";

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
  if (!process.env.AUTH_MONGO_URI) {
    throw new Error("AUTH_MONGO_URI environment variable is not defined");
  }
  try {
    await connectWithRetry();
    app.listen(3000, () => {
      console.log("Listening on port 3000");
    });
  } catch (err) {
    console.error("Fatal startup error:", err);
    process.exit(1);
  }
};

const connectWithRetry = async (retries = 10) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.AUTH_MONGO_URI!);
      console.log("Connected to MongoDB");
      return;
    } catch (err) {
      console.error(`Mongo connection failed (${i + 1}/${retries})`);
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  throw new ServiceConnectionError("Error connecting to database");
};

void start();
