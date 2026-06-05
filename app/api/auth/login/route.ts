import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { signJWT, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const db = getDb();
  const { phone, password } = await req.json();

  if (!phone || !password) {
    return NextResponse.json({ error: "Vui lòng nhập số điện thoại và mật khẩu" }, { status: 400 });
  }

  const rows = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Số điện thoại hoặc mật khẩu không đúng" }, { status: 401 });
  }

  const user = rows[0];
  if (!user.isVerified) {
    return NextResponse.json(
      { error: "Tài khoản chưa được xác nhận. Vui lòng kiểm tra email." },
      { status: 403 }
    );
  }

  const match = await compare(password, user.passwordHash);
  if (!match) {
    return NextResponse.json({ error: "Số điện thoại hoặc mật khẩu không đúng" }, { status: 401 });
  }

  const token = await signJWT({ userId: user.id, phone: user.phone });
  await setAuthCookie(token);

  return NextResponse.json({ success: true });
}
