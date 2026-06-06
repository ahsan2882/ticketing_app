import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export class Password {
  static async toHash(password: string): Promise<string> {
    const salt = randomBytes(8).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  static async compare(
    storedPassword: string,
    suppliedPassword: string,
  ): Promise<boolean> {
    // split may produce undefined salt if storedPassword is malformed
    const [hashedPassword, salt] = storedPassword.split(".");
    if (!salt || !hashedPassword) {
      // invalid stored password format
      return false;
    }
    const buf = (await scryptAsync(
      suppliedPassword,
      salt as string,
      64,
    )) as Buffer;
    return buf.toString("hex") === hashedPassword;
  }
}
