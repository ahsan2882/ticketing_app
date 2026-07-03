import { ServiceConnectionError } from "@venuepass/common";
import { OrderCreatedListener } from "./events/listeners/order-created-listener";
import { HealthServer, healthState } from "./health";
import { natsClient } from "./nats-client";
import {
  expirationQueue,
  initializeExpirationQueue,
} from "./queues/expiration-queue";

const validateEnv = () => {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv) {
    throw new Error("NODE_ENV environment variable is not defined");
  }
  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error(`Unsupported NODE_ENV value: ${nodeEnv}`);
  }
  if (!process.env.NATS_URL) {
    throw new Error("NATS_URL environment variable is not defined");
  }
  if (!process.env.EXPIRATION_REDIS_HOST) {
    throw new Error(
      "EXPIRATION_REDIS_HOST environment variable is not defined",
    );
  }
};

const start = async () => {
  validateEnv();
  setupGracefulShutdown();
  new HealthServer(healthState, 3000).start();
  try {
    await initializeExpirationQueue();
  } catch (error) {
    healthState.setNotReady("redis");
    console.error("Redis initial connection failed:", error);
    throw new ServiceConnectionError("Error connecting to Redis");
  }
  try {
    await connectNatsClient();
  } catch (error) {
    healthState.setNotReady("nats");
    console.error("NATS initial connection failed:", error);
    throw new ServiceConnectionError("Error connecting to NATS");
  }
  try {
    await startOrderListeners();
  } catch (error) {
    console.error("Error starting order listeners:", error);
  }
};

const connectNatsClient = async () => {
  try {
    await natsClient.connect();
  } catch (error) {
    throw new ServiceConnectionError(`Error connecting to NATS: ${error}`);
  }
};

const startOrderListeners = async () => {
  await Promise.all([new OrderCreatedListener(natsClient.client).listen()]);

  console.log("Order listeners started");
};

const setupGracefulShutdown = (): void => {
  const closeGracefully = async (): Promise<void> => {
    console.log("Shutting down orders service...");
    try {
      await natsClient.drain();
      await expirationQueue.close();
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

  throw new ServiceConnectionError("Error starting orders service");
});
