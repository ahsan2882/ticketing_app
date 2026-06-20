import { JSONCodec, type JsMsg, type NatsConnection } from "nats";
import { STREAM_NAME, type Event } from "../../models/event.model";
import { JetStreamSetupService } from "../jetstream-setup";

export abstract class Listener<TEvent extends Event<any>> {
  abstract readonly subject: TEvent["subject"];
  abstract readonly durableName: string;

  protected readonly ackWaitMs = 5_000;

  private readonly jsonCodec = JSONCodec<TEvent["data"]>();

  protected constructor(private readonly client: NatsConnection) {}

  async listen(): Promise<void> {
    //   jetstream manager
    const jsm = await this.client.jetstreamManager();
    const setupService = new JetStreamSetupService(jsm);

    await setupService.ensureStream();
    await setupService.ensureConsumer({
      durableName: this.durableName,
      filterSubject: this.subject,
      ackWaitMs: this.ackWaitMs,
    });

    // jetstream
    const js = this.client.jetstream();
    const consumer = await js.consumers.get(STREAM_NAME, this.durableName);

    console.log(
      `Listening on ${this.subject} using durable consumer ${this.durableName}`,
    );

    const messages = await consumer.consume();

    for await (const msg of messages) {
      console.log(
        `Message received: ${this.subject} / durable ${this.durableName}`,
      );

      try {
        const parsedData = this.parseMessage(msg);
        await this.onMessage(parsedData, msg);
        msg.ack();
      } catch (err) {
        console.error("Message processing failed:", err);
      }
    }
  }

  protected abstract onMessage(data: TEvent["data"], msg: JsMsg): Promise<void>;

  private parseMessage(msg: JsMsg): TEvent["data"] {
    const event = this.jsonCodec.decode(msg.data);
    return event.data;
  }
}
