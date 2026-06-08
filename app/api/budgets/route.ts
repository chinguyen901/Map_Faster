import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { budgets } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month");
  if (!month) return NextResponse.json({ error: "Thiếu tháng" }, { status: 400 });

  const rows = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, user.userId), eq(budgets.month, month)));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { category, amount, month } = await req.json();
  if (!category || !amount || !month) {
    return NextResponse.json({ error: "Thiếu thông tin ngân sách" }, { status: 400 });
  }

  // Upsert: update if exists, else insert
  const existing = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, user.userId), eq(budgets.category, category), eq(budgets.month, month)));

  if (existing.length > 0) {
    const updated = await db
      .update(budgets)
      .set({ amount: Number(amount) })
      .where(eq(budgets.id, existing[0].id))
      .returning();
    return NextResponse.json(updated[0]);
  }

  const inserted = await db
    .insert(budgets)
    .values({ userId: user.userId, category, amount: Number(amount), month })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
