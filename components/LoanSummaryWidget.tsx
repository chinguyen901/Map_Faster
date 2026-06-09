"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Loan } from "@/types";
import { fetchLoans } from "@/lib/api";
import { calcLoanStatus } from "@/lib/calculations";
import { formatVND, formatVNDShort } from "@/lib/formatters";

const CHART_COLORS = ["#1E90FF", "#F44336", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4"];

export default function LoanSummaryWidget() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoans().then((data) => {
      setLoans(data);
      setLoading(false);
    });
  }, []);

  const activeLoans = loans.filter((l) => l.monthsPaid < l.totalMonths);

  const unpaidThisMonth = loans
    .filter((l) => { const { status } = calcLoanStatus(l); return status === "due" || status === "overdue"; })
    .reduce((sum, l) => sum + l.monthlyPayment, 0);

  const totalDebt = activeLoans.reduce((sum, l) => sum + (l.totalMonths - l.monthsPaid) * l.monthlyPayment, 0);

  const chartData = activeLoans.map((l, i) => ({
    name: l.name,
    value: (l.totalMonths - l.monthsPaid) * l.monthlyPayment,
    color: CHART_COLORS[i % CHART_COLORS.length],
    monthlyPayment: l.monthlyPayment,
    status: calcLoanStatus(l).status,
  }));

  if (loading) return null;
  if (activeLoans.length === 0) return null;

  return (
    <div className="card p-4">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm">🏦 Khoản Vay</h2>
        <Link href="/loans" className="flex items-center gap-0.5 text-[#1E90FF] text-xs font-semibold">
          Chi tiết <ChevronRight size={14} />
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Còn phải trả tháng này</p>
          <p className={`text-base font-extrabold mt-0.5 ${unpaidThisMonth > 0 ? "text-[#F44336]" : "text-[#4CAF50]"}`}>
            {unpaidThisMonth > 0 ? formatVND(unpaidThisMonth) : "✅ Đã trả hết"}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Tổng còn phải trả</p>
          <p className="text-base font-extrabold text-[#1E90FF] mt-0.5">{formatVNDShort(totalDebt)}</p>
        </div>
      </div>

      {/* Donut chart + legend */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0" style={{ width: 110, height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => formatVNDShort(Number(val))}
                contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {chartData.map((item, i) => {
            const statusIcon = { due: "🔴", overdue: "🟠", upcoming: "⬜", paid_off: "✅" }[item.status];
            return (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-gray-600 truncate flex-1">{item.name}</span>
                <span className="text-[10px] font-semibold text-gray-400 flex-shrink-0">
                  {statusIcon} {formatVNDShort(item.monthlyPayment)}/th
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
