import { JetStreamSetupService } from "@venuepass/common";
import { connect, type NatsConnection } from "nats";

class NatsClient {
  private _client?: NatsConnection | undefined;

  get client(): NatsConnection {
    if (!this._client) {
      throw new Error("Cannot access NATS client before connecting");
    }

    return this._client;
  }

  async connect(): Promise<void> {
    const client = await connect({
      servers: [process.env.NATS_URL!], // use nats://nats-srv:4222 inside k8s
      name: "tickets-service",
      pingInterval: 5_000,
      maxPingOut: 2,
    });

    this._client = client;

    console.log("Connected to NATS");

    try {
      const jsm = await this._client.jetstreamManager();
      const setupService = new JetStreamSetupService(jsm);

      await setupService.ensureStream();
    } catch (err) {
      await client.drain().catch(() => undefined);
      this._client = undefined;
      throw err;
    }
    this._client.closed().then((err) => {
      if (err) {
        console.error("NATS connection closed with error:", err);
        return;
      }

      console.log("NATS connection closed");
    });
  }

  async drain(): Promise<void> {
    if (this._client) {
      await this._client.drain();
    }
  }
}

export const natsClient = new NatsClient();
