// Działa zarówno w Node.js (route handlers), jak i w Edge (middleware) —
// używa Web Crypto (globalne `crypto.subtle`), bez modułu "crypto" z Node.

export const COOKIE_NAME = "asystent_auth";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedToken(): Promise<string> {
  const pass = process.env.APP_PASSWORD || "";
  const secret = process.env.AUTH_SECRET || "";
  return sha256Hex(pass + "::" + secret);
}

export function checkPassword(input: string): boolean {
  return !!process.env.APP_PASSWORD && input === process.env.APP_PASSWORD;
}
