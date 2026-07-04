import { ServiceConnectionError } from "@venuepass/common";
import { OrderCreatedListener } from "./events/listeners/order-created-listener";
import { HealthServer, healthState } from "./health";
import { natsClient } from "./nats-client";
import {
  closeExpirationQueue,
  initializeExpirationQueue,
} from "./queues/expiration-queue";

const validateEnv = () => {
  const nodeEnv = process.env.NODE_ENV;
  const natsUrl = process.env.NATS_URL;
  const redisHost = process.env.EXPIRATION_REDIS_HOST;

  if (!nodeEnv) {
    throw new Error("NODE_ENV environment variable is not defined");
  }

  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error(`Unsupported NODE_ENV value: ${nodeEnv}`);
  }

  if (!natsUrl) {
    throw new Error("NATS_URL environment variable is not defined");
  }

  if (!redisHost) {
    throw new Error(
      "EXPIRATION_REDIS_HOST environment variable is not defined",
    );
  }

  return {
    nodeEnv,
    natsUrl,
    redisHost,
  };
};

const start = async () => {
  const env = validateEnv();
  setupGracefulShutdown();
  new HealthServer(healthState, 3000).start();
  try {
    await initializeExpirationQueue({
      redisHost: env.redisHost,
    });
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
    healthState.setNotReady("nats");
    console.error("Error starting order listeners:", error);
    throw new ServiceConnectionError("Error starting order listeners");
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
      await closeExpirationQueue();
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
