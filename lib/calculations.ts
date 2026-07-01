import { Transaction, MonthSummary, CategorySummary, EXPENSE_CATEGORIES } from "@/types";

export function getMonthTransactions(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(month));
}

export function calcMonthSummary(transactions: Transaction[], month: string): MonthSummary {
  const txs = getMonthTransactions(transactions, month);
  const totalIncome = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return { month, totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

export function calcExpenseByCategory(transactions: Transaction[], month: string): CategorySummary[] {
  const txs = getMonthTransactions(transactions, month).filter((t) => t.type === "expense");
  const total = txs.reduce((s, t) => s + t.amount, 0);
  if (total === 0) return [];

  const map = new Map<string, number>();
  txs.forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount));

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => {
      const cat = EXPENSE_CATEGORIES.find((c) => c.name === category);
      return {
        category,
        amount,
        percentage: Math.round((amount / total) * 100),
        color: cat?.color ?? "#B0B0B0",
      };
    });
}

export function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}
