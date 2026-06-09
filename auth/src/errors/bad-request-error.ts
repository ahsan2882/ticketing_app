import type { SerializedError } from "../models/serialize-error.model";
import { CustomError } from "./base-error";

export class BadRequestError extends CustomError {
  statusCode = 400;

  constructor(
    public message: string,
    private field?: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }

  serializeErrors() {
    const err: SerializedError = { message: this.message };
    if (this.field) {
      err.field = this.field;
    }
    return [err];
  }
}
