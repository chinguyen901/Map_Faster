"use client";
import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import AppShell, { useTx } from "@/components/AppShell";
import TransactionItem from "@/components/TransactionItem";
import LoanSummaryWidget from "@/components/LoanSummaryWidget";
import { calcMonthSummary, calcWeeklyData } from "@/lib/calculations";
import { formatVND, formatVNDShort, formatMonth, getCurrentMonth } from "@/lib/formatters";

function HomeContent() {
  const { transactions, deleteById, openEditModal } = useTx();
  const [month, setMonth] = useState(getCurrentMonth());

  const summary = useMemo(() => calcMonthSummary(transactions, month), [transactions, month]);
  const weeklyData = useMemo(() => calcWeeklyData(transactions, month), [transactions, month]);
  const recent = useMemo(
    () => transactions.filter((t) => t.date.startsWith(month)).slice(0, 8),
    [transactions, month]
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

  const isPositive = summary.balance >= 0;

  return (
    <div className="min-h-screen bg-[#F0F8FF]">
      {/* Header */}
      <div className="bg-[#1E90FF] pt-12 pb-8 px-5 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-6">
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

        {/* Income / Expense row */}
        <div className="flex gap-3">
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
        <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-2.5 shadow-sm">
          <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <span className="font-bold text-[#1A1A2E] text-sm">{formatMonth(month)}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Bar Chart */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1A1A2E] text-sm">Tình hình thu chi</h2>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4CAF50]" />Thu</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F44336]" />Chi</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyData} barCategoryGap="30%">
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis hide />
              <Tooltip
                formatter={(val) => formatVNDShort(Number(val ?? 0))}
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
              />
              <Bar dataKey="income" fill="#4CAF50" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="#F44336" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Loan summary widget */}
        <LoanSummaryWidget />

        {/* Summary message */}
        <div className={`rounded-2xl p-4 flex items-center gap-3 ${
          isPositive ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
        }`}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isPositive ? "bg-green-100" : "bg-red-100"
          }`}>
            <Wallet size={20} className={isPositive ? "text-green-600" : "text-red-500"} />
          </div>
          <div>
            <p className={`font-bold text-sm ${isPositive ? "text-green-700" : "text-red-600"}`}>
              {isPositive
                ? `Tháng này bạn tiết kiệm được ${formatVND(summary.balance)}`
                : `Tháng này bạn bội chi ${formatVND(Math.abs(summary.balance))}`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isPositive ? "Tuyệt vời! Hãy tiếp tục duy trì 🎉" : "Hãy cẩn thận hơn với chi tiêu 💪"}
            </p>
          </div>
        </div>

        {/* Recent transactions */}
        {recent.length > 0 && (
          <div className="card p-4">
            <h2 className="font-bold text-[#1A1A2E] text-sm mb-2">Ghi chép gần đây</h2>
            <div className="divide-y divide-gray-50">
              {recent.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} onDelete={deleteById} onEdit={openEditModal} />
              ))}
            </div>
          </div>
        )}

        {recent.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-gray-500 text-sm">Chưa có giao dịch nào</p>
            <p className="text-gray-400 text-xs mt-1">Nhấn + để thêm thu chi</p>
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
