"use client";
import { Trash2, Pencil, CheckCircle2 } from "lucide-react";
import { Loan, LENDER_TYPES } from "@/types";
import { calcLoanStatus, calcAnnualRate } from "@/lib/calculations";
import { formatVND, formatMonth } from "@/lib/formatters";

interface Props {
  loan: Loan;
  onEdit?: (loan: Loan) => void;
  onDelete?: (id: string) => void;
  onConfirmPayment?: (id: string) => void;
}

export default function LoanItem({ loan, onEdit, onDelete, onConfirmPayment }: Props) {
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
    </div>
  );
}
