import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateOTPCode, saveOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const db = getDb();
  const { phone, email, password } = await req.json();

  if (!phone || !email || !password) {
    return NextResponse.json({ error: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
  }
  if (!/^\d{9,11}$/.test(phone.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "Số điện thoại không hợp lệ" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
  }

  const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (existing.length > 0 && existing[0].isVerified) {
    return NextResponse.json({ error: "Số điện thoại này đã được đăng ký" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);

  let userId: string;
  if (existing.length > 0) {
    await db.update(users).set({ email, passwordHash }).where(eq(users.phone, phone));
    userId = existing[0].id;
  } else {
    const inserted = await db
      .insert(users)
      .values({ phone, email, passwordHash, isVerified: false })
      .returning({ id: users.id });
    userId = inserted[0].id;
  }

  const code = generateOTPCode();
  await saveOTP({ userId, target: email, code, purpose: "register" });
  await sendOTPEmail(email, code, "register");

  return NextResponse.json({ email, userId });
}
