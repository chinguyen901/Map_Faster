import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { beeFixedItems } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const rows = await db
    .select()
    .from(beeFixedItems)
    .where(eq(beeFixedItems.userId, user.userId))
    .orderBy(desc(beeFixedItems.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { type, name, amount } = await req.json();
  if (!type || !name || !amount) {
    return NextResponse.json({ error: "Thiếu thông tin khoản" }, { status: 400 });
  }

  const inserted = await db
    .insert(beeFixedItems)
    .values({ userId: user.userId, type, name, amount: Number(amount) })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
