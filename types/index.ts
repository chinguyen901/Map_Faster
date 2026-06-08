export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  note: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string;
}

export interface MonthSummary {
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export const EXPENSE_CATEGORIES = [
  { name: "Ăn uống", icon: "🍜", color: "#FF6B6B" },
  { name: "Di chuyển", icon: "🚗", color: "#4ECDC4" },
  { name: "Giải trí", icon: "🎮", color: "#45B7D1" },
  { name: "Mua sắm", icon: "🛍️", color: "#96CEB4" },
  { name: "Y tế", icon: "💊", color: "#FFEAA7" },
  { name: "Hoá đơn", icon: "📱", color: "#DDA0DD" },
  { name: "Giáo dục", icon: "📚", color: "#98D8C8" },
  { name: "Khác", icon: "💰", color: "#B0B0B0" },
] as const;

export const INCOME_CATEGORIES = [
  { name: "Lương", icon: "💼", color: "#4CAF50" },
  { name: "Thưởng", icon: "🎁", color: "#81C784" },
  { name: "Phụ cấp", icon: "💵", color: "#A5D6A7" },
  { name: "Đầu tư", icon: "📈", color: "#66BB6A" },
  { name: "Khác", icon: "💚", color: "#C8E6C9" },
] as const;

export type LenderType = "bank" | "consumer" | "personal" | "other";

export interface Loan {
  id: string;
  name: string;
  lenderType: LenderType;
  principal: number;
  monthlyPayment: number;
  totalMonths: number;
  monthsPaid: number;
  startMonth: string; // YYYY-MM
  dueDay: number;
  note: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string; // YYYY-MM
  createdAt: string;
}

export const LENDER_TYPES = [
  { value: "bank" as LenderType, label: "Ngân hàng", icon: "🏦" },
  { value: "consumer" as LenderType, label: "Vay tiêu dùng", icon: "💳" },
  { value: "personal" as LenderType, label: "Vay cá nhân", icon: "👤" },
  { value: "other" as LenderType, label: "Khác", icon: "📝" },
] as const;
