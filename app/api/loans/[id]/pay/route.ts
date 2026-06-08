import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { loans } from "@/lib/schema";
import { and, eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;

  const [loan] = await db
    .select()
    .from(loans)
    .where(and(eq(loans.id, id), eq(loans.userId, user.userId)));

  if (!loan) return NextResponse.json({ error: "Không tìm thấy khoản vay" }, { status: 404 });
  if (loan.monthsPaid >= loan.totalMonths) {
    return NextResponse.json({ error: "Khoản vay đã trả hết" }, { status: 400 });
  }

  const updated = await db
    .update(loans)
    .set({ monthsPaid: sql`${loans.monthsPaid} + 1` })
    .where(and(eq(loans.id, id), eq(loans.userId, user.userId)))
    .returning();

  return NextResponse.json(updated[0]);
}
