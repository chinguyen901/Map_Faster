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
  const body = await req.json().catch(() => ({}));
  const amount = body?.amount != null ? Number(body.amount) : null;

  const updated = await db
    .update(loans)
    .set(
      amount != null
        ? { paidAmount: sql`${loans.paidAmount} + ${amount}` }
        : { monthsPaid: sql`${loans.monthsPaid} + 1` }
    )
    .where(and(eq(loans.id, id), eq(loans.userId, user.userId)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy khoản vay" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}
