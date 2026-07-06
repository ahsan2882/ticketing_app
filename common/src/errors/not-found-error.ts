import type { SerializedError } from "../models/serialize-error.model";
import { CustomError } from "./base-error";

export class NotFoundError extends CustomError {
  statusCode = 404;
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  serializeErrors(): SerializedError[] {
    return [{ message: this.message }];
  }
}
