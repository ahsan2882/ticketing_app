import { CustomError } from "./base-error";
import type { SerializedError } from "./serialize-error.model";

export class NotFoundError extends CustomError {
  statusCode = 404;
  constructor() {
    super("Route not found");
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  serializeErrors(): SerializedError[] {
    return [{ message: "Route not found" }];
  }
}
