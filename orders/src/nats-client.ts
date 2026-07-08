import { JetStreamSetupService } from "@venuepass/common";
import { connect, Events, type NatsConnection } from "nats";
import { healthState } from "./health";

class NatsClient {
  private _client?: NatsConnection;

  get client(): NatsConnection {
    if (!this._client) {
      throw new Error("Cannot access NATS client before connecting");
    }

    return this._client;
  }

  async connect(): Promise<void> {
    healthState.setNotReady("nats");
    this._client = await connect({
      servers: [process.env.NATS_URL!], // use nats://nats-srv:4222 inside k8s
      name: "order-service",
      pingInterval: 5_000,
      maxPingOut: 2,
      waitOnFirstConnect: true,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 2000,
    });

    console.log("Connected to NATS");

    await this.ensureJetStream();

    healthState.setReady("nats");

    this.monitorConnectionStatus();
    this.monitorClosedConnection();
  }

  async drain(): Promise<void> {
    if (this._client) {
      await this._client.drain();
    }
  }

  private async ensureJetStream(): Promise<void> {
    if (!this._client) {
      throw new Error("Cannot setup JetStream before connecting to NATS");
    }
    const jsm = await this._client.jetstreamManager();
    const setupService = new JetStreamSetupService(jsm);
    await setupService.ensureStream();
  }

  private monitorConnectionStatus(): void {
    if (!this._client) return;

    void (async () => {
      try {
        for await (const status of this.client.status()) {
          switch (status.type) {
            case Events.Disconnect:
              healthState.setNotReady("nats");
              console.error("NATS disconnected");
              break;

            case Events.Reconnect:
              healthState.setNotReady("nats");
              console.log("NATS reconnected");

              try {
                await this.ensureJetStream();
                healthState.setReady("nats");
              } catch (err) {
                healthState.setNotReady("nats");
                console.error(
                  "Failed to initialize JetStream after reconnect:",
                  err,
                );
              }
              break;

            case Events.Error:
              healthState.setNotReady("nats");
              console.error("NATS connection error:", status.data);
              break;
          }
        }
      } catch (error) {
        healthState.setNotReady("nats");
        console.error("NATS status monitoring loop terminated:", error);
      }
    })();
  }

  private monitorClosedConnection(): void {
    if (!this._client) return;

    this._client.closed().then((err) => {
      healthState.setNotReady("nats");

      if (err) {
        console.error("NATS connection closed with error:", err);
        return;
      }

      console.log("NATS connection closed");
    });
  }
}

export const natsClient = new NatsClient();
