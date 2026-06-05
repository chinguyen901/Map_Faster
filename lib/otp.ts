import { getDb } from "./db";
import { otpCodes } from "./schema";
import { eq, and } from "drizzle-orm";

export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function saveOTP(params: {
  userId: string;
  target: string;
  code: string;
  purpose: "register" | "reset";
}): Promise<void> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.insert(otpCodes).values({
    userId: params.userId,
    target: params.target,
    code: params.code,
    purpose: params.purpose,
    expiresAt,
    used: false,
  });
}

export async function verifyOTP(params: {
  userId: string;
  code: string;
  purpose: "register" | "reset";
}): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.userId, params.userId),
        eq(otpCodes.code, params.code),
        eq(otpCodes.purpose, params.purpose),
        eq(otpCodes.used, false)
      )
    )
    .limit(1);

  if (rows.length === 0) return false;

  const otp = rows[0];
  if (new Date() > otp.expiresAt) return false;

  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
  return true;
}
