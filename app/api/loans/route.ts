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

  const { name, lenderType, principal, monthlyPayment, totalMonths, monthsPaid, startMonth, dueDay, paidAmount, note } = await req.json();
  const isPersonal = lenderType === "personal";
  if (!name || !lenderType || !principal || !startMonth) {
    return NextResponse.json({ error: "Thiếu thông tin khoản vay" }, { status: 400 });
  }
  if (!isPersonal && (!monthlyPayment || !totalMonths || !dueDay)) {
    return NextResponse.json({ error: "Thiếu thông tin khoản vay" }, { status: 400 });
  }

  const inserted = await db
    .insert(loans)
    .values({
      userId: user.userId,
      name,
      lenderType,
      principal: Number(principal),
      monthlyPayment: isPersonal ? null : Number(monthlyPayment),
      totalMonths: isPersonal ? null : Number(totalMonths),
      monthsPaid: monthsPaid ? Number(monthsPaid) : 0,
      startMonth,
      dueDay: isPersonal ? null : Number(dueDay),
      paidAmount: paidAmount ? Number(paidAmount) : 0,
      note: note ?? "",
    })
    .returning();

  return NextResponse.json(inserted[0], { status: 201 });
}
