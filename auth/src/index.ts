import { ServiceConnectionError } from "@venuepass/common";
import mongoose from "mongoose";
import { app } from "./app";
import { healthState } from "./health";

const validateEnv = () => {
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
};

const start = async () => {
  validateEnv();
  app.listen(3000, () => {
    console.log("Listening on port 3000...");
  });
  try {
    await connectMongo();
  } catch (error) {
    healthState.setNotReady("mongo");
    console.error("MongoDB initial connection failed:", error);
    throw new ServiceConnectionError("Error connecting to MongoDB");
  }
};

const connectMongo = async () => {
  mongoose.connection.on("connected", () => {
    healthState.setReady("mongo");
    console.log("Connected to MongoDB");
  });

  mongoose.connection.on("disconnected", () => {
    healthState.setNotReady("mongo");
    console.error("Error connecting to database");
  });

  mongoose.connection.on("error", (err) => {
    healthState.setNotReady("mongo");
    console.error("Error connecting to database");
  });

  await mongoose.connect(process.env.AUTH_MONGO_URI!);
};

try {
  start();
} catch (err) {
  console.error("Fatal startup error:", err);
  throw new ServiceConnectionError("Error starting auth service");
}
