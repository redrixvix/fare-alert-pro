// @ts-nocheck
const JWT_SECRET = process.env.JWT_SECRET || "fare-alert-pro-jwt-secret-2024-secure";
const TOKEN_EXPIRY_DAYS = 30;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 256;

// Correct base64url encoding using btoa
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Proper base64url string encoding
function base64UrlEncodeStr(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed, then decode
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (padded.length % 4)) % 4;
  padded += "=".repeat(padding);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function pbkdf2Hash(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH
  );
  return base64UrlEncode(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const hash = await pbkdf2Hash(password, salt);
  const saltB64 = base64UrlEncode(salt.buffer);
  return saltB64 + "." + hash;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltB64, hash] = stored.split(".");
    if (!saltB64 || !hash) return false;
    const salt = base64UrlDecode(saltB64);
    const computedHash = await pbkdf2Hash(password, salt);
    return computedHash === hash;
  } catch {
    return false;
  }
}

async function importSecretKey(secret: string): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    encoded,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(userId: number, email: string): Promise<string> {
  const header = base64UrlEncodeStr(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
  const payload = base64UrlEncodeStr(JSON.stringify({ userId, email, exp }));
  const key = await importSecretKey(JWT_SECRET);
  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign("HMAC", key, sigInput);
  const sigB64 = base64UrlEncode(sig);
  return `${header}.${payload}.${sigB64}`;
}

export async function verifyToken(token: string): Promise<{ userId: number; email: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const key = await importSecretKey(JWT_SECRET);
    const sigInput = new TextEncoder().encode(`${header}.${payload}`);
    const sigBytes = base64UrlDecode(signature);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, sigInput);
    if (!valid) return null;
    // Decode payload - add padding if needed
    let padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (padded.length % 4) padded += "=";
    const decoded = JSON.parse(atob(padded));
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}
