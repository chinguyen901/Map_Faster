import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { transactions } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month");
  let rows;

  if (month) {
    rows = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.userId),
          sql`to_char(${transactions.date}, 'YYYY-MM') = ${month}`
        )
      )
      .orderBy(sql`${transactions.date} DESC, ${transactions.createdAt} DESC`);
  } else {
    rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.userId))
      .orderBy(sql`${transactions.date} DESC, ${transactions.createdAt} DESC`);
  }

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { type, category, amount, note, date } = await req.json();
  if (!type || !category || !amount || !date) {
    return NextResponse.json({ error: "Thiếu thông tin giao dịch" }, { status: 400 });
  }

  const inserted = await db
    .insert(transactions)
    .values({ userId: user.userId, type, category, amount: Number(amount), note: note ?? "", date })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
