"use client";
import { useMemo, useState } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useTx } from "@/components/AppShell";
import { formatVND, formatVNDShort, getCurrentMonth } from "@/lib/formatters";
import { updateBeepartnerTarget } from "@/lib/api";

interface Props {
  month: string;
}

function getDaysInfo(month: string) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = new Date();
  const isCurrentMonth = month === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;
  const daysRemaining = isCurrentMonth ? Math.max(0, daysInMonth - dayOfMonth + 1) : 0;
  return { daysInMonth, dayOfMonth, daysRemaining, isCurrentMonth };
}

export default function BeepartnerWidget({ month }: Props) {
  const { transactions, bePartnerPhone, openAddModal, bePartnerMonthlyTarget, setBePartnerMonthlyTarget } = useTx();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [saving, setSaving] = useState(false);

  const beIncome = useMemo(
    () => transactions.filter((t) => t.category === "Be Income" && t.date.startsWith(month)),
    [transactions, month]
  );

  if (!bePartnerPhone) return null;

  const total = beIncome.reduce((sum, t) => sum + t.amount, 0);
  const days = new Set(beIncome.map((t) => t.date)).size;
  const currentMonth = getCurrentMonth();
  const isCurrentMonth = month === currentMonth;
  const { daysRemaining } = getDaysInfo(month);

  const hasTarget = bePartnerMonthlyTarget != null && bePartnerMonthlyTarget > 0;
  const percentage = hasTarget ? Math.min(100, Math.round((total / bePartnerMonthlyTarget!) * 100)) : 0;
  const remaining = hasTarget ? Math.max(0, bePartnerMonthlyTarget! - total) : 0;
  const achieved = hasTarget && total >= bePartnerMonthlyTarget!;
  const dailyNeeded = hasTarget && !achieved && daysRemaining > 0
    ? Math.ceil(remaining / daysRemaining)
    : 0;

  const chartData = hasTarget
    ? [
        { name: "Đã đạt", value: Math.min(total, bePartnerMonthlyTarget!), color: "#FFD700" },
        { name: "Còn thiếu", value: Math.max(0, bePartnerMonthlyTarget! - total), color: "#E5E7EB" },
      ]
    : [{ name: "Đã đạt", value: total || 1, color: "#FFD700" }];

  function startEdit() {
    setTargetInput(bePartnerMonthlyTarget ? bePartnerMonthlyTarget.toLocaleString("vi-VN") : "");
    setEditingTarget(true);
  }

  async function saveTarget() {
    const digits = targetInput.replace(/\D/g, "");
    const value = digits ? parseInt(digits, 10) : null;
    setSaving(true);
    const ok = await updateBeepartnerTarget(value);
    setSaving(false);
    if (ok) {
      setBePartnerMonthlyTarget(value);
      setEditingTarget(false);
    }
  }

  function handleTargetInput(val: string) {
    const digits = val.replace(/\D/g, "");
    const num = parseInt(digits, 10);
    setTargetInput(isNaN(num) ? "" : num.toLocaleString("vi-VN"));
  }

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐝</span>
          <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm">
            Thu nhập Be {isCurrentMonth ? "tháng này" : month}
          </h2>
        </div>
        {isCurrentMonth && !editingTarget && (
          <button
            onClick={() => openAddModal({ type: "income", category: "Be Income" })}
            className="flex items-center gap-1 bg-[#FFD700]/20 text-yellow-700 dark:text-yellow-400 text-xs font-semibold px-3 py-1.5 rounded-full active:opacity-80"
          >
            <Plus size={13} />
            Thêm
          </button>
        )}
      </div>

      {/* Inline target editor */}
      {editingTarget ? (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Mục tiêu thu nhập Be tháng này (VND)</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={targetInput}
              onChange={(e) => handleTargetInput(e.target.value)}
              placeholder="VD: 10,000,000"
              autoFocus
              className="flex-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#0D1117] rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] dark:text-white focus:outline-none focus:border-[#FFD700]"
            />
            <button
              onClick={() => setEditingTarget(false)}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700"
            >
              <X size={16} className="text-gray-500" />
            </button>
            <button
              onClick={saveTarget}
              disabled={saving}
              className="p-2.5 rounded-xl bg-[#FFD700] disabled:opacity-50"
            >
              <Check size={16} className="text-yellow-900" />
            </button>
          </div>
        </div>
      ) : !hasTarget ? (
        /* No target — show simple stats + set target prompt */
        <>
          {beIncome.length > 0 && (
            <div className="bg-[#FFD700]/10 dark:bg-yellow-950/30 rounded-xl p-3 mb-3">
              <p className="text-[10px] text-gray-400 font-medium">Đã ghi chép</p>
              <p className="font-bold text-yellow-600 dark:text-yellow-400 text-base mt-0.5">{formatVND(total)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{days} ngày làm việc</p>
            </div>
          )}
          {beIncome.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-3 text-center py-2">
              Chưa có thu nhập Be {isCurrentMonth ? "tháng này" : "trong tháng này"}
            </p>
          )}
          {isCurrentMonth && (
            <button
              onClick={startEdit}
              className="w-full py-2.5 rounded-xl border border-dashed border-[#FFD700] text-yellow-600 dark:text-yellow-400 text-sm font-semibold active:opacity-80 hover:bg-[#FFD700]/5 transition-colors"
            >
              🎯 Đặt mục tiêu thu nhập tháng này
            </button>
          )}
        </>
      ) : (
        /* Has target — show donut chart + progress stats */
        <>
          <div className="flex items-center gap-3 mb-3">
            {/* Donut chart */}
            <div className="flex-shrink-0 relative" style={{ width: 110, height: 110 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={50}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center % */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-extrabold text-lg leading-none text-[#1A1A2E] dark:text-white">
                  {percentage}%
                </span>
                {achieved && <span className="text-[9px] text-[#4CAF50] font-bold mt-0.5">🎉</span>}
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="bg-[#FFD700]/10 dark:bg-yellow-950/30 rounded-xl p-2.5">
                <p className="text-[10px] text-gray-400 font-medium">Đã đạt</p>
                <p className={`font-bold text-sm mt-0.5 ${achieved ? "text-[#4CAF50]" : "text-yellow-600 dark:text-yellow-400"}`}>
                  {formatVNDShort(total)}
                </p>
              </div>
              <div className="bg-[#F0F8FF] dark:bg-gray-800/60 rounded-xl p-2.5 flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Mục tiêu</p>
                  <p className="font-bold text-[#1A1A2E] dark:text-white text-sm mt-0.5">
                    {formatVNDShort(bePartnerMonthlyTarget!)}
                  </p>
                </div>
                {isCurrentMonth && (
                  <button onClick={startEdit} className="mt-0.5 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                    <Pencil size={12} className="text-gray-400" />
                  </button>
                )}
              </div>
              {!achieved && remaining > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-2.5">
                  <p className="text-[10px] text-gray-400 font-medium">Còn thiếu</p>
                  <p className="font-bold text-[#F44336] text-sm mt-0.5">{formatVNDShort(remaining)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Daily needed / achieved message */}
          {achieved ? (
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl px-3 py-2.5">
              <p className="text-xs font-semibold text-[#4CAF50] text-center">
                🎉 Đã đạt mục tiêu tháng này! Tuyệt vời!
              </p>
            </div>
          ) : isCurrentMonth && dailyNeeded > 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-xl px-3 py-2.5">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                💡 Cần trung bình{" "}
                <span className="font-bold">{formatVNDShort(dailyNeeded)}/ngày</span>{" "}
                trong <span className="font-bold">{daysRemaining} ngày</span> còn lại để đạt mục tiêu
              </p>
            </div>
          ) : isCurrentMonth && daysRemaining === 0 && !achieved ? (
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-500 text-center">Tháng đã kết thúc — còn thiếu {formatVNDShort(remaining)}</p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
