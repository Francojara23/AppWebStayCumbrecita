import { createCipheriv, createDecipheriv } from "crypto";
import { ValueTransformer } from "typeorm";
import * as dotenv from "dotenv";
dotenv.config();
export class EncryptionTransformer implements ValueTransformer {
  private algorithm = "aes-256-cbc";
  private key: Buffer;
  private iv: Buffer;

  constructor() {
    const keyHex = process.env.ENCRYPTION_KEY || "";
    const ivHex = process.env.ENCRYPTION_IV || "";

    this.key = Buffer.from(keyHex, "hex");
    this.iv = Buffer.from(ivHex, "hex");

    if (this.key.length !== 32) {
      throw new Error(
        `Invalid ENCRYPTION_KEY length: expected 32 bytes, got ${this.key.length}`,
      );
    }

    if (this.iv.length !== 16) {
      throw new Error(
        `Invalid ENCRYPTION_IV length: expected 16 bytes, got ${this.iv.length}`,
      );
    }
  }

  to(value: string): string {
    if (!value) return value;
    const cipher = createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  from(value: string): string {
    if (!value) return value;
    const decipher = createDecipheriv(this.algorithm, this.key, this.iv);
    let decrypted = decipher.update(value, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
