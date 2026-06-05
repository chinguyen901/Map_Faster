import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateOTPCode, saveOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const db = getDb();
  const { phone } = await req.json();

  if (!phone) {
    return NextResponse.json({ error: "Vui lòng nhập số điện thoại" }, { status: 400 });
  }

  const rows = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

  if (rows.length === 0 || !rows[0].isVerified) {
    return NextResponse.json({ email: "***@***.***" });
  }

  const user = rows[0];
  const code = generateOTPCode();
  await saveOTP({ userId: user.id, target: user.email, code, purpose: "reset" });
  await sendOTPEmail(user.email, code, "reset");

  const masked = user.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(b.length) + c);
  return NextResponse.json({ email: masked, userId: user.id });
}
