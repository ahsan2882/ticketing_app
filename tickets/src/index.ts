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

let server: ReturnType<typeof app.listen> | undefined;

const start = async () => {
  validateEnv();
  setupGracefulShutdown();
  server = app.listen(3000, () => {
    console.log("Listening on port 3000");
  });

  try {
    await connectMongo();
  } catch (error) {
    healthState.setNotReady("mongo");
    console.error("Error connecting to MongoDB:", error);
    throw new ServiceConnectionError("Error connecting to MongoDB");
  }
  try {
    await connectNatsClient();
  } catch (error) {
    healthState.setNotReady("nats");
    console.error("Error connecting to NATS:", error);
    throw new ServiceConnectionError(`Error connecting to NATS: ${error}`);
  }
  try {
    await startOrderListeners();
  } catch (error) {
    healthState.setNotReady("nats");
    console.error("Error starting order listeners:", error);
    throw new ServiceConnectionError("Error starting order listeners");
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

  await mongoose.connect(process.env.TICKETS_MONGO_URI!);
};

const connectNatsClient = async () => {
  await natsClient.connect();
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
    let hadError = false;
    if (server) {
      try {
        await new Promise<void>((resolve, reject) => {
          server!.close((err?: Error) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (err) {
        hadError = true;
        console.error("Error closing HTTP server:", err);
      }
    }
    try {
      await natsClient.drain();
    } catch (err) {
      hadError = true;
      console.error("Error draining NATS client:", err);
    }

    try {
      await mongoose.connection.close();
    } catch (err) {
      hadError = true;
      console.error("Error closing MongoDB connection:", err);
    }

    process.exit(hadError ? 1 : 0);
  };
  process.on("SIGINT", () => void closeGracefully());
  process.on("SIGTERM", () => void closeGracefully());
};

void start().catch((err) => {
  console.error("Fatal startup error:", err);

  throw new ServiceConnectionError("Error starting tickets service");
});
