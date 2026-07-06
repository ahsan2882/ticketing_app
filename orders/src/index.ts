import { ServiceConnectionError } from "@venuepass/common";
import mongoose from "mongoose";
import { app } from "./app";
import { ExpirationCompleteListener } from "./events/listeners/expiration-complete-listener";
import { PaymentClearedListener } from "./events/listeners/payment-cleared-listener";
import { TicketCreatedListener } from "./events/listeners/ticket-created-listener";
import { TicketUpdatedListener } from "./events/listeners/ticket-updated-listener";
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
  if (!process.env.ORDERS_MONGO_URI) {
    throw new Error("ORDERS_MONGO_URI environment variable is not defined");
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
    await connectNats();
  } catch (error) {
    healthState.setNotReady("nats");
    console.error("Error connecting to NATS:", error);
    throw new ServiceConnectionError("Error connecting to NATS");
  }
  try {
    await startListeners();
  } catch (error) {
    healthState.setNotReady("nats");
    console.error("Error starting ticket listeners:", error);
    throw new ServiceConnectionError("Error starting listeners");
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

  await mongoose.connect(process.env.ORDERS_MONGO_URI!, {
    serverSelectionTimeoutMS: 30000,
  });
};

const connectNats = async () => {
  try {
    await natsClient.connect();
  } catch (error) {
    throw new ServiceConnectionError(`Error connecting to NATS: ${error}`);
  }
};

const startListeners = async () => {
  await Promise.all([
    new TicketCreatedListener(natsClient.client).listen(),
    new TicketUpdatedListener(natsClient.client).listen(),
    new ExpirationCompleteListener(natsClient.client).listen(),
    new PaymentClearedListener(natsClient.client).listen(),
  ]);

  console.log("Ticket listeners started");
};

const setupGracefulShutdown = (): void => {
  const closeGracefully = async (): Promise<void> => {
    console.log("Shutting down orders service...");
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

  throw new ServiceConnectionError("Error starting orders service");
});
