import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users, customCategories } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { phone } = await req.json();
  if (!phone || !/^0\d{8,9}$/.test(String(phone).replace(/\s/g, ""))) {
    return NextResponse.json({ error: "Số điện thoại không hợp lệ" }, { status: 400 });
  }

  const cleanPhone = String(phone).replace(/\s/g, "");
  await db.update(users).set({ bePartnerPhone: cleanPhone }).where(eq(users.id, user.userId));

  // Auto-create "Be Income" custom category if not exists
  const existing = await db
    .select({ id: customCategories.id })
    .from(customCategories)
    .where(and(eq(customCategories.userId, user.userId), eq(customCategories.name, "Be Income")));

  if (existing.length === 0) {
    await db.insert(customCategories).values({
      userId: user.userId,
      type: "income",
      name: "Be Income",
      icon: "🐝",
      color: "#FFD700",
    });
  }

  return NextResponse.json({ success: true, bePartnerPhone: cleanPhone });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { monthlyTarget } = await req.json();
  const target = monthlyTarget != null ? Number(monthlyTarget) : null;

  await db.update(users).set({ bePartnerMonthlyTarget: target }).where(eq(users.id, user.userId));

  return NextResponse.json({ success: true, monthlyTarget: target });
}

export async function DELETE() {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  await db.update(users).set({ bePartnerPhone: null, bePartnerMonthlyTarget: null }).where(eq(users.id, user.userId));

  return NextResponse.json({ success: true });
}
