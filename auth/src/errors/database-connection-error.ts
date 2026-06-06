import { CustomError } from "./base-error";
import type { SerializedError } from "../models/serialize-error.model";

export class DatabaseConnectionError extends CustomError {
  statusCode = 500;
  reason = "Error connecting to database";
  constructor() {
    super("Error connecting to database");
    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }

  serializeErrors(): SerializedError[] {
    return [{ message: this.reason }];
  }
}
