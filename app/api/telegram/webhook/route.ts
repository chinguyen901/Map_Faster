import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users, transactions, customCategories } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { sendMessage, parseBotMessage, formatAmount, randomBeMotivation } from "@/lib/telegram";
import { calcMonthSummary } from "@/lib/calculations";
import { Transaction } from "@/types";

// Telegram calls this endpoint for every user message
export async function POST(req: NextRequest) {
  // Verify the request comes from Telegram
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.message) return NextResponse.json({ ok: true });

  const { message } = body;
  const chatId = String(message.chat?.id ?? "");
  const text: string = message.text ?? "";
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const db = getDb();

  // --- Handle /start TOKEN (account linking) ---
  if (text.startsWith("/start")) {
    const token = text.split(" ")[1]?.trim() ?? "";

    if (!token) {
      await sendMessage(chatId, "👋 Xin chào! Để sử dụng bot, hãy vào app Thu Chi → Cài đặt → <b>Kết nối Telegram</b> và nhấn \"Kết nối ngay\".");
      return NextResponse.json({ ok: true });
    }

    // Validate token and link account
    const now = new Date();
    const [userRow] = await db
      .select({ id: users.id, phone: users.phone, telegramChatId: users.telegramChatId })
      .from(users)
      .where(
        sql`${users.telegramLinkToken} = ${token} AND ${users.telegramLinkTokenExpires} > ${now}`
      );

    if (!userRow) {
      await sendMessage(chatId, "❌ Link đã hết hạn hoặc không hợp lệ. Vui lòng vào app và nhấn \"Kết nối ngay\" lại.");
      return NextResponse.json({ ok: true });
    }

    // Check if another account already linked this chat
    await db
      .update(users)
      .set({ telegramChatId: null } as never)
      .where(eq(users.telegramChatId, chatId));

    // Save chat_id and clear token
    await db
      .update(users)
      .set({
        telegramChatId: chatId,
        telegramLinkToken: null,
        telegramLinkTokenExpires: null,
      } as never)
      .where(eq(users.id, userRow.id));

    await sendMessage(
      chatId,
      `✅ <b>Đã kết nối thành công!</b>\n\nTừ giờ bạn có thể:\n• Nhắn <b>"ăn cơm 50k"</b> để ghi chi tiêu\n• Nhắn <b>"chạy bee được 250k"</b> để ghi thu nhập\n• Nhắn <b>"hôm nay còn bao nhiêu"</b> để xem số dư\n\nGõ /help để xem hướng dẫn đầy đủ.`
    );
    return NextResponse.json({ ok: true });
  }

  // --- Find user by chat_id ---
  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.telegramChatId, chatId));

  if (!userRow) {
    await sendMessage(chatId, "⚠️ Tài khoản chưa được kết nối. Vào app Thu Chi → Cài đặt → <b>Kết nối Telegram</b> để bắt đầu.");
    return NextResponse.json({ ok: true });
  }

  const userId = userRow.id;

  // --- Handle /help ---
  if (text.startsWith("/help")) {
    await sendMessage(
      chatId,
      "📖 <b>Hướng dẫn sử dụng:</b>\n\n💸 <b>Ghi chi tiêu:</b>\n• \"ăn cơm 50k\"\n• \"mua sắm 200 nghìn\"\n• \"cafe 35k\"\n\n💰 <b>Ghi thu nhập:</b>\n• \"chạy bee được 250k\"\n• \"nhận lương 8 triệu\"\n• \"thưởng 1tr5\"\n\n📊 <b>Xem số dư:</b>\n• \"hôm nay còn bao nhiêu\"\n• \"quỹ còn bao nhiêu\"\n• \"tháng này chi bao nhiêu\"\n\n📅 <b>Giao dịch hôm nay:</b>\n• \"hôm nay chi bao nhiêu\"\n• \"hôm nay thu bao nhiêu\""
    );
    return NextResponse.json({ ok: true });
  }

  // --- Load custom categories for this user ---
  const customCatsRaw = await db
    .select()
    .from(customCategories)
    .where(eq(customCategories.userId, userId));

  const customCats = customCatsRaw.map((c) => ({
    ...c,
    type: c.type as "income" | "expense",
    createdAt: String(c.createdAt),
  }));

  const intent = parseBotMessage(text, customCats);

  // --- Handle balance query ---
  if (intent.query === "balance" || intent.query === "today") {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const todayISO = now.toISOString().split("T")[0];

    const allTxRows = await db
      .select()
      .from(transactions)
      .where(
        sql`${transactions.userId} = ${userId} AND to_char(${transactions.date}, 'YYYY-MM') = ${currentMonth}`
      );

    const txList: Transaction[] = allTxRows.map((r) => ({
      id: r.id,
      userId: r.userId,
      type: r.type as "income" | "expense",
      category: r.category,
      amount: r.amount,
      note: r.note,
      date: String(r.date),
      isRecurring: r.isRecurring,
      recurringDay: r.recurringDay ?? null,
      createdAt: String(r.createdAt),
    }));

    if (intent.query === "today") {
      const todayTxs = txList.filter((t) => t.date === todayISO);
      const todayIncome = todayTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const todayExpense = todayTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

      if (todayTxs.length === 0) {
        await sendMessage(chatId, `📅 Hôm nay (${todayISO}) chưa có giao dịch nào.`);
      } else {
        const lines = todayTxs
          .slice(-5)
          .map((t) => `${t.type === "income" ? "💚" : "❤️"} ${t.category} · ${formatAmount(t.amount)}`);
        await sendMessage(
          chatId,
          `📅 <b>Hôm nay ${todayISO}</b>\n${lines.join("\n")}\n\n💚 Thu: ${formatAmount(todayIncome)}\n❤️ Chi: ${formatAmount(todayExpense)}`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // balance query — show full month summary
    const summary = calcMonthSummary(txList, currentMonth);
    const balanceSign = summary.balance >= 0 ? "💰" : "⚠️";
    const month = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

    await sendMessage(
      chatId,
      `📊 <b>${month}</b>\n\n💚 Thu: ${formatAmount(summary.totalIncome)}\n❤️ Chi: ${formatAmount(summary.totalExpense)}\n${balanceSign} Còn lại: <b>${formatAmount(summary.balance)}</b>`
    );
    return NextResponse.json({ ok: true });
  }

  // --- Handle transaction recording ---
  if (intent.tx) {
    const { type, amount, category, note } = intent.tx;
    const todayISO = new Date().toISOString().split("T")[0];

    await db.insert(transactions).values({
      userId,
      type,
      category,
      amount,
      note,
      date: todayISO,
      isRecurring: false,
      recurringDay: null,
    });

    const typeLabel = type === "income" ? "💚 Thu nhập" : "❤️ Chi tiêu";
    let reply = `✅ <b>Đã ghi ${type === "income" ? "thu nhập" : "chi tiêu"}</b>\n${typeLabel === "💚 Thu nhập" ? "💚" : "❤️"} ${category} · ${formatAmount(amount)}\n📅 ${todayISO}`;

    if (intent.isBe) {
      reply += `\n\n${randomBeMotivation()}`;
    }

    await sendMessage(chatId, reply);
    return NextResponse.json({ ok: true });
  }

  // --- Unknown message ---
  await sendMessage(
    chatId,
    "🤔 Mình chưa hiểu. Thử nhắn:\n• <b>\"ăn cơm 50k\"</b> để ghi chi tiêu\n• <b>\"chạy bee được 250k\"</b> để ghi thu nhập\n• <b>\"hôm nay còn bao nhiêu\"</b> để xem số dư\n• /help để xem hướng dẫn đầy đủ"
  );
  return NextResponse.json({ ok: true });
}
