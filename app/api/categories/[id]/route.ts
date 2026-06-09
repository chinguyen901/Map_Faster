import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { customCategories } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const { type, name, icon, color } = await req.json();

  if (!type || !name || !icon || !color) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const updated = await db
    .update(customCategories)
    .set({ type, name, icon, color })
    .where(and(eq(customCategories.id, id), eq(customCategories.userId, user.userId)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const deleted = await db
    .delete(customCategories)
    .where(and(eq(customCategories.id, id), eq(customCategories.userId, user.userId)))
    .returning({ id: customCategories.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
