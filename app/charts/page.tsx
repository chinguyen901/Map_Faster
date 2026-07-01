"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import AppShell, { useTx } from "@/components/AppShell";
import BudgetModal from "@/components/BudgetModal";
import {
  calcExpenseByCategory, calcMonthSummary, getLast6Months,
} from "@/lib/calculations";
import { formatVND, formatVNDShort, formatMonth, getCurrentMonth } from "@/lib/formatters";
import { fetchBudgets, upsertBudget, deleteBudgetById } from "@/lib/api";
import { Budget, EXPENSE_CATEGORIES } from "@/types";

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: {
  cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percentage?: number;
}) {
  if (!cx || !cy || midAngle === undefined || !innerRadius || !outerRadius || percentage === undefined) return null;
  if (percentage < 5) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {percentage}%
    </text>
  );
}

function ChartsContent() {
  const { transactions } = useTx();
  const [month, setMonth] = useState(getCurrentMonth());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetModal, setBudgetModal] = useState<{
    open: boolean; category?: string; amount?: number; budgetId?: string;
  }>({ open: false });

  useEffect(() => {
    fetchBudgets(month).then(setBudgets);
  }, [month]);

  const categoryData = useMemo(() => calcExpenseByCategory(transactions, month), [transactions, month]);
  const summary = useMemo(() => calcMonthSummary(transactions, month), [transactions, month]);

  const last6 = useMemo(() => getLast6Months(), []);
  const trend = useMemo(() =>
    last6.map((m) => {
      const s = calcMonthSummary(transactions, m);
      const label = m.split("-")[1] + "/" + m.split("-")[0].slice(2);
      return { month: label, income: s.totalIncome, expense: s.totalExpense, balance: s.balance };
    }),
    [transactions, last6]
  );

  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const handleSaveBudget = useCallback(async (category: string, amount: number) => {
    const result = await upsertBudget({ category, amount, month });
    if (result) {
      setBudgets((prev) => {
        const exists = prev.find((b) => b.category === category);
        return exists ? prev.map((b) => (b.category === category ? result : b)) : [...prev, result];
      });
    }
    setBudgetModal({ open: false });
  }, [month]);

  const handleDeleteBudget = useCallback(async () => {
    if (!budgetModal.budgetId) return;
    const ok = await deleteBudgetById(budgetModal.budgetId);
    if (ok) setBudgets((prev) => prev.filter((b) => b.id !== budgetModal.budgetId));
    setBudgetModal({ open: false });
  }, [budgetModal.budgetId]);

  // Categories to show in budget section: union of spent + budgeted
  const budgetRows = useMemo(() => {
    const spentMap = new Map(categoryData.map((c) => [c.category, c.amount]));
    const budgetMap = new Map(budgets.map((b) => [b.category, b]));
    const allCats = new Set([...spentMap.keys(), ...budgetMap.keys()]);
    return Array.from(allCats).map((cat) => {
      const catDef = EXPENSE_CATEGORIES.find((c) => c.name === cat);
      const spent = spentMap.get(cat) ?? 0;
      const budget = budgetMap.get(cat);
      const pct = budget ? Math.min(Math.round((spent / budget.amount) * 100), 999) : null;
      return { cat, icon: catDef?.icon ?? "💰", color: catDef?.color ?? "#B0B0B0", spent, budget, pct };
    }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  }, [categoryData, budgets]);

  const showBudgetSection = budgetRows.length > 0;

  return (
    <div className="min-h-screen bg-[#F0F8FF] dark:bg-[#0D1117]">
      {/* Header */}
      <div className="bg-[#1E90FF] safe-header pb-6 px-5 rounded-b-[32px]">
        <h1 className="text-white font-extrabold text-xl mb-4">Biểu đồ phân tích</h1>
        <div className="flex items-center justify-between bg-white/20 rounded-2xl px-4 py-2">
          <button onClick={prevMonth} className="p-1 text-white"><ChevronLeft size={18} /></button>
          <span className="text-white font-semibold text-sm">{formatMonth(month)}</span>
          <button onClick={nextMonth} className="p-1 text-white"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Pie chart - expense by category */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm">Phân bổ chi tiêu</h2>
            <span className="text-xs text-gray-400">Tổng chi: {formatVNDShort(summary.totalExpense)}</span>
          </div>

          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    dataKey="amount"
                    labelLine={false}
                    label={CustomLabel as unknown as boolean}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatVND(Number(val ?? 0))}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2 mt-2">
                {categoryData.map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{item.percentage}%</span>
                      <span className="text-sm font-semibold text-[#F44336]">{formatVND(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">Chưa có dữ liệu chi tiêu</div>
          )}
        </div>

        {/* Budget section (T1-2) */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm">🎯 Ngân sách tháng này</h2>
            <button
              onClick={() => setBudgetModal({ open: true })}
              className="flex items-center gap-1 text-xs font-semibold text-[#1E90FF] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full"
            >
              <Plus size={12} /> Thêm
            </button>
          </div>

          {showBudgetSection ? (
            <div className="space-y-3">
              {budgetRows.map(({ cat, icon, color, spent, budget, pct }) => {
                const isOver = pct !== null && pct >= 100;
                const isWarning = pct !== null && pct >= 80 && pct < 100;
                const barColor = isOver ? "#F44336" : isWarning ? "#FF9800" : "#1E90FF";

                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{icon}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                        {isOver && <span className="text-[10px] font-bold text-[#F44336] bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full">Vượt!</span>}
                        {isWarning && <span className="text-[10px] font-bold text-[#FF9800] bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded-full">Gần đạt</span>}
                      </div>
                      <button
                        onClick={() => setBudgetModal({
                          open: true,
                          category: cat,
                          amount: budget?.amount,
                          budgetId: budget?.id,
                        })}
                        className="text-xs text-[#1E90FF]"
                      >
                        {budget ? formatVNDShort(budget.amount) : "Đặt ngân sách"}
                      </button>
                    </div>

                    {budget ? (
                      <>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(pct ?? 0, 100)}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[11px] text-gray-400">
                            Đã chi {formatVNDShort(spent)}
                          </span>
                          {isOver ? (
                            <span className="text-[11px] font-semibold text-[#F44336]">
                              Vượt {formatVNDShort(spent - budget.amount)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">
                              Còn {formatVNDShort(budget.amount - spent)}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-400 mb-3">Chưa có ngân sách cho tháng này</p>
              <button
                onClick={() => setBudgetModal({ open: true })}
                className="text-sm font-semibold text-[#1E90FF]"
              >
                Đặt ngân sách ngay →
              </button>
            </div>
          )}
        </div>

        {/* 6-month trend */}
        <div className="card p-4">
          <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm mb-3">Xu hướng 6 tháng gần đây</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis hide />
              <Tooltip
                formatter={(val) => formatVNDShort(Number(val ?? 0))}
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 11 }}
              />
              <Bar dataKey="income" name="Thu" fill="#4CAF50" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Chi" fill="#F44336" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly surplus/deficit table */}
        <div className="card p-4">
          <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm mb-3">Kết quả từng tháng</h2>
          <div className="space-y-2">
            {[...trend].reverse().map((row) => {
              const isPos = row.balance >= 0;
              return (
                <div key={row.month} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Tháng {row.month}</span>
                  <span className={`text-sm font-bold ${isPos ? "text-[#4CAF50]" : "text-[#F44336]"}`}>
                    {isPos ? "+" : ""}{formatVND(row.balance)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BudgetModal
        open={budgetModal.open}
        onClose={() => setBudgetModal({ open: false })}
        onSave={handleSaveBudget}
        onDelete={budgetModal.budgetId ? handleDeleteBudget : undefined}
        editingCategory={budgetModal.category}
        editingAmount={budgetModal.amount}
      />
    </div>
  );
}

export default function ChartsPage() {
  return (
    <AppShell>
      <ChartsContent />
    </AppShell>
  );
}
