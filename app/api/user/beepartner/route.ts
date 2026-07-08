import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
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

  return NextResponse.json({ success: true, bePartnerPhone: cleanPhone });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json();
  const updates: { bePartnerMonthlyTarget?: number | null; bePartnerSavingsBuffer?: number | null } = {};
  if ("monthlyTarget" in body) {
    updates.bePartnerMonthlyTarget = body.monthlyTarget != null ? Number(body.monthlyTarget) : null;
  }
  if ("savingsBuffer" in body) {
    updates.bePartnerSavingsBuffer = body.savingsBuffer != null ? Number(body.savingsBuffer) : null;
  }

  await db.update(users).set(updates).where(eq(users.id, user.userId));

  return NextResponse.json({ success: true, ...updates });
}

export async function DELETE() {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  await db.update(users).set({ bePartnerPhone: null, bePartnerMonthlyTarget: null }).where(eq(users.id, user.userId));

  return NextResponse.json({ success: true });
}
