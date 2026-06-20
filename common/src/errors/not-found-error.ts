import type { SerializedError } from "../models/serialize-error.model";
import { CustomError } from "./base-error";

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
