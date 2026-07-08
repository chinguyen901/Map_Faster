import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { beeFixedItems } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const { name, amount } = await req.json();
  if (!name || !amount) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const updated = await db
    .update(beeFixedItems)
    .set({ name, amount: Number(amount) })
    .where(and(eq(beeFixedItems.id, id), eq(beeFixedItems.userId, user.userId)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const deleted = await db
    .delete(beeFixedItems)
    .where(and(eq(beeFixedItems.id, id), eq(beeFixedItems.userId, user.userId)))
    .returning({ id: beeFixedItems.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
