import crypto from "crypto";

export type EncryptedPayload = { version: 1; iv: string; tag: string; ciphertext: string };

function keyFromSecret(secret: string) {
  if (secret.trim().length < 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY must contain at least 32 characters");
  return crypto.createHash("sha256").update(secret).digest();
}

function decodeCanonicalBase64Url(value: string, field: string) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error(`Invalid encrypted credential ${field}`);
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) throw new Error(`Invalid encrypted credential ${field}`);
  return decoded;
}

export function encryptCredential(value: unknown, secret: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { version: 1, iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), ciphertext: ciphertext.toString("base64url") };
}

export function decryptCredential<T>(payload: EncryptedPayload, secret: string): T {
  if (payload?.version !== 1) throw new Error("Unsupported encrypted credential format");
  const iv = decodeCanonicalBase64Url(payload.iv, "iv");
  const tag = decodeCanonicalBase64Url(payload.tag, "tag");
  const ciphertext = decodeCanonicalBase64Url(payload.ciphertext, "ciphertext");
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Invalid encrypted credential dimensions");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")) as T;
}
