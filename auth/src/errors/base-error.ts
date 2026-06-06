import type { SerializedError } from "./serialize-error.model";

export abstract class CustomError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }

  abstract serializeErrors(): SerializedError[];
}
