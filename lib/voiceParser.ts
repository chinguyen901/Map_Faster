import { CustomCategory } from "@/types";

export interface ParsedVoice {
  type: "income" | "expense" | null;
  amount: number | null;
  category: string | null;
  note: string;
}

function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function parseAmount(text: string): number | null {
  const t = removeAccents(text.toLowerCase());

  // tỷ (1,000,000,000)
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*ty(\s*ruoi)?/);
  if (m) return Math.round((parseFloat(m[1].replace(",", ".")) + (m[2] ? 0.5 : 0)) * 1_000_000_000);

  // triệu / tr (1,000,000)
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:trieu|tr\b)(\s*ruoi)?/);
  if (m) return Math.round((parseFloat(m[1].replace(",", ".")) + (m[2] ? 0.5 : 0)) * 1_000_000);

  // X trăm nghìn (e.g. "5 trăm nghìn" = 500,000)
  m = t.match(/(\d+)\s*tram\s*(?:nghin|ngan)/);
  if (m) return parseInt(m[1]) * 100_000;

  // nghìn / ngàn (1,000)
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:nghin|ngan)(\s*ruoi)?/);
  if (m) return Math.round((parseFloat(m[1].replace(",", ".")) + (m[2] ? 0.5 : 0)) * 1_000);

  // k (1,000) — "250k", "30k"
  m = t.match(/(\d+(?:[.,]\d+)?)\s*k\b(\s*ruoi)?/);
  if (m) return Math.round((parseFloat(m[1].replace(",", ".")) + (m[2] ? 0.5 : 0)) * 1_000);

  // Standalone 4+ digit number
  const origM = text.match(/\b(\d[\d.,]{3,})\b/);
  if (origM) return parseInt(origM[1].replace(/[.,]/g, ""));

  return null;
}

const INCOME_KW = ["duoc", "nhan duoc", "nhan", "kiem duoc", "kiem", "thu nhap", "luong", "thuong", "bonus", "hoan tien", "thu ve"];
const EXPENSE_KW = ["mua", "chi ", "tra tien", "tieu", "dat mon", "mat", "thanh toan", "nap tien", "nap ", "an com", "di an", "uong"];

function detectType(text: string): "income" | "expense" | null {
  const t = removeAccents(text.toLowerCase());
  const inc = INCOME_KW.some((kw) => t.includes(kw));
  const exp = EXPENSE_KW.some((kw) => t.includes(kw));
  if (inc && !exp) return "income";
  if (exp && !inc) return "expense";
  if (inc && exp) return t.includes("duoc") || t.includes("nhan") ? "income" : "expense";
  return null;
}

// Match a keyword in text — use word-boundary approximation for short keys
function matchesKey(noAccentText: string, key: string): boolean {
  if (key.length <= 3) {
    return new RegExp(`(?:^|\\s)${key}(?:\\s|$)`).test(noAccentText);
  }
  return noAccentText.includes(key);
}

const CATEGORY_MAP: Array<{ keys: string[]; name: string; forType: "expense" | "income" | "both" }> = [
  { keys: ["grab", "gojek", "bee", "uber", "taxi", "xe om", "xang", "di chuyen", "giao hang", "shipper", "chay xe", "chay grab", "chay bee", "chay gojek"], name: "Di chuyển", forType: "both" },
  { keys: ["an", "com", "pho", "bun", "cafe", "tra sua", "nha hang", "do an", "banh", "bua an", "an uong"], name: "Ăn uống", forType: "expense" },
  { keys: ["shopee", "lazada", "tiki", "quan ao", "giay", "mua sam", "dep"], name: "Mua sắm", forType: "expense" },
  { keys: ["phim", "game", "giai tri", "karaoke", "du lich", "nghe nhac"], name: "Giải trí", forType: "expense" },
  { keys: ["thuoc", "benh vien", "kham benh", "y te", "bac si", "phong kham"], name: "Y tế", forType: "expense" },
  { keys: ["tien dien", "tien nuoc", "internet", "wifi", "hoa don", "cuoc dien thoai"], name: "Hoá đơn", forType: "expense" },
  { keys: ["hoc phi", "sach giao khoa", "khoa hoc", "giao duc", "hoc tieng"], name: "Giáo dục", forType: "expense" },
  { keys: ["luong", "salary", "tien luong"], name: "Lương", forType: "income" },
  { keys: ["thuong", "bonus", "qua tang", "qua bieu"], name: "Thưởng", forType: "income" },
  { keys: ["dau tu", "co phieu", "crypto", "lai suat", "tien lai"], name: "Đầu tư", forType: "income" },
  { keys: ["phu cap", "tro cap", "ho tro", "tien ho tro"], name: "Phụ cấp", forType: "income" },
];

function detectCategory(
  text: string,
  customCats: CustomCategory[],
  type: "income" | "expense" | null
): string | null {
  const na = removeAccents(text.toLowerCase());

  // Custom categories first (by name match in text)
  for (const cat of customCats) {
    const catNa = removeAccents(cat.name.toLowerCase());
    if (catNa.length >= 2 && matchesKey(na, catNa)) return cat.name;
  }

  // Default categories — type-filtered first
  for (const entry of CATEGORY_MAP) {
    if (type && entry.forType !== "both" && entry.forType !== type) continue;
    for (const key of entry.keys) {
      if (matchesKey(na, key)) return entry.name;
    }
  }

  // Fallback: try without type filter (e.g. "chạy bee được tiền" → Di chuyển even though income)
  if (type) {
    for (const entry of CATEGORY_MAP) {
      for (const key of entry.keys) {
        if (matchesKey(na, key)) return entry.name;
      }
    }
  }

  return null;
}

export function parseVoiceInput(transcript: string, customCats: CustomCategory[]): ParsedVoice {
  const amount = parseAmount(transcript);
  let type = detectType(transcript);
  const category = detectCategory(transcript, customCats, type);

  // Infer type from matched default category if still null
  if (!type && category) {
    const mapEntry = CATEGORY_MAP.find((e) => e.name === category);
    if (mapEntry && mapEntry.forType !== "both") type = mapEntry.forType;
  }

  return { type, amount, category, note: transcript };
}
