"use client";
import { useState } from "react";
import { Trash2, Pencil, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Loan, LENDER_TYPES } from "@/types";
import { calcLoanStatus, calcAnnualRate, calcEarlyPayoff } from "@/lib/calculations";
import { formatVND, formatMonth } from "@/lib/formatters";

interface Props {
  loan: Loan;
  onEdit?: (loan: Loan) => void;
  onDelete?: (id: string) => void;
  onConfirmPayment?: (id: string) => void;
}

export default function LoanItem({ loan, onEdit, onDelete, onConfirmPayment }: Props) {
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [extraRaw, setExtraRaw] = useState("");

  const lenderType = LENDER_TYPES.find((lt) => lt.value === loan.lenderType);
  const monthsLeft = loan.totalMonths - loan.monthsPaid;
  const remaining = monthsLeft * loan.monthlyPayment;
  const annualRate = calcAnnualRate(loan.principal, loan.monthlyPayment, loan.totalMonths);
  const monthlyRate = annualRate > 0 ? Math.round(annualRate / 12 * 10) / 10 : 0;
  const { nextDueMonth, status } = calcLoanStatus(loan);
  const progress = loan.totalMonths > 0 ? (loan.monthsPaid / loan.totalMonths) * 100 : 0;

  // Format due date: "ngày 15/07/2025"
  const dueDateText = (() => {
    if (!nextDueMonth) return "";
    const [y, m] = nextDueMonth.split("-");
    return `ngày ${loan.dueDay}/${m}/${y}`;
  })();

  const statusBadge = {
    paid_off: { text: "✅ Đã trả hết", bg: "bg-green-100 text-green-700" },
    due:      { text: `🔴 Đến hạn ${dueDateText}`, bg: "bg-red-100 text-red-700" },
    overdue:  { text: `🟠 Quá hạn — ${dueDateText}`, bg: "bg-orange-100 text-orange-700" },
    upcoming: { text: `⬜ Đến hạn ${dueDateText}`, bg: "bg-gray-100 text-gray-500" },
  }[status];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl flex-shrink-0">{lenderType?.icon ?? "📝"}</span>
          <div className="min-w-0">
            <p className="font-bold text-[#1A1A2E] text-sm truncate">{loan.name}</p>
            <p className="text-xs text-gray-400">
              {lenderType?.label ?? loan.lenderType}
              {monthlyRate > 0 && (
                <span className="ml-1.5 text-orange-400 font-semibold">~{monthlyRate}%/tháng</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(loan)}
              className="p-1.5 rounded-lg text-gray-300 hover:text-blue-400 hover:bg-blue-50 transition-colors"
              aria-label="Sửa"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(loan.id)}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              aria-label="Xoá"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge.bg}`}>
        {statusBadge.text}
      </span>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Trả hằng tháng</p>
          <p className="text-base font-extrabold text-[#1E90FF] mt-0.5">{formatVND(loan.monthlyPayment)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">ngày {loan.dueDay} hằng tháng</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Còn phải trả</p>
          <p className="text-base font-extrabold text-[#F44336] mt-0.5">{formatVND(remaining)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{monthsLeft} tháng nữa</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
          <span>Đã trả {loan.monthsPaid}/{loan.totalMonths} tháng</span>
          <span>{monthsLeft > 0 ? `Còn ${monthsLeft} tháng` : "Đã trả hết"}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1E90FF] transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Confirm payment button */}
      {(status === "due" || status === "overdue") && onConfirmPayment && (
        <button
          onClick={() => onConfirmPayment(loan.id)}
          className="w-full py-3 rounded-xl bg-[#4CAF50] text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-sm shadow-green-200"
        >
          <CheckCircle2 size={16} />
          Xác nhận đã trả {dueDateText}
        </button>
      )}

      {/* What-if calculator */}
      {status !== "paid_off" && (
        <div className="border-t border-gray-100 pt-2">
          <button
            onClick={() => setShowWhatIf((v) => !v)}
            className="w-full flex items-center justify-between py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="font-semibold">💡 Nếu trả thêm mỗi tháng?</span>
            {showWhatIf ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showWhatIf && (() => {
            const extra = parseInt(extraRaw.replace(/\D/g, ""), 10) || 0;
            const result = extra > 0 ? calcEarlyPayoff(loan, extra) : null;
            return (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Trả thêm</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="ví dụ: 500.000"
                    value={extraRaw}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const num = parseInt(digits, 10);
                      setExtraRaw(isNaN(num) ? "" : num.toLocaleString("vi-VN"));
                    }}
                    className="flex-1 bg-blue-50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 text-right font-semibold text-[#1A1A2E]"
                  />
                  <span className="text-xs text-gray-500">đ/tháng</span>
                </div>
                {result && (
                  <div className="bg-green-50 rounded-xl px-3 py-2.5 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Hết nợ sớm</span>
                      <span className="font-bold text-[#4CAF50]">{result.monthsSaved} tháng</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Còn {result.newMonthsLeft} tháng nữa</span>
                      <span className="font-bold text-[#4CAF50]">Tiết kiệm {formatVND(result.interestSaved)}</span>
                    </div>
                  </div>
                )}
                {extra > 0 && !result && (
                  <p className="text-xs text-gray-400 text-center">Không tính được (khoản vay 0% lãi)</p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
