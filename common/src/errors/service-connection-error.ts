import type { SerializedError } from "../models/serialize-error.model";
import { CustomError } from "./base-error";

export class ServiceConnectionError extends CustomError {
  statusCode = 500;
  reason: string;
  constructor(reason: string) {
    super(reason);
    Object.setPrototypeOf(this, ServiceConnectionError.prototype);
    this.reason = reason;
  }

  serializeErrors(): SerializedError[] {
    return [{ message: this.reason }];
  }
}
