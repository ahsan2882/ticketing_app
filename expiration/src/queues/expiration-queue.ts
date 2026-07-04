import type Bull from "bull";
import Queue from "bull";
import { ExpirationCompletePublisher } from "../events/publishers/expiration-complete-publisher";
import { healthState } from "../health";
import { natsClient } from "../nats-client";

interface ExpirationCompletePayload {
  orderId: string;
}

interface ExpirationQueueConfig {
  redisHost: string;
}

let expirationQueue: Bull.Queue<ExpirationCompletePayload> | undefined;

export const getExpirationQueue = (): Bull.Queue<ExpirationCompletePayload> => {
  if (!expirationQueue) {
    throw new Error("Expiration queue has not been initialized");
  }

  return expirationQueue;
};

export const initializeExpirationQueue = async (
  config: ExpirationQueueConfig,
): Promise<void> => {
  healthState.setNotReady("redis");

  expirationQueue = new Queue<ExpirationCompletePayload>("order:expiration", {
    redis: {
      host: config.redisHost,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: 5000,
    },
  });

  expirationQueue.process(async (job) => {
    console.log(`Processing job for orderId: ${job.data.orderId}`);

    await new ExpirationCompletePublisher(natsClient.client).publish({
      orderId: job.data.orderId,
    });
  });

  try {
    await expirationQueue.isReady();

    healthState.setReady("redis");
    console.log("Connected to Redis");

    expirationQueue.on("error", (err) => {
      healthState.setNotReady("redis");
      console.error("Redis/Bull queue error:", err);
    });

    expirationQueue.on("failed", (job, err) => {
      console.error(
        `Expiration job for orderId ${job.data.orderId} failed permanently after ${job.attemptsMade} attempts:`,
        err,
      );
      // TODO: surface to alerting/DLQ so stuck orders are not silently lost
    });

    expirationQueue.client.on("ready", () => {
      healthState.setReady("redis");
      console.log("Redis client ready");
    });

    expirationQueue.client.on("end", () => {
      healthState.setNotReady("redis");
      console.error("Redis client connection ended");
    });

    expirationQueue.client.on("reconnecting", () => {
      healthState.setNotReady("redis");
      console.warn("Redis client reconnecting");
    });
  } catch (error) {
    healthState.setNotReady("redis");
    throw error;
  }
};

export const closeExpirationQueue = async (): Promise<void> => {
  try {
    const expirationQueue = getExpirationQueue();
    await expirationQueue.close();
  } catch (error) {
    console.error("Error closing Redis/Bull queue:", error);
  }
};
