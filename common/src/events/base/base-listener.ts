import { JSONCodec, type JsMsg, type NatsConnection } from "nats";
import { STREAM_NAME, type Event } from "../../models/event.model";
import { JetStreamSetupService } from "../jetstream-setup";

export abstract class Listener<TEvent extends Event<any>> {
  abstract readonly subject: TEvent["subject"];
  abstract readonly durableName: string;

  protected readonly ackWaitMs = 5_000;
  protected readonly maxDeliveryAttempts = 5;

  private readonly jsonCodec = JSONCodec<Event<TEvent["data"]>>();

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
      maxDeliveryAttempts: this.maxDeliveryAttempts,
    });

    // TODO: Posion Queue Implementation
    // await setupService.createDeadLetterStream();

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
      } catch (err) {
        console.error("Message processing failed:", err);
      }
    }
  }

  protected abstract onMessage(data: TEvent["data"], msg: JsMsg): Promise<void>;

  private parseMessage(msg: JsMsg): TEvent["data"] {
    const event = this.jsonCodec.decode(msg.data);
    if (!event || event.subject !== this.subject || event.data === undefined) {
      throw new Error("Invalid event envelope");
    }
    return event.data;
  }

  // TODO: Posion Queue Implementation
  // protected async publishToDeadLetter(
  //   data: TEvent["data"],
  //   msg: JsMsg,
  // ): Promise<void> {
  //   const js = this.client.jetstream();
  //   const payload = {
  //     originalSubject: msg.subject,
  //     originalSeq: msg.seq,
  //     deliveryCount: msg.info.deliveryCount,
  //     data,
  //     failedAt: new Date().toISOString(),
  //     reason: "version-gap-exceeded-max-retries",
  //   };
  //   js.publish(
  //     `${DEAD_LETTER_SUBJECT_PREFIX}.${this.subject}`,
  //     JSON.stringify(payload),
  //   );
  // }
}
