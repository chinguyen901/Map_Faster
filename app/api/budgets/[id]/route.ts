import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { budgets } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const { amount } = await req.json();
  if (!amount) return NextResponse.json({ error: "Thiếu số tiền" }, { status: 400 });

  const updated = await db
    .update(budgets)
    .set({ amount: Number(amount) })
    .where(and(eq(budgets.id, id), eq(budgets.userId, user.userId)))
    .returning();

  if (!updated.length) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const deleted = await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, user.userId)))
    .returning();

  if (!deleted.length) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
