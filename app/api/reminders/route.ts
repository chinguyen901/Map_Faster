import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { reminders } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const rows = await db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, user.userId))
    .orderBy(sql`${reminders.dayOfMonth} ASC`);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { name, dayOfMonth, amountEstimate, note } = await req.json();

  if (!name || !dayOfMonth) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const day = Math.min(Math.max(Number(dayOfMonth), 1), 31);

  const inserted = await db
    .insert(reminders)
    .values({
      userId: user.userId,
      name,
      dayOfMonth: day,
      amountEstimate: amountEstimate ? Number(amountEstimate) : null,
      isActive: true,
      note: note ?? "",
    })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
