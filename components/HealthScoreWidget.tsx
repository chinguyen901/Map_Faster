"use client";
import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTx } from "@/components/AppShell";
import { fetchLoans, fetchBudgets } from "@/lib/api";
import { calcHealthScore } from "@/lib/calculations";
import { getCurrentMonth } from "@/lib/formatters";
import { Loan, Budget } from "@/types";

const CIRCUMFERENCE = 2 * Math.PI * 40; // r=40

function ScoreArc({ score, color }: { score: number; color: string }) {
  const offset = CIRCUMFERENCE * (1 - score / 100);
  return (
    <svg width="110" height="110" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="9" />
      <circle
        cx="50" cy="50" r="40"
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="50" y="46" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="22" fontWeight="800">
        {score}
      </text>
      <text x="50" y="62" textAnchor="middle" dominantBaseline="middle" fill="#9CA3AF" fontSize="9">
        /100
      </text>
    </svg>
  );
}

export default function HealthScoreWidget() {
  const { transactions } = useTx();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const currentMonth = getCurrentMonth();

  useEffect(() => {
    Promise.all([fetchLoans(), fetchBudgets(currentMonth)]).then(([l, b]) => {
      setLoans(l);
      setBudgets(b);
      setLoading(false);
    });
  }, [currentMonth]);

  const score = useMemo(
    () => calcHealthScore(transactions, loans, budgets, currentMonth),
    [transactions, loans, budgets, currentMonth]
  );

  if (loading) return null;

  const breakdown = [
    { label: "Tiết kiệm", value: score.savings, max: 30, tip: "Thu - Chi / Thu" },
    { label: "Nợ vay", value: score.debt, max: 30, tip: "Tỉ lệ trả nợ / thu nhập" },
    { label: "Ổn định", value: score.consistency, max: 20, tip: "Tháng dương trong 3 tháng qua" },
    { label: "Ngân sách", value: score.budget, max: 20, tip: "Tuân thủ hạn mức đã đặt" },
  ];

  return (
    <div className="card p-4">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setExpanded((e) => !e)}
      >
        <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm">💪 Sức khoẻ tài chính</h2>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      <div className="flex items-center gap-4 mt-3">
        <ScoreArc score={score.total} color={score.color} />
        <div className="flex-1">
          <p className="font-extrabold text-lg" style={{ color: score.color }}>{score.label}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Dựa trên thu chi tháng này</p>

          {/* Mini bar for each component */}
          <div className="mt-2 space-y-1.5">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 w-14 shrink-0">{item.label}</span>
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.value / item.max) * 100}%`,
                      backgroundColor: score.color,
                    }}
                  />
                </div>
                <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{item.value}/{item.max}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-gray-50 dark:border-gray-700/50 pt-3">
          {breakdown.map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <div
                className="w-2 h-2 rounded-full mt-1 shrink-0"
                style={{ backgroundColor: item.value >= item.max * 0.7 ? "#4CAF50" : item.value >= item.max * 0.4 ? "#FF9800" : "#F44336" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                  <span className="text-xs font-bold text-gray-500">{item.value}/{item.max} điểm</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.tip}</p>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-gray-400 pt-1">
            💡 Thiết lập ngân sách và ghi chép đều đặn để tăng điểm
          </p>
        </div>
      )}
    </div>
  );
}
