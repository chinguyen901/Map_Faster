import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { loans } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const rows = await db
    .select()
    .from(loans)
    .where(eq(loans.userId, user.userId))
    .orderBy(desc(loans.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { name, lenderType, principal, monthlyPayment, totalMonths, monthsPaid, startMonth, dueDay, note } = await req.json();
  if (!name || !lenderType || !principal || !monthlyPayment || !totalMonths || !startMonth || !dueDay) {
    return NextResponse.json({ error: "Thiếu thông tin khoản vay" }, { status: 400 });
  }

  const inserted = await db
    .insert(loans)
    .values({
      userId: user.userId,
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
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
