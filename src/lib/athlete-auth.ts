import { createHash, timingSafeEqual } from "crypto";

const SALT = "correcrono-athlete-v1";

export function hashAthletePassword(password: string): string {
  return createHash("sha256")
    .update(`${SALT}:${password.trim()}`)
    .digest("hex");
}

export function verifyAthletePassword(
  password: string,
  storedHash: string | null | undefined
): boolean {
  if (!storedHash || !password?.trim()) return false;
  const h = hashAthletePassword(password);
  const a = Buffer.from(h);
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isValidAthletePassword(password: string): boolean {
  const p = password.trim();
  return p.length >= 4 && p.length <= 72;
}
