import { verify } from "node:crypto";
import { canonicalJson } from "./canonical-json";
import { METADATA_PUBLIC_KEY_PEM } from "./metadata-public-key";

export interface SignedMetadata {
  readonly schema: number;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly payload: unknown;
  readonly signature: string;
}

function date(value: unknown, field: string): Date {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value)
    throw new Error(`${field} is not a valid ISO timestamp`);
  return parsed;
}

export interface VerifiedMetadata {
  readonly payload: unknown;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export function verifySignedMetadata(
  value: unknown,
  now: Date = new Date(),
): VerifiedMetadata {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Metadata envelope must be an object");
  const envelope = value as Partial<SignedMetadata>;
  if (
    envelope.schema !== 1 ||
    typeof envelope.signature !== "string" ||
    envelope.payload === undefined
  )
    throw new Error("Metadata envelope is incomplete");
  const issuedAt = date(envelope.issuedAt, "issuedAt");
  const expiresAt = date(envelope.expiresAt, "expiresAt");
  if (expiresAt <= issuedAt)
    throw new Error("Metadata expiry must be after issue time");
  if (expiresAt.getTime() < now.getTime())
    throw new Error("Metadata has expired");
  if (issuedAt.getTime() > now.getTime() + 300000)
    throw new Error("Metadata issue time is in the future");
  const signed = {
    schema: envelope.schema,
    issuedAt: envelope.issuedAt,
    expiresAt: envelope.expiresAt,
    payload: envelope.payload,
  };
  const signature = Buffer.from(envelope.signature, "base64");

  // if (signature.byteLength !== 64)
  //   throw new Error("Metadata signature has an invalid length");
  if (
    !verify(
      null,
      Buffer.from(canonicalJson(signed), "utf8"),
      METADATA_PUBLIC_KEY_PEM,
      signature,
    )
  )
    throw new Error("Metadata signature is invalid");
  return {
    payload: envelope.payload,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}
