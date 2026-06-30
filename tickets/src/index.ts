import { ServiceConnectionError } from "@venuepass/common";
import mongoose from "mongoose";
import { app } from "./app";
import { OrderCancelledListener } from "./events/listeners/order-cancelled-listener";
import { OrderCreatedListener } from "./events/listeners/order-created-listener";
import { healthState } from "./health";
import { natsClient } from "./nats-client";

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
  setupGracefulShutdown();
  app.listen(3000, () => {
    console.log("Listening on port 3000");
  });

  // Use Promise.allSettled to handle each dependency independently
  const results = await Promise.allSettled([
    connectMongo(),
    connectNatsClient(),
  ]);

  // Process results and set health state for each connection
  results.forEach((result, index) => {
    const isMongo = index === 0;
    if (result.status === "rejected") {
      if (isMongo) {
        healthState.setMongoNotReady();
      } else {
        healthState.setNatsNotReady();
      }
      console.error(
        `Startup error on ${isMongo ? "MongoDB" : "NATS"}:`,
        result.reason,
      );
    }
  });
  await startOrderListeners();
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

const startOrderListeners = async () => {
  await Promise.all([
    new OrderCreatedListener(natsClient.client).listen(),
    new OrderCancelledListener(natsClient.client).listen(),
  ]);

  console.log("Order listeners started");
};

const setupGracefulShutdown = () => {
  const closeGracefully = async () => {
    console.log("Shutting down tickets service...");
    try {
      await natsClient.drain();
      await mongoose.connection.close();

      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  };
  process.on("SIGINT", () => void closeGracefully());
  process.on("SIGTERM", () => void closeGracefully());
};

void start().catch((err) => {
  console.error("Fatal startup error:", err);

  throw new ServiceConnectionError("Error starting tickets service");
});
