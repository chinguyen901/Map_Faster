import { parseVoiceInput } from "@/lib/voiceParser";
import { CustomCategory } from "@/types";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendMessage(chatId: string, text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export interface BotIntent {
  tx?: {
    type: "income" | "expense";
    amount: number;
    category: string;
    note: string;
  };
  query?: "balance" | "today" | "help";
  isBe?: boolean;
}

const BALANCE_RE = /(còn bao nhiêu|quỹ còn|số dư|tháng này|hôm nay.*tiền|tổng thu|tổng chi|báo cáo|thống kê|quỹ)/i;
const TODAY_RE = /(hôm nay chi|hôm nay tiêu|hôm nay thu|chi hôm nay|thu hôm nay)/i;
const BE_RE = /\bbee?\b/i;

export function parseBotMessage(text: string, customCats: CustomCategory[]): BotIntent {
  const trimmed = text.trim();

  if (trimmed.startsWith("/help") || trimmed.toLowerCase() === "help") {
    return { query: "help" };
  }

  if (TODAY_RE.test(trimmed)) return { query: "today" };
  if (BALANCE_RE.test(trimmed)) return { query: "balance" };

  const parsed = parseVoiceInput(trimmed, customCats);
  if (parsed.amount && parsed.amount > 0) {
    const type = parsed.type ?? "expense";
    const category = parsed.category ?? "Khác";
    const isBe = BE_RE.test(trimmed) && type === "income";
    return {
      tx: { type, amount: parsed.amount, category, note: trimmed },
      isBe,
    };
  }

  return {};
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString("vi-VN") + " đ";
}

const BE_MOTIVATIONS = [
  "Tuyệt vời! Mỗi chuyến xe là một bước gần hơn đến mục tiêu. Cố lên! 💪",
  "Sắp đạt chỉ tiêu rồi! Tiếp tục nhé, bạn đang làm rất tốt! 🔥",
  "Cày ngày hôm nay, nghỉ ngơi tương lai. Giữ vững tinh thần! 🚗",
  "Mỗi đồng kiếm được đều xứng đáng! Thu nhập đã được ghi lại. 💰",
  "Tốt lắm! Chạy đều tay thì cuối tháng dư đẹp. Cố nhé! 🎯",
];

export function randomBeMotivation(): string {
  return BE_MOTIVATIONS[Math.floor(Math.random() * BE_MOTIVATIONS.length)];
}
