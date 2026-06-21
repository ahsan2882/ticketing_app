import { AckPolicy, DeliverPolicy, millis, type JetStreamManager } from "nats";
import { STREAM_NAME, SUBJECTS } from "../models/event.model";

export interface ConsumerConfig {
  readonly durableName: string;
  readonly filterSubject: string;
  readonly ackWaitMs: number;
}

export class JetStreamSetupService {
  constructor(private readonly jetStreamManager: JetStreamManager) {}

  async ensureStream(): Promise<void> {
    try {
      await this.jetStreamManager.streams.info(STREAM_NAME);
    } catch {
      await this.jetStreamManager.streams.add({
        name: STREAM_NAME,
        subjects: Object.values(SUBJECTS),
      });
    }
  }

  async ensureConsumer(config: ConsumerConfig): Promise<void> {
    try {
      await this.jetStreamManager.consumers.info(
        STREAM_NAME,
        config.durableName,
      );
    } catch {
      await this.jetStreamManager.consumers.add(STREAM_NAME, {
        durable_name: config.durableName,
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.All,
        filter_subject: config.filterSubject,
        ack_wait: millis(config.ackWaitMs),
      });
    }
  }
}
