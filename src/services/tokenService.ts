import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env";

const ALGO = "aes-256-cbc";
const key = Buffer.from(env.tokenSecret, "hex");

export function encryptToken(plain: string): { encrypted: string; iv: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { encrypted: encrypted.toString("base64"), iv: iv.toString("hex") };
}

export function decryptToken(encrypted: string, iv: string): string {
  const decipher = createDecipheriv(ALGO, key, Buffer.from(iv, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
