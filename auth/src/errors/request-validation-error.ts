import type { ValidationError } from "express-validator";
import { CustomError } from "./base-error";
import type { SerializedError } from "./serialize-error.model";

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
