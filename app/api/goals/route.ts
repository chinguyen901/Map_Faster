import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { goals } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const rows = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, user.userId))
    .orderBy(sql`${goals.createdAt} DESC`);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { name, targetAmount, savedAmount, deadline, note } = await req.json();

  if (!name || !targetAmount) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const inserted = await db
    .insert(goals)
    .values({
      userId: user.userId,
      name,
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount ?? 0),
      deadline: deadline ?? null,
      note: note ?? "",
    })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
