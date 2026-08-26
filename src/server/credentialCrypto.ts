import crypto from "crypto";

export type EncryptedPayload = { version: 1; iv: string; tag: string; ciphertext: string };

function keyFromSecret(secret: string) {
  if (secret.trim().length < 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY must contain at least 32 characters");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptCredential(value: unknown, secret: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { version: 1, iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), ciphertext: ciphertext.toString("base64url") };
}

export function decryptCredential<T>(payload: EncryptedPayload, secret: string): T {
  if (payload?.version !== 1) throw new Error("Unsupported encrypted credential format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFromSecret(secret), Buffer.from(payload.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64url")), decipher.final()]).toString("utf8")) as T;
}
