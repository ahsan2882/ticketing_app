import type { ValidationError } from "express-validator";
import type { SerializedError } from "../models/serialize-error.model";
import { CustomError } from "./base-error";

export class RequestValidationError extends CustomError {
  statusCode = 400;
  constructor(private errors: ValidationError[]) {
    super("Invalid request parameters");
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serializeErrors(): SerializedError[] {
    return this.errors
      .filter((error) => error.type === "field")
      .map((error) => {
        return { message: error.msg, field: error.path };
      });
  }
}
