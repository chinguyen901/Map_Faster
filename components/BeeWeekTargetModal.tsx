"use client";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTx } from "@/components/AppShell";
import { fetchBeDailyTargets, upsertBeDailyTarget } from "@/lib/api";
import { calcBeeSuggestedDailyTarget } from "@/lib/calculations";
import { formatVND, formatVNDShort, getTodayISO } from "@/lib/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDates(today: Date): string[] {
  const dow = today.getDay(); // 0=Sun..6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISO(d);
  });
}

function parseAmountInput(val: string): string {
  const digits = val.replace(/\D/g, "");
  const num = parseInt(digits, 10);
  return isNaN(num) ? "" : num.toLocaleString("vi-VN");
}

export default function BeeWeekTargetModal({ open, onClose, onSaved }: Props) {
  const { transactions, bePartnerMonthlyTarget } = useTx();
  const weekDates = useMemo(() => getWeekDates(new Date()), []);
  const todayStr = getTodayISO();

  const [targetInputs, setTargetInputs] = useState<Record<string, string>>({});
  const [originalTargets, setOriginalTargets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setLoading(true);
    fetchBeDailyTargets(weekDates[0], weekDates[6]).then((rows) => {
      const map: Record<string, string> = {};
      for (const row of rows) map[row.date] = String(row.targetAmount);
      setOriginalTargets(map);

      // Prefill days with no saved target using what's still left of the monthly target
      // (i.e. "còn thiếu" — target minus what's already been earned this month), spread over
      // the days remaining, not a flat monthlyTarget/daysInMonth split — updates automatically
      // as more gets earned. User can still edit/zero out individual days (e.g. rest days).
      const filled = { ...map };
      if (bePartnerMonthlyTarget && bePartnerMonthlyTarget > 0) {
        for (const date of weekDates) {
          if (filled[date] != null) continue;
          filled[date] = String(calcBeeSuggestedDailyTarget(bePartnerMonthlyTarget, transactions, date));
        }
      }
      setTargetInputs(filled);
      setLoading(false);
    });
  }, [open, weekDates, bePartnerMonthlyTarget, transactions]);

  const actualByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.category !== "Be Income") continue;
      map.set(t.date, (map.get(t.date) ?? 0) + t.amount);
    }
    return map;
  }, [transactions]);

  if (!open) return null;

  function handleChange(date: string, val: string) {
    setTargetInputs((prev) => ({ ...prev, [date]: parseAmountInput(val) }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const changed = weekDates.filter((d) => (targetInputs[d] ?? "") !== (originalTargets[d] ?? ""));
    const results = await Promise.all(
      changed.map((d) => {
        const amount = parseInt((targetInputs[d] ?? "0").replace(/\D/g, ""), 10) || 0;
        return upsertBeDailyTarget(d, amount);
      })
    );
    setSaving(false);
    if (results.some((r) => r == null)) {
      setError("Lưu thất bại — vui lòng kiểm tra kết nối mạng và thử lại.");
      return;
    }
    setOriginalTargets(targetInputs);
    onSaved?.();
    onClose();
  }

  const weekTotalTarget = weekDates.reduce((sum, d) => sum + (parseInt((targetInputs[d] ?? "0").replace(/\D/g, ""), 10) || 0), 0);
  const weekTotalActual = weekDates.reduce((sum, d) => sum + (actualByDate.get(d) ?? 0), 0);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
        <div
          className="w-full max-w-[430px] bg-white dark:bg-[#161B27] rounded-t-3xl shadow-2xl pointer-events-auto flex flex-col"
          style={{ maxHeight: "90dvh" }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white">🎯 Mục tiêu tuần này</h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200">
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="px-5 space-y-2.5 overflow-y-auto flex-1">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-6">Đang tải...</p>
            ) : (
              weekDates.map((date, i) => {
                const isPast = date <= todayStr;
                const isFuture = date > todayStr;
                const target = parseInt((targetInputs[date] ?? "0").replace(/\D/g, ""), 10) || 0;
                const actual = actualByDate.get(date) ?? 0;
                const achieved = isPast && target > 0 ? actual >= target : null;
                const [, m, d] = date.split("-");

                return (
                  <div key={date} className={`rounded-xl p-3 ${date === todayStr ? "bg-blue-50 dark:bg-blue-950/30" : "bg-[#F0F8FF] dark:bg-gray-800/60"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-[#1A1A2E] dark:text-white">
                        {DAY_LABELS[i]} <span className="text-xs font-normal text-gray-400">{d}/{m}</span>
                      </span>
                      {achieved === true && (
                        <span className="text-[10px] font-bold text-[#4CAF50] bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full">✅ Đạt</span>
                      )}
                      {achieved === false && (
                        <span className="text-[10px] font-bold text-[#F44336] bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">❌ Chưa đạt</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-400">Target</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={targetInputs[date] ?? ""}
                          onChange={(e) => handleChange(date, e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 dark:text-white rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      {!isFuture && (
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400">Đã kiếm</label>
                          <p className="px-2.5 py-1.5 text-sm font-semibold text-[#1A1A2E] dark:text-white">
                            {formatVNDShort(actual)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 pt-3 flex-shrink-0" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Tổng target tuần: <span className="font-semibold text-[#1A1A2E] dark:text-white">{formatVND(weekTotalTarget)}</span></span>
              <span>Đã kiếm: <span className="font-semibold text-[#1A1A2E] dark:text-white">{formatVND(weekTotalActual)}</span></span>
            </div>
            {error && (
              <p className="text-xs font-semibold text-[#F44336] bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2 mb-2">
                {error}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full bg-[#1E90FF] text-white font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu mục tiêu tuần"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
