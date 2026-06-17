"use client";
import { useMemo, useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import AppShell, { useTx } from "@/components/AppShell";
import TransactionItem from "@/components/TransactionItem";
import LoanSummaryWidget from "@/components/LoanSummaryWidget";
import HealthScoreWidget from "@/components/HealthScoreWidget";
import BeepartnerWidget from "@/components/BeepartnerWidget";
import { calcMonthSummary, calcMonthEndForecast, calcStreak } from "@/lib/calculations";
import { formatVND, formatVNDShort, formatMonth, getCurrentMonth, getTodayISO } from "@/lib/formatters";

const CAL_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function fmtCal(amount: number): string {
  if (amount >= 1_000_000) {
    const tr = amount / 1_000_000;
    return (tr % 1 === 0 ? tr.toFixed(0) : tr.toFixed(1)) + "tr";
  }
  if (amount >= 1_000) return Math.round(amount / 1_000) + "k";
  return String(amount);
}

function HomeContent() {
  const { transactions, deleteById, openEditModal } = useTx();
  const [month, setMonth] = useState(getCurrentMonth());

  const summary = useMemo(() => calcMonthSummary(transactions, month), [transactions, month]);
  const forecast = useMemo(() => calcMonthEndForecast(transactions, month), [transactions, month]);
  const streak = useMemo(() => calcStreak(transactions), [transactions]);
  const recent = useMemo(
    () => transactions.filter((t) => t.date.startsWith(month)).slice(0, 8),
    [transactions, month]
  );
  const todayStr = getTodayISO();

  const [dailyTarget, setDailyTarget] = useState<number | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("daily_expense_target");
    if (saved) setDailyTarget(Number(saved));
  }, []);

  function saveTarget() {
    const val = parseInt(targetInput.replace(/\D/g, ""));
    if (!isNaN(val) && val > 0) {
      setDailyTarget(val);
      localStorage.setItem("daily_expense_target", String(val));
    } else {
      setDailyTarget(null);
      localStorage.removeItem("daily_expense_target");
    }
    setEditingTarget(false);
  }

  const calendarData = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (!tx.date.startsWith(month) || tx.type !== "expense") continue;
      map.set(tx.date, (map.get(tx.date) ?? 0) + tx.amount);
    }
    return map;
  }, [transactions, month]);

  const calendarGrid = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const firstDow = new Date(y, m - 1, 1).getDay(); // 0=Sun
    const startOffset = (firstDow + 6) % 7; // Mon=0 … Sun=6
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

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

  const isPositive = summary.balance >= 0;

  return (
    <div className="min-h-screen bg-[#F0F8FF] dark:bg-[#0D1117]">
      {/* Header */}
      <div className="bg-[#1E90FF] safe-header pb-8 px-5 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-blue-100 text-sm font-medium">Tài chính hiện tại</p>
            <h1 className="text-white font-extrabold mt-0.5" style={{ fontSize: "clamp(1.6rem,6vw,2rem)", letterSpacing: "-0.5px" }}>
              {formatVND(summary.balance)}
            </h1>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${
            isPositive ? "bg-green-400/30 text-green-100" : "bg-red-400/30 text-red-100"
          }`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isPositive ? "Dư" : "Âm"}
          </div>
        </div>

        {/* Streak badge */}
        {streak >= 2 && (
          <div className="inline-flex items-center gap-1.5 bg-orange-400/25 rounded-full px-3 py-1 text-xs font-semibold text-orange-100 mb-4 mt-2">
            🔥 {streak} ngày liên tiếp
          </div>
        )}

        {/* Income / Expense row */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 bg-white/20 backdrop-blur rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-400/30 flex items-center justify-center">
              <TrendingUp size={16} className="text-green-200" />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-medium">Tổng thu</p>
              <p className="text-white font-bold text-sm">{formatVNDShort(summary.totalIncome)}</p>
            </div>
          </div>
          <div className="flex-1 bg-white/20 backdrop-blur rounded-2xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-400/30 flex items-center justify-center">
              <TrendingDown size={16} className="text-red-200" />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-medium">Tổng chi</p>
              <p className="text-white font-bold text-sm">{formatVNDShort(summary.totalExpense)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Month picker */}
        <div className="flex items-center justify-between bg-white dark:bg-[#161B27] rounded-2xl px-4 py-2.5 shadow-sm">
          <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200">
            <ChevronLeft size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
          <span className="font-bold text-[#1A1A2E] dark:text-white text-sm">{formatMonth(month)}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200">
            <ChevronRight size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Calendar */}
        <div className="card p-4">
          {/* Header + target button */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm">Chi tiêu hằng ngày</h2>
            {editingTarget ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveTarget()}
                  placeholder="VD: 200000"
                  className="w-28 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1 text-xs text-right outline-none focus:ring-2 focus:ring-blue-200"
                  autoFocus
                />
                <button onClick={saveTarget} className="text-xs text-[#1E90FF] font-bold">Lưu</button>
                <button onClick={() => setEditingTarget(false)} className="text-xs text-gray-400">✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setTargetInput(dailyTarget ? String(dailyTarget) : ""); setEditingTarget(true); }}
                className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 active:bg-gray-200"
              >
                🎯 {dailyTarget ? `${fmtCal(dailyTarget)}/ngày` : "Target/ngày"}
              </button>
            )}
          </div>

          {/* Legend khi có target */}
          {dailyTarget !== null && (
            <div className="flex gap-3 mb-2 text-[9px] font-semibold">
              <span className="flex items-center gap-1 text-[#4CAF50]"><span className="w-2 h-2 rounded-sm bg-green-100 dark:bg-green-900/40 border border-green-200" />Trong mức</span>
              <span className="flex items-center gap-1 text-[#F44336]"><span className="w-2 h-2 rounded-sm bg-red-50 dark:bg-red-900/20 border border-red-200" />Vượt mức</span>
            </div>
          )}

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {CAL_HEADERS.map((h) => (
              <div key={h} className={`text-center text-[10px] font-semibold py-0.5 ${h === "CN" ? "text-[#F44336]" : "text-gray-400 dark:text-gray-500"}`}>
                {h}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {calendarGrid.map((day, i) => {
              if (!day) return <div key={i} className="h-[46px]" />;
              const dateStr = `${month}-${String(day).padStart(2, "0")}`;
              const expense = calendarData.get(dateStr) ?? 0;
              const isToday = dateStr === todayStr;
              const isSunday = i % 7 === 6;
              const overTarget = expense > 0 && dailyTarget !== null && expense > dailyTarget;
              const underTarget = expense > 0 && dailyTarget !== null && expense <= dailyTarget;
              const anySpend = expense > 0 && dailyTarget === null;

              return (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-start pt-1 pb-0.5 h-[46px] rounded-xl mx-0.5 my-0.5 ${
                    isToday
                      ? "bg-[#1E90FF] shadow-sm"
                      : overTarget || anySpend
                      ? "bg-red-50 dark:bg-red-900/15"
                      : underTarget
                      ? "bg-green-50 dark:bg-green-900/15"
                      : ""
                  }`}
                >
                  <span className={`text-[11px] font-bold leading-none ${
                    isToday ? "text-white" : isSunday ? "text-[#F44336]" : "text-[#1A1A2E] dark:text-white"
                  }`}>
                    {day}
                  </span>
                  {expense > 0 && (
                    <span className={`text-[9px] font-semibold leading-tight mt-0.5 ${
                      isToday ? "text-blue-100" : underTarget ? "text-[#4CAF50]" : "text-[#F44336]"
                    }`}>
                      {fmtCal(expense)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Forecast widget — only shown for current month with enough data */}
        {forecast && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm">💡 Dự báo cuối tháng</h2>
              <span className="text-xs text-gray-400">còn {forecast.daysLeft} ngày</span>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-[#F0F8FF] dark:bg-gray-800/60 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-medium">Chi dự kiến</p>
                <p className="font-bold text-[#F44336] text-sm mt-0.5">{formatVND(forecast.projectedExpense)}</p>
              </div>
              <div className="flex-1 bg-[#F0F8FF] dark:bg-gray-800/60 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-medium">Số dư dự kiến</p>
                <p className={`font-bold text-sm mt-0.5 ${forecast.projectedBalance >= 0 ? "text-[#4CAF50]" : "text-[#F44336]"}`}>
                  {forecast.projectedBalance >= 0 ? "+" : ""}{formatVND(forecast.projectedBalance)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Theo đà chi tiêu {formatVNDShort(forecast.dailyAvgExpense)}/ngày hiện tại
            </p>
          </div>
        )}

        {/* Loan summary widget */}
        <LoanSummaryWidget />

        {/* Beepartner income widget */}
        <BeepartnerWidget month={month} />

        {/* Health score widget */}
        <HealthScoreWidget />

        {/* Recent transactions */}
        {recent.length > 0 && (
          <div className="card p-4">
            <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm mb-2">Ghi chép gần đây</h2>
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {recent.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} onDelete={deleteById} onEdit={openEditModal} />
              ))}
            </div>
          </div>
        )}

        {recent.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Chưa có giao dịch nào</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Nhấn + để thêm thu chi</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppShell>
      <HomeContent />
    </AppShell>
  );
}
