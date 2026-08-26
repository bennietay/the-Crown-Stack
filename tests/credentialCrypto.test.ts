import test from "node:test";
import assert from "node:assert/strict";
import { decryptCredential, encryptCredential } from "../src/server/credentialCrypto";

test("integration credentials round-trip through authenticated encryption", () => {
  const secret = "a-production-secret-that-is-longer-than-thirty-two-characters";
  const encrypted = encryptCredential({ accessToken: "token-value", refreshToken: "refresh-value" }, secret);
  assert.equal(JSON.stringify(encrypted).includes("token-value"), false);
  assert.deepEqual(decryptCredential(encrypted, secret), { accessToken: "token-value", refreshToken: "refresh-value" });
});

test("credential decryption fails when ciphertext is modified", () => {
  const secret = "a-production-secret-that-is-longer-than-thirty-two-characters";
  const encrypted = encryptCredential({ token: "secret" }, secret);
  encrypted.ciphertext = `${encrypted.ciphertext.slice(0, -1)}A`;
  assert.throws(() => decryptCredential(encrypted, secret));
});
