import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { beDailyTargets } from "@/lib/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "Thiếu khoảng ngày" }, { status: 400 });

  const rows = await db
    .select()
    .from(beDailyTargets)
    .where(
      and(
        eq(beDailyTargets.userId, user.userId),
        gte(beDailyTargets.date, start),
        lte(beDailyTargets.date, end)
      )
    );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { date, targetAmount } = await req.json();
  if (!date || targetAmount == null) {
    return NextResponse.json({ error: "Thiếu thông tin mục tiêu" }, { status: 400 });
  }

  // Upsert: update if exists, else insert
  const existing = await db
    .select()
    .from(beDailyTargets)
    .where(and(eq(beDailyTargets.userId, user.userId), eq(beDailyTargets.date, date)));

  if (existing.length > 0) {
    const updated = await db
      .update(beDailyTargets)
      .set({ targetAmount: Number(targetAmount) })
      .where(eq(beDailyTargets.id, existing[0].id))
      .returning();
    return NextResponse.json(updated[0]);
  }

  const inserted = await db
    .insert(beDailyTargets)
    .values({ userId: user.userId, date, targetAmount: Number(targetAmount) })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
