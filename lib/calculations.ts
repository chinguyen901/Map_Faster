import { Transaction, MonthSummary, CategorySummary, EXPENSE_CATEGORIES, Loan } from "@/types";

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

// --- Loan / Amortization calculations ---

// Solve for monthly interest rate r using Newton's method
// M = P * r * (1+r)^N / ((1+r)^N - 1)  →  solve for r
function solveMonthlyRate(principal: number, monthlyPayment: number, totalMonths: number): number {
  // 0% interest case: M = P/N (within 1 VND rounding)
  if (Math.abs(monthlyPayment * totalMonths - principal) < totalMonths) return 0;

  let r = 0.01; // initial guess ~12%/năm
  for (let i = 0; i < 50; i++) {
    const factor = Math.pow(1 + r, totalMonths);
    const f = principal * r * factor - monthlyPayment * (factor - 1);
    const df = principal * (factor + r * totalMonths * Math.pow(1 + r, totalMonths - 1))
               - monthlyPayment * totalMonths * Math.pow(1 + r, totalMonths - 1);
    const rNext = r - f / df;
    if (Math.abs(rNext - r) < 1e-10) return Math.max(rNext, 0);
    r = rNext;
  }
  return Math.max(r, 0);
}

// Annual interest rate (%) derived from user inputs — for display only
export function calcAnnualRate(principal: number, monthlyPayment: number, totalMonths: number): number {
  const r = solveMonthlyRate(principal, monthlyPayment, totalMonths);
  return Math.round(r * 12 * 100 * 10) / 10; // round to 1 decimal
}

export function calcRemainingBalance(
  principal: number,
  monthlyPayment: number,
  totalMonths: number,
  monthsPaid: number
): number {
  if (monthsPaid >= totalMonths) return 0;
  const r = solveMonthlyRate(principal, monthlyPayment, totalMonths);
  if (r === 0) return Math.round(principal - monthlyPayment * monthsPaid);
  const factor = Math.pow(1 + r, monthsPaid);
  return Math.round(Math.max(principal * factor - monthlyPayment * ((factor - 1) / r), 0));
}

// Personal/flexible loans have no fixed schedule (no totalMonths/dueDay) — they're tracked by
// paidAmount instead and never have a "due this month" concept.
export function calcLoanStatus(loan: Loan): {
  nextDueMonth: string;
  status: "due" | "overdue" | "paid_off" | "upcoming";
} {
  if (loan.lenderType === "personal" || loan.totalMonths == null) {
    return { nextDueMonth: "", status: loan.paidAmount >= loan.principal ? "paid_off" : "upcoming" };
  }

  if (loan.monthsPaid >= loan.totalMonths) {
    return { nextDueMonth: "", status: "paid_off" };
  }

  const [sy, sm] = loan.startMonth.split("-").map(Number);
  const nextDueDate = new Date(sy, sm - 1 + loan.monthsPaid, 1);
  const nextDueMonth = `${nextDueDate.getFullYear()}-${String(nextDueDate.getMonth() + 1).padStart(2, "0")}`;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (nextDueMonth < currentMonth) return { nextDueMonth, status: "overdue" };
  if (nextDueMonth === currentMonth) return { nextDueMonth, status: "due" };
  return { nextDueMonth, status: "upcoming" };
}

// Sum of monthly payments for loans not yet confirmed this cycle (due or overdue).
// Drives both the /loans header and the home-page widget total. Personal loans have no fixed
// monthly due date, so they never contribute here.
export function calcDueThisMonthTotal(loans: Loan[]): number {
  return loans
    .filter((l) => {
      if (l.lenderType === "personal") return false;
      const { status } = calcLoanStatus(l);
      return status === "due" || status === "overdue";
    })
    .reduce((sum, l) => sum + (l.monthlyPayment ?? 0), 0);
}

// Not fully paid off yet — personal loans compare paidAmount to principal, fixed-schedule
// loans compare monthsPaid to totalMonths.
export function isLoanActive(loan: Loan): boolean {
  if (loan.lenderType === "personal" || loan.totalMonths == null) {
    return loan.paidAmount < loan.principal;
  }
  return loan.monthsPaid < loan.totalMonths;
}

// --- Beepartner ---

// Suggested Bee income target for a given day: what's still left of the monthly target
// (after subtracting what's already been earned this month), spread over the days remaining —
// not a flat monthlyTarget/daysInMonth split. So if you're behind pace, the daily suggestion
// rises; if you're ahead, it falls. For a date outside the current month (e.g. a week that
// spans a month boundary), nothing's been earned "so far" in that month yet, so this reduces
// to monthlyTarget / days in that month.
export function calcBeeSuggestedDailyTarget(
  monthlyTarget: number,
  transactions: Transaction[],
  dateStr: string
): number {
  const [y, m] = dateStr.split("-").map(Number);
  const month = `${y}-${String(m).padStart(2, "0")}`;
  const daysInThatMonth = new Date(y, m, 0).getDate();

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const earned = transactions
    .filter((t) => t.category === "Be Income" && t.date.startsWith(month))
    .reduce((sum, t) => sum + t.amount, 0);
  const remaining = Math.max(0, monthlyTarget - earned);

  const daysLeft = month === currentMonth
    ? Math.max(1, daysInThatMonth - today.getDate() + 1)
    : daysInThatMonth;

  return Math.round(remaining / daysLeft / 1000) * 1000;
}
