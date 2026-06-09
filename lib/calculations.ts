import { Transaction, MonthSummary, CategorySummary, EXPENSE_CATEGORIES, Loan, Budget } from "@/types";

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

export function calcWeeklyData(transactions: Transaction[], month: string) {
  const txs = getMonthTransactions(transactions, month);
  const weeks: { week: string; income: number; expense: number }[] = [
    { week: "T1", income: 0, expense: 0 },
    { week: "T2", income: 0, expense: 0 },
    { week: "T3", income: 0, expense: 0 },
    { week: "T4", income: 0, expense: 0 },
  ];

  txs.forEach((t) => {
    const day = parseInt(t.date.split("-")[2]);
    const weekIdx = Math.min(Math.floor((day - 1) / 7), 3);
    if (t.type === "income") weeks[weekIdx].income += t.amount;
    else weeks[weekIdx].expense += t.amount;
  });

  return weeks;
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

export function calcLoanStatus(loan: Loan): {
  nextDueMonth: string;
  status: "due" | "overdue" | "paid_off" | "upcoming";
} {
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

export function calcTotalMonthlyLoanBurden(loans: Loan[]): number {
  return loans
    .filter((l) => l.monthsPaid < l.totalMonths)
    .reduce((sum, l) => sum + l.monthlyPayment, 0);
}

export interface CategoryInsight {
  category: string;
  icon: string;
  currentAmount: number;
  avgAmount: number;
  changePercent: number; // positive = spent more than avg, negative = less
}

export function calcCategoryInsights(transactions: Transaction[], month: string): CategoryInsight[] {
  const [y, m] = month.split("-").map(Number);

  // Build prev 3 months (only those that have data)
  const prevMonths: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(y, m - 1 - i, 1);
    prevMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const current = calcExpenseByCategory(transactions, month);
  if (current.length === 0) return [];

  const insights: CategoryInsight[] = [];

  for (const cat of current) {
    const prevAmounts = prevMonths
      .map((pm) => calcExpenseByCategory(transactions, pm).find((c) => c.category === cat.category)?.amount ?? 0)
      .filter((a) => a > 0);

    if (prevAmounts.length === 0) continue;

    const avg = prevAmounts.reduce((s, a) => s + a, 0) / prevAmounts.length;
    const changePercent = Math.round(((cat.amount - avg) / avg) * 100);

    if (Math.abs(changePercent) < 10) continue;

    const catDef = EXPENSE_CATEGORIES.find((c) => c.name === cat.category);
    insights.push({
      category: cat.category,
      icon: catDef?.icon ?? "💰",
      currentAmount: cat.amount,
      avgAmount: Math.round(avg),
      changePercent,
    });
  }

  return insights
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 5);
}

export function calcTotalRemainingDebt(loans: Loan[]): number {
  return loans.reduce(
    (sum, l) => sum + (l.totalMonths - l.monthsPaid) * l.monthlyPayment,
    0
  );
}

export interface EarlyPayoffResult {
  newMonthsLeft: number;
  monthsSaved: number;
  interestSaved: number;
}

export function calcEarlyPayoff(loan: Loan, extraPayment: number): EarlyPayoffResult | null {
  if (extraPayment <= 0 || loan.monthsPaid >= loan.totalMonths) return null;

  const monthsLeft = loan.totalMonths - loan.monthsPaid;
  const r = solveMonthlyRate(loan.principal, loan.monthlyPayment, loan.totalMonths);
  const remainingBalance = calcRemainingBalance(
    loan.principal, loan.monthlyPayment, loan.totalMonths, loan.monthsPaid
  );

  const interestWithoutExtra = monthsLeft * loan.monthlyPayment - remainingBalance;

  let balance = remainingBalance;
  let totalPaidWithExtra = 0;
  let newMonthsLeft = 0;
  const payment = loan.monthlyPayment + extraPayment;

  while (balance > 1 && newMonthsLeft < monthsLeft) {
    const interestThisMonth = r === 0 ? 0 : balance * r;
    const principalThisMonth = payment - interestThisMonth;
    if (principalThisMonth >= balance) {
      totalPaidWithExtra += balance + interestThisMonth;
      newMonthsLeft++;
      balance = 0;
    } else {
      balance -= principalThisMonth;
      totalPaidWithExtra += payment;
      newMonthsLeft++;
    }
  }

  const interestWithExtra = Math.max(0, totalPaidWithExtra - remainingBalance);
  const interestSaved = Math.round(Math.max(0, interestWithoutExtra - interestWithExtra));
  const monthsSaved = monthsLeft - newMonthsLeft;

  return { newMonthsLeft, monthsSaved, interestSaved };
}

// --- T2-1: Cash flow forecast ---

export interface MonthEndForecast {
  projectedExpense: number;
  projectedBalance: number;
  dailyAvgExpense: number;
  daysLeft: number;
}

export function calcMonthEndForecast(
  transactions: Transaction[],
  month: string,
  today?: Date
): MonthEndForecast | null {
  const now = today ?? new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (month !== currentMonth) return null;

  const txs = getMonthTransactions(transactions, month);
  const dayOfMonth = now.getDate();
  if (dayOfMonth < 5) return null; // need at least 5 days of data

  const totalIncome = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  if (totalExpense === 0) return null;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  if (daysLeft === 0) return null;

  const dailyAvgExpense = totalExpense / dayOfMonth;
  const projectedExpense = Math.round(totalExpense + dailyAvgExpense * daysLeft);
  const projectedBalance = totalIncome - projectedExpense;

  return {
    projectedExpense,
    projectedBalance,
    dailyAvgExpense: Math.round(dailyAvgExpense),
    daysLeft,
  };
}

// --- T2-2: Financial Health Score ---

export interface HealthScore {
  total: number;
  savings: number;
  debt: number;
  consistency: number;
  budget: number;
  label: string;
  color: string;
}

export function calcHealthScore(
  transactions: Transaction[],
  loans: Loan[],
  budgets: Budget[],
  currentMonth: string
): HealthScore {
  // Fall back to last month if current month has no transactions
  const monthTxs = getMonthTransactions(transactions, currentMonth);
  const activeMonth = monthTxs.length > 0 ? currentMonth : (() => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const { totalIncome, totalExpense } = calcMonthSummary(transactions, activeMonth);

  // 1. Savings score (0–30): tỉ lệ tiết kiệm
  let savingsScore = 0;
  if (totalIncome > 0) {
    const rate = (totalIncome - totalExpense) / totalIncome;
    if (rate >= 0.2) savingsScore = 30;
    else if (rate >= 0.1) savingsScore = 20;
    else if (rate >= 0.05) savingsScore = 12;
    else if (rate >= 0) savingsScore = 6;
  }

  // 2. Debt score (0–30): debt-to-income ratio
  const activeLoans = loans.filter((l) => l.monthsPaid < l.totalMonths);
  const monthlyBurden = activeLoans.reduce((s, l) => s + l.monthlyPayment, 0);
  let debtScore = 30;
  if (activeLoans.length > 0) {
    if (totalIncome > 0) {
      const dti = monthlyBurden / totalIncome;
      if (dti >= 0.5) debtScore = 0;
      else if (dti >= 0.35) debtScore = 8;
      else if (dti >= 0.2) debtScore = 18;
      else debtScore = 25;
    } else {
      debtScore = 5;
    }
  }

  // 3. Consistency score (0–20): số tháng dương trong 3 tháng qua
  const [y, m] = currentMonth.split("-").map(Number);
  let positiveMonths = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date(y, m - 1 - i, 1);
    const pm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const { balance, totalIncome: inc } = calcMonthSummary(transactions, pm);
    if (inc > 0 && balance > 0) positiveMonths++;
  }
  const consistencyScore = positiveMonths >= 3 ? 20 : positiveMonths >= 2 ? 14 : positiveMonths >= 1 ? 7 : 0;

  // 4. Budget score (0–20): tuân thủ ngân sách
  const monthBudgets = budgets.filter((b) => b.month === activeMonth);
  let budgetScore = 5;
  if (monthBudgets.length > 0) {
    const expenses = calcExpenseByCategory(transactions, activeMonth);
    const compliant = monthBudgets.filter((budget) => {
      const spent = expenses.find((e) => e.category === budget.category)?.amount ?? 0;
      return spent <= budget.amount;
    }).length;
    budgetScore = Math.round(8 + (compliant / monthBudgets.length) * 12);
  }

  const total = Math.min(100, savingsScore + debtScore + consistencyScore + budgetScore);

  let label: string;
  let color: string;
  if (total >= 80) { label = "Xuất sắc"; color = "#4CAF50"; }
  else if (total >= 65) { label = "Tốt"; color = "#1E90FF"; }
  else if (total >= 45) { label = "Trung bình"; color = "#FF9800"; }
  else { label = "Cần cải thiện"; color = "#F44336"; }

  return { total, savings: savingsScore, debt: debtScore, consistency: consistencyScore, budget: budgetScore, label, color };
}

// --- T2-5: Gamification streak ---

export function calcStreak(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;
  const dates = new Set(transactions.map((t) => t.date));
  const today = new Date();
  let streak = 0;
  const check = new Date(today);
  while (true) {
    const iso = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, "0")}-${String(check.getDate()).padStart(2, "0")}`;
    if (dates.has(iso)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
