import { ServiceConnectionError } from "@venuepass/common";
import mongoose from "mongoose";
import { app } from "./app";
import { natsClient } from "./nats-client";
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
  if (!process.env.TICKETS_MONGO_URI) {
    throw new Error("TICKETS_MONGO_URI environment variable is not defined");
  }
  if (!process.env.NATS_URL) {
    throw new Error("NATS_URL environment variable is not defined");
  }
};

const start = async () => {
  validateEnv();
  app.listen(3000, () => {
    console.log("Listening on port 3000");
  });
  try {
    await Promise.all([connectMongo(), connectNatsClient()]);
  } catch (err) {
    healthState.setMongoNotReady();
    healthState.setNatsNotReady();
    console.error("Fatal startup error:", err);
  }
};

const connectMongo = async (retries = 10) => {
  mongoose.connection.on("connected", () => {
    healthState.setMongoReady();
    console.log("Connected to MongoDB");
  });

  mongoose.connection.on("disconnected", () => {
    healthState.setMongoNotReady();
    console.error("Error connecting to database");
  });

  mongoose.connection.on("error", (err) => {
    healthState.setMongoNotReady();
    console.error("Error connecting to database");
  });

  await mongoose.connect(process.env.TICKETS_MONGO_URI!);
};

const connectNatsClient = async (retries = 10) => {
  try {
    await natsClient.connect();
  } catch (error) {
    throw new ServiceConnectionError(`Error connecting to NATS: ${error}`);
  }
};

void start().catch((err) => {
  console.error("Fatal startup error:", err);

  throw new ServiceConnectionError("Error starting tickets service");
});
