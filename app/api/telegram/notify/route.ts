import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users, reminders, loans } from "@/lib/schema";
import { eq, isNotNull } from "drizzle-orm";
import { sendMessage, formatAmount } from "@/lib/telegram";
import { calcLoanStatus } from "@/lib/calculations";
import { Loan } from "@/types";

// GET /api/telegram/notify — Called daily by Vercel Cron at 8:00 AM Vietnam (01:00 UTC)
export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  const todayDay = now.getDate();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isFirstOfMonth = todayDay === 1;

  // Get all users with telegram connected
  const linkedUsers = await db
    .select({ id: users.id, telegramChatId: users.telegramChatId })
    .from(users)
    .where(isNotNull(users.telegramChatId));

  let notified = 0;

  for (const u of linkedUsers) {
    if (!u.telegramChatId) continue;
    const chatId = u.telegramChatId;
    const messages: string[] = [];

    // --- First of month: summary prompt ---
    if (isFirstOfMonth) {
      messages.push("🗓️ <b>Đầu tháng mới rồi!</b> Đừng quên ghi chép thu chi ngay từ hôm nay để có báo cáo chính xác nhé.");
    }

    // --- Reminder check: due within 3 days ---
    const userReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, u.id));

    const dueReminders = userReminders.filter((r) => {
      if (!r.isActive) return false;
      const diff = r.dayOfMonth - todayDay;
      return diff >= 0 && diff <= 3;
    });

    if (dueReminders.length > 0) {
      const lines = dueReminders.map((r) => {
        const daysLeft = r.dayOfMonth - todayDay;
        const when = daysLeft === 0 ? "hôm nay" : `còn ${daysLeft} ngày`;
        const amount = r.amountEstimate ? ` · ~${formatAmount(r.amountEstimate)}` : "";
        return `• <b>${r.name}</b>${amount} — ${when} (ngày ${r.dayOfMonth})`;
      });
      messages.push(`🔔 <b>Nhắc nhở hoá đơn:</b>\n${lines.join("\n")}`);
    }

    // --- Loan check: due/overdue and not paid off ---
    const userLoans = await db
      .select()
      .from(loans)
      .where(eq(loans.userId, u.id));

    const dueLoans = userLoans.filter((l) => {
      const loanData: Loan = {
        id: l.id,
        name: l.name,
        lenderType: l.lenderType as Loan["lenderType"],
        principal: l.principal,
        monthlyPayment: l.monthlyPayment,
        totalMonths: l.totalMonths,
        monthsPaid: l.monthsPaid,
        startMonth: l.startMonth,
        dueDay: l.dueDay,
        note: l.note,
        createdAt: String(l.createdAt),
      };
      const status = calcLoanStatus(loanData);
      if (status.status === "paid_off" || status.status === "upcoming") return false;
      // due or overdue — check if dueDay is within 3 days
      const diff = l.dueDay - todayDay;
      return diff >= -1 && diff <= 3;
    });

    if (dueLoans.length > 0) {
      const lines = dueLoans.map((l) => {
        const daysLeft = l.dueDay - todayDay;
        const when =
          daysLeft < 0 ? `quá hạn ${Math.abs(daysLeft)} ngày` :
          daysLeft === 0 ? "đến hạn hôm nay" :
          `còn ${daysLeft} ngày (ngày ${l.dueDay})`;
        return `• <b>${l.name}</b> · ${formatAmount(l.monthlyPayment)} — ${when}`;
      });
      messages.push(`🏦 <b>Trả khoản vay:</b>\n${lines.join("\n")}`);
    }

    if (messages.length > 0) {
      await sendMessage(chatId, messages.join("\n\n"));
      notified++;
    }
  }

  return NextResponse.json({ ok: true, notified, month });
}
