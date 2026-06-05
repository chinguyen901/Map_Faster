import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { verifyOTP } from "@/lib/otp";
import { signJWT, setAuthCookie } from "@/lib/auth";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(req: NextRequest) {
  const db = getDb();
  const { userId, code, purpose } = await req.json();

  if (!userId || !code || !purpose) {
    return NextResponse.json({ error: "Thiếu thông tin xác nhận" }, { status: 400 });
  }

  const valid = await verifyOTP({ userId, code, purpose });
  if (!valid) {
    return NextResponse.json({ error: "Mã OTP không đúng hoặc đã hết hạn" }, { status: 400 });
  }

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userRows.length === 0) {
    return NextResponse.json({ error: "Người dùng không tồn tại" }, { status: 404 });
  }
  const user = userRows[0];

  if (purpose === "register") {
    await db.update(users).set({ isVerified: true }).where(eq(users.id, userId));
    const token = await signJWT({ userId: user.id, phone: user.phone });
    await setAuthCookie(token);
    return NextResponse.json({ success: true });
  }

  if (purpose === "reset") {
    const resetToken = await new SignJWT({ userId: user.id, purpose: "reset" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("10m")
      .sign(JWT_SECRET);
    return NextResponse.json({ resetToken });
  }

  return NextResponse.json({ error: "Mục đích không hợp lệ" }, { status: 400 });
}
