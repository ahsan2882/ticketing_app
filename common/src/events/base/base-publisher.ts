import {
  type JetStreamClient,
  JSONCodec,
  type NatsConnection,
  type PubAck,
} from "nats";
import { Event } from "../../models/event.model";

export abstract class Publisher<TEvent extends Event<any>> {
  abstract readonly subject: TEvent["subject"];
  private readonly jsonCodec = JSONCodec<TEvent>();

  protected constructor(private readonly client: NatsConnection) {}

  async publish(data: TEvent["data"]): Promise<PubAck> {
    const jetStreamClient: JetStreamClient = this.client.jetstream();

    const event = this.buildEvent(data);

    const publishAck = await jetStreamClient.publish(
      this.subject,
      this.jsonCodec.encode(event),
    );

    console.log(
      `Event published to stream ${publishAck.stream}, sequence ${publishAck.seq}, data: ${JSON.stringify(data)}`,
    );

    return publishAck;
  }

  private buildEvent(data: TEvent["data"]): TEvent {
    return {
      subject: this.subject,
      data,
    } as TEvent;
  }
}
