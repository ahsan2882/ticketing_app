import { JetStreamSetupService } from "@venuepass/common";
import { connect, type NatsConnection } from "nats";

class NatsClient {
  private _client?: NatsConnection;

  get client(): NatsConnection {
    if (!this._client) {
      throw new Error("Cannot access NATS client before connecting");
    }

    return this._client;
  }

  async connect(): Promise<void> {
    this._client = await connect({
      servers: [process.env.NATS_URL!], // use nats://nats-srv:4222 inside k8s
      name: "order-service",
      pingInterval: 5_000,
      maxPingOut: 2,
    });

    console.log("Connected to NATS");

    const jsm = await this._client.jetstreamManager();
    const setupService = new JetStreamSetupService(jsm);

    await setupService.ensureStream();

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
