import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { reminders } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const { name, dayOfMonth, amountEstimate, isActive, note } = await req.json();

  if (!name || !dayOfMonth) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const updated = await db
    .update(reminders)
    .set({
      name,
      dayOfMonth: Math.min(Math.max(Number(dayOfMonth), 1), 31),
      amountEstimate: amountEstimate != null ? Number(amountEstimate) : null,
      isActive: Boolean(isActive ?? true),
      note: note ?? "",
    })
    .where(and(eq(reminders.id, id), eq(reminders.userId, user.userId)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy nhắc nhở" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const deleted = await db
    .delete(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, user.userId)))
    .returning({ id: reminders.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy nhắc nhở" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
