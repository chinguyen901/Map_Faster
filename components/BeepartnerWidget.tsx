"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Check, X, ChevronRight } from "lucide-react";
import { useTx } from "@/components/AppShell";
import { formatVND, formatVNDShort, getCurrentMonth } from "@/lib/formatters";
import { updateBeepartnerTarget, fetchBeDailyTargets } from "@/lib/api";
import BeeWeekTargetModal from "@/components/BeeWeekTargetModal";
import BeeFixedBudgetModal from "@/components/BeeFixedBudgetModal";

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekRange(today: Date): [string, string] {
  const dow = today.getDay(); // 0=Sun..6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [toISO(monday), toISO(sunday)];
}

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
  return { daysRemaining, isCurrentMonth };
}

export default function BeepartnerWidget({ month }: Props) {
  const { transactions, bePartnerPhone, openAddModal, bePartnerMonthlyTarget, setBePartnerMonthlyTarget } = useTx();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [weekModalOpen, setWeekModalOpen] = useState(false);
  const [weekHasTargets, setWeekHasTargets] = useState<boolean | null>(null);
  const [fixedBudgetModalOpen, setFixedBudgetModalOpen] = useState(false);

  useEffect(() => {
    const [start, end] = getWeekRange(new Date());
    fetchBeDailyTargets(start, end).then((rows) => setWeekHasTargets(rows.length > 0));
  }, []);

  function refreshWeekTargets() {
    const [start, end] = getWeekRange(new Date());
    fetchBeDailyTargets(start, end).then((rows) => setWeekHasTargets(rows.length > 0));
  }

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
            <button onClick={() => setEditingTarget(false)} className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700">
              <X size={16} className="text-gray-500" />
            </button>
            <button onClick={saveTarget} disabled={saving} className="p-2.5 rounded-xl bg-[#FFD700] disabled:opacity-50">
              <Check size={16} className="text-yellow-900" />
            </button>
          </div>
        </div>
      ) : !hasTarget ? (
        /* No target — simple stats + set target prompt */
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
        /* Has target — progress bar + 3-stat grid */
        <>
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Tiến độ</span>
              <span className={`font-bold ${achieved ? "text-[#4CAF50]" : "text-[#1A1A2E] dark:text-white"}`}>
                {percentage}% {achieved && "🎉"}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${achieved ? "bg-[#4CAF50]" : "bg-[#FFD700]"}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* 3-stat row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#FFD700]/10 dark:bg-yellow-950/30 rounded-xl p-2.5">
              <p className="text-[10px] text-gray-400">Đã đạt</p>
              <p className={`font-bold text-xs mt-0.5 ${achieved ? "text-[#4CAF50]" : "text-yellow-600 dark:text-yellow-400"}`}>
                {formatVNDShort(total)}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-2.5">
              <p className="text-[10px] text-gray-400">Còn thiếu</p>
              <p className="font-bold text-[#F44336] text-xs mt-0.5">
                {achieved ? <span className="text-[#4CAF50]">—</span> : formatVNDShort(remaining)}
              </p>
            </div>
            <div className="bg-[#F0F8FF] dark:bg-gray-800/60 rounded-xl p-2.5 relative">
              <p className="text-[10px] text-gray-400">Mục tiêu</p>
              <p className="font-bold text-[#1A1A2E] dark:text-white text-xs mt-0.5">
                {formatVNDShort(bePartnerMonthlyTarget!)}
              </p>
              {isCurrentMonth && (
                <button onClick={startEdit} className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  <Pencil size={10} className="text-gray-400" />
                </button>
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
                trong <span className="font-bold">{daysRemaining} ngày</span> còn lại
              </p>
            </div>
          ) : isCurrentMonth && daysRemaining === 0 && !achieved ? (
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-500 text-center">Tháng đã kết thúc · Còn thiếu {formatVNDShort(remaining)}</p>
            </div>
          ) : null}
        </>
      )}

      {/* Fixed income/expense → auto-calculated target entry point */}
      <button
        onClick={() => setFixedBudgetModalOpen(true)}
        className="w-full mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500 py-1"
      >
        📋 Thu chi cố định (tự tính target) <ChevronRight size={12} />
      </button>

      {/* Weekly daily targets entry point */}
      {weekHasTargets === false ? (
        <button
          onClick={() => setWeekModalOpen(true)}
          className="w-full mt-3 py-2.5 rounded-xl border border-dashed border-[#FFD700] text-yellow-600 dark:text-yellow-400 text-sm font-semibold active:opacity-80 hover:bg-[#FFD700]/5 transition-colors animate-pulse"
        >
          🎯 Mục tiêu tuần này
        </button>
      ) : weekHasTargets === true ? (
        <button
          onClick={() => setWeekModalOpen(true)}
          className="w-full mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500 py-1"
        >
          Xem mục tiêu tuần <ChevronRight size={12} />
        </button>
      ) : null}

      <BeeWeekTargetModal
        open={weekModalOpen}
        onClose={() => setWeekModalOpen(false)}
        onSaved={refreshWeekTargets}
      />

      <BeeFixedBudgetModal
        open={fixedBudgetModalOpen}
        onClose={() => setFixedBudgetModalOpen(false)}
      />
    </div>
  );
}
