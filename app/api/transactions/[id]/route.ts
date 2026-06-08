import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { transactions } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { type, category, amount, note, date, isRecurring, recurringDay } = body;

  if (!type || !category || !amount || !date) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const updated = await db
    .update(transactions)
    .set({
      type,
      category,
      amount,
      note: note ?? "",
      date,
      isRecurring: isRecurring === true,
      recurringDay: isRecurring && recurringDay ? Number(recurringDay) : null,
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.userId)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy giao dịch" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const deleted = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.userId)))
    .returning({ id: transactions.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy giao dịch" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
