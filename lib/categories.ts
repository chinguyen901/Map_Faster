import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CustomCategory } from "@/types";

export interface CategoryDef {
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
  id?: string;
}

export function getMergedCategories(
  type: "income" | "expense",
  custom: CustomCategory[]
): CategoryDef[] {
  const defaults: CategoryDef[] = (type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(
    (c) => ({ name: c.name, icon: c.icon, color: c.color })
  );
  const customForType: CategoryDef[] = custom
    .filter((c) => c.type === type)
    .map((c) => ({ name: c.name, icon: c.icon, color: c.color, isCustom: true, id: c.id }));
  return [...defaults, ...customForType];
}

export const PRESET_COLORS = [
  "#FF6B6B", "#FF9800", "#FFD93D", "#6BCB77",
  "#4CAF50", "#1E90FF", "#4CC9F0", "#7B2FBE",
  "#FF4081", "#9C27B0", "#607D8B", "#795548",
];

export const EXPENSE_EMOJI_SUGGESTIONS = [
  "🍜", "🍔", "🍕", "🥗", "☕", "🧋",
  "🛍️", "👗", "👟", "💄", "📱", "💻",
  "🎮", "🎬", "🎪", "🎵", "✈️", "🚗",
  "🏥", "💊", "🔧", "🏠", "💡", "📚",
  "🎓", "🐕", "👶", "🎁", "🌸", "🏋️",
];

export const INCOME_EMOJI_SUGGESTIONS = [
  "💼", "💰", "💵", "💳", "📈", "📊",
  "🏆", "🎯", "🌟", "✨", "💡", "🔑",
  "🏠", "🚀", "💎", "🎪", "🤝", "📝",
];
