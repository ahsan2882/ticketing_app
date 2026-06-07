import { CustomError } from "./base-error";
import type { SerializedError } from "../models/serialize-error.model";

export class UnauthorizedError extends CustomError {
  statusCode = 401;
  reason = "Not authorized";
  constructor() {
    super("Not authorized");
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }

  serializeErrors(): SerializedError[] {
    return [{ message: this.reason }];
  }
}
