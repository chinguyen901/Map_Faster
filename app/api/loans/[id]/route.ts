import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { loans } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const { name, lenderType, principal, monthlyPayment, totalMonths, monthsPaid, startMonth, dueDay, note } = await req.json();
  if (!name || !lenderType || !principal || !monthlyPayment || !totalMonths || !startMonth || !dueDay) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const updated = await db
    .update(loans)
    .set({
      name,
      lenderType,
      principal: Number(principal),
      monthlyPayment: Number(monthlyPayment),
      totalMonths: Number(totalMonths),
      monthsPaid: monthsPaid ? Number(monthsPaid) : 0,
      startMonth,
      dueDay: Number(dueDay),
      note: note ?? "",
    })
    .where(and(eq(loans.id, id), eq(loans.userId, user.userId)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy khoản vay" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const deleted = await db
    .delete(loans)
    .where(and(eq(loans.id, id), eq(loans.userId, user.userId)))
    .returning({ id: loans.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy khoản vay" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
