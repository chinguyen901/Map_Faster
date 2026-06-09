import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { customCategories } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const rows = await db
    .select()
    .from(customCategories)
    .where(eq(customCategories.userId, user.userId))
    .orderBy(sql`${customCategories.createdAt} ASC`);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { type, name, icon, color } = await req.json();

  if (!type || !name || !icon || !color) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }
  if (type !== "income" && type !== "expense") {
    return NextResponse.json({ error: "Loại danh mục không hợp lệ" }, { status: 400 });
  }

  const inserted = await db
    .insert(customCategories)
    .values({ userId: user.userId, type, name, icon, color })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
