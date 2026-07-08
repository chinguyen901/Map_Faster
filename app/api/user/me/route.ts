import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const db = getDb();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const [row] = await db
    .select({
      phone: users.phone,
      bePartnerPhone: users.bePartnerPhone,
      bePartnerMonthlyTarget: users.bePartnerMonthlyTarget,
      bePartnerSavingsBuffer: users.bePartnerSavingsBuffer,
    })
    .from(users)
    .where(eq(users.id, user.userId));

  if (!row) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  return NextResponse.json({
    phone: row.phone,
    bePartnerPhone: row.bePartnerPhone ?? null,
    bePartnerMonthlyTarget: row.bePartnerMonthlyTarget ?? null,
    bePartnerSavingsBuffer: row.bePartnerSavingsBuffer ?? null,
  });
}
