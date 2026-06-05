import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { jwtVerify } from "jose";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(req: NextRequest) {
  const db = getDb();
  const { resetToken, newPassword } = await req.json();

  if (!resetToken || !newPassword) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
  }

  try {
    const { payload } = await jwtVerify(resetToken, JWT_SECRET);
    if (payload.purpose !== "reset") throw new Error("Invalid purpose");

    const userId = payload.userId as string;
    const passwordHash = await hash(newPassword, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" }, { status: 400 });
  }
}
