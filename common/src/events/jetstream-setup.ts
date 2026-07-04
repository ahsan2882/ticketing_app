import { AckPolicy, DeliverPolicy, type JetStreamManager, nanos } from "nats";
import type {
  ConsumerInfo,
  ConsumerUpdateConfig,
} from "nats/lib/jetstream/jsapi_types";
import { STREAM_NAME, SUBJECTS } from "../models/event.model";

export interface ConsumerConfig {
  readonly durableName: string;
  readonly filterSubject: string;
  readonly ackWaitMs: number;
  readonly maxDeliveryAttempts: number;
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
    let currentInfo: ConsumerInfo;
    try {
      // Consumer already exists - reconcile configuration
      currentInfo = await this.jetStreamManager.consumers.info(
        STREAM_NAME,
        config.durableName,
      );
    } catch (err) {
      if (!this.isConsumerNotFoundError(err)) {
        throw err;
      }
      // Consumer does not exist - create it
      await this.jetStreamManager.consumers.add(STREAM_NAME, {
        durable_name: config.durableName,
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.All,
        filter_subject: config.filterSubject,
        ack_wait: nanos(config.ackWaitMs),
        max_deliver: config.maxDeliveryAttempts,
      });
      return;
    }
    // Build update config with only the fields that need to change
    const updateConfig: Partial<ConsumerUpdateConfig> = {};
    if (config.maxDeliveryAttempts !== currentInfo.config.max_deliver) {
      updateConfig.max_deliver = config.maxDeliveryAttempts;
    }
    if (config.filterSubject !== currentInfo.config.filter_subject) {
      updateConfig.filter_subject = config.filterSubject;
    }
    if (nanos(config.ackWaitMs) !== currentInfo.config.ack_wait) {
      updateConfig.ack_wait = nanos(config.ackWaitMs);
    }

    if (Object.keys(updateConfig).length > 0) {
      await this.jetStreamManager.consumers.update(
        STREAM_NAME,
        config.durableName,
        updateConfig,
      );
    }
  }

  // TODO: Poison Queue Implementation
  // async createDeadLetterStream() {
  //   try {
  //     await this.jetStreamManager.streams.add({
  //       name: "DEAD-LETTER",
  //       subjects: ["dead-letter.>"],
  //       retention: RetentionPolicy.Limits,
  //       max_age: 30 * 24 * 60 * 60 * 1_000_000_000,
  //     });
  //   } catch (error) {
  //     console.error("Error creating dead letter stream", error);
  //   }
  // }

  private isConsumerNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const natsError = error as {
      code?: string | number;
      api_error?: {
        code?: number;
        err_code?: number;
        description?: string;
      };
    };

    return (
      Number(natsError.code) === 404 ||
      natsError.api_error?.code === 404 ||
      natsError.api_error?.err_code === 10014
    );
  }
}
