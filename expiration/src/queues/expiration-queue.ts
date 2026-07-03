import Queue from "bull";
import { ExpirationCompletePublisher } from "../events/publishers/expiration-complete-publisher";
import { healthState } from "../health";
import { natsClient } from "../nats-client";

interface Payload {
  orderId: string;
}

const expirationQueue = new Queue<Payload>("order:expiration", {
  redis: {
    host: process.env.EXPIRATION_REDIS_HOST,
  },
});

expirationQueue.process(async (job) => {
  console.log(`Processing job for orderId: ${job.data.orderId}`);
  await new ExpirationCompletePublisher(natsClient.client).publish({
    orderId: job.data.orderId,
  });
});

export const initializeExpirationQueue = async (): Promise<void> => {
  healthState.setNotReady("redis");

  try {
    await expirationQueue.isReady();

    healthState.setReady("redis");
    console.log("Connected to Redis");

    expirationQueue.on("error", (err) => {
      healthState.setNotReady("redis");
      console.error("Redis/Bull queue error:", err);
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

export { expirationQueue };
