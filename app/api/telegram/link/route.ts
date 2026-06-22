import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { randomBytes } from "crypto";

// GET /api/telegram/link — Generate a one-time link token and return bot URL
export async function GET() {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const token = randomBytes(32).toString("hex"); // 64-char hex token
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db
    .update(users)
    .set({ telegramLinkToken: token, telegramLinkTokenExpires: expires } as never)
    .where(eq(users.id, user.userId));

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "ThuChiBot";
  const url = `https://t.me/${botUsername}?start=${token}`;

  return NextResponse.json({ url });
}

// DELETE /api/telegram/link — Unlink telegram account
export async function DELETE() {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  await db
    .update(users)
    .set({ telegramChatId: null, telegramLinkToken: null, telegramLinkTokenExpires: null } as never)
    .where(eq(users.id, user.userId));

  return NextResponse.json({ ok: true });
}
