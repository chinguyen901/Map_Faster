"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import AppShell, { useTx } from "@/components/AppShell";
import { calcExpenseByCategory, calcMonthSummary, getLast6Months } from "@/lib/calculations";
import { formatVND, formatVNDShort, formatMonth, getCurrentMonth } from "@/lib/formatters";

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

  return (
    <div className="min-h-screen bg-[#F0F8FF]">
      {/* Header */}
      <div className="bg-[#1E90FF] pt-12 pb-6 px-5 rounded-b-[32px]">
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
            <h2 className="font-bold text-[#1A1A2E] text-sm">Phân bổ chi tiêu</h2>
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

              {/* Legend */}
              <div className="space-y-2 mt-2">
                {categoryData.map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-700">{item.category}</span>
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

        {/* 6-month trend */}
        <div className="card p-4">
          <h2 className="font-bold text-[#1A1A2E] text-sm mb-3">Xu hướng 6 tháng gần đây</h2>
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
          <h2 className="font-bold text-[#1A1A2E] text-sm mb-3">Kết quả từng tháng</h2>
          <div className="space-y-2">
            {[...trend].reverse().map((row) => {
              const isPos = row.balance >= 0;
              return (
                <div key={row.month} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600 font-medium">Tháng {row.month}</span>
                  <span className={`text-sm font-bold ${isPos ? "text-[#4CAF50]" : "text-[#F44336]"}`}>
                    {isPos ? "+" : ""}{formatVND(row.balance)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
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
