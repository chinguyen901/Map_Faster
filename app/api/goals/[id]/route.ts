import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { goals } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const { name, targetAmount, savedAmount, deadline, note } = await req.json();

  if (!name || !targetAmount) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const updated = await db
    .update(goals)
    .set({
      name,
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount ?? 0),
      deadline: deadline ?? null,
      note: note ?? "",
    })
    .where(and(eq(goals.id, id), eq(goals.userId, user.userId)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy mục tiêu" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const deleted = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, user.userId)))
    .returning({ id: goals.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy mục tiêu" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
