// Convex-compatible auth — uses Web Crypto API (WASM-compatible)
// Does NOT use bcryptjs or jsonwebtoken (Node.js specific)

const JWT_SECRET = process.env.JWT_SECRET || "fare-alert-pro-secret-change-in-production";
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 256;
const TOKEN_EXPIRY_DAYS = 7;

// --- Password Hashing using PBKDF2 (Web Crypto API) ---

async function base64UrlEncode(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
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
  const result = new Uint8Array(bits);
  const combined = new Uint8Array(salt.length + result.length);
  combined.set(salt, 0);
  combined.set(result, salt.length);
  return await base64UrlEncode(combined.buffer);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const hash = await pbkdf2Hash(password, salt);
  return salt.toString() + "." + hash;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltB64, hash] = stored.split(".");
    const salt = Uint8Array.from(atob(saltB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const computedHash = await pbkdf2Hash(password, salt);
    return computedHash === hash;
  } catch {
    return false;
  }
}

// --- JWT using Web Crypto API ---

async function importSecretKey(secret: string): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    encoded,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function base64UrlEncodeStr(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function signToken(userId: number, email: string): Promise<string> {
  const header = await base64UrlEncodeStr(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
  const payload = await base64UrlEncodeStr(JSON.stringify({ userId, email, exp }));
  const key = await importSecretKey(JWT_SECRET);
  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign("HMAC", key, sigInput);
  const sigB64 = await base64UrlEncode(sig);
  return `${header}.${payload}.${sigB64}`;
}

export async function verifyToken(token: string): Promise<{ userId: number; email: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const key = await importSecretKey(JWT_SECRET);
    const sigInput = new TextEncoder().encode(`${header}.${payload}`);
    const sigBytes = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, sigInput);
    if (!valid) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}

// --- Sync versions for use in handlers (pre-computed) ---

export function hashPasswordSync(password: string): string {
  // Fallback sync hash using a simple scheme for migration compatibility
  // In practice, async version is used
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return salt.toString("base64") + "." + btoa(password);
}
