"use client";
import { useState } from "react";
import { Pencil, Trash2, Check } from "lucide-react";
import { Loan, LENDER_TYPES } from "@/types";
import { calcAnnualRate, calcRemainingBalance, calcLoanStatus } from "@/lib/calculations";
import { formatVNDShort } from "@/lib/formatters";

interface Props {
  loan: Loan;
  onEdit: (loan: Loan) => void;
  onDelete: (id: string) => void;
  onConfirmPay: (id: string, amount?: number) => void;
}

function dueDateLabel(nextDueMonth: string, dueDay: number): string {
  const [y, m] = nextDueMonth.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const day = Math.min(dueDay, daysInMonth);
  return `${String(day).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function parseAmountInput(val: string): string {
  const digits = val.replace(/\D/g, "");
  const num = parseInt(digits, 10);
  return isNaN(num) ? "" : num.toLocaleString("vi-VN");
}

export default function LoanItem({ loan, onEdit, onDelete, onConfirmPay }: Props) {
  const isPersonal = loan.lenderType === "personal";
  const lenderDef = LENDER_TYPES.find((l) => l.value === loan.lenderType);
  const [payingOpen, setPayingOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  if (isPersonal) {
    const remaining = Math.max(0, loan.principal - loan.paidAmount);
    const isPaidOff = loan.paidAmount >= loan.principal;
    const progressPct = Math.min(100, Math.round((loan.paidAmount / loan.principal) * 100));
    const payAmountNum = parseInt(payAmount.replace(/\D/g, ""), 10) || 0;

    function submitPay() {
      if (payAmountNum <= 0) return;
      onConfirmPay(loan.id, payAmountNum);
      setPayAmount("");
      setPayingOpen(false);
    }

    return (
      <div className="card p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-lg flex-shrink-0">
              {lenderDef?.icon ?? "👤"}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate">{loan.name}</p>
              <p className="text-xs text-gray-400">{lenderDef?.label} · không có lịch trả cố định</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onEdit(loan)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors" aria-label="Sửa">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(loan.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" aria-label="Xoá">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold mb-3 ${
          isPaidOff ? "bg-green-50 dark:bg-green-950/30 text-[#4CAF50]" : "bg-gray-50 dark:bg-gray-800 text-gray-400"
        }`}>
          {isPaidOff ? "✅ Đã trả hết" : "💰 Còn nợ"}
        </div>

        <div className="flex gap-3 mb-3">
          <div className="flex-1 bg-[#F0F8FF] dark:bg-gray-800/60 rounded-xl p-2.5">
            <p className="text-[10px] text-gray-400">Đã trả</p>
            <p className="font-bold text-[#1A1A2E] dark:text-white text-sm mt-0.5">{formatVNDShort(loan.paidAmount)}</p>
          </div>
          <div className="flex-1 bg-[#F0F8FF] dark:bg-gray-800/60 rounded-xl p-2.5">
            <p className="text-[10px] text-gray-400">Còn nợ</p>
            <p className="font-bold text-[#F44336] text-sm mt-0.5">{formatVNDShort(remaining)}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>Tiến độ</span>
            <span className="font-semibold text-[#1A1A2E] dark:text-white">{progressPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#1E90FF] transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {!isPaidOff && (
          payingOpen ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder="Số tiền trả lần này"
                value={payAmount}
                onChange={(e) => setPayAmount(parseAmountInput(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && submitPay()}
                className="flex-1 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button onClick={() => setPayingOpen(false)} className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                Huỷ
              </button>
              <button
                onClick={submitPay}
                disabled={payAmountNum <= 0}
                className="p-2.5 rounded-xl bg-[#1E90FF] text-white disabled:opacity-50"
                aria-label="Xác nhận"
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPayingOpen(true)}
              className="w-full mt-3 py-2.5 rounded-xl bg-[#1E90FF] text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <Check size={14} />
              Ghi nhận thanh toán
            </button>
          )
        )}
      </div>
    );
  }

  // Fixed-schedule loan (bank / consumer / other)
  const { nextDueMonth, status } = calcLoanStatus(loan);
  const annualRate = calcAnnualRate(loan.principal, loan.monthlyPayment!, loan.totalMonths!);
  const monthlyRate = annualRate / 12;
  const remaining = calcRemainingBalance(loan.principal, loan.monthlyPayment!, loan.totalMonths!, loan.monthsPaid);
  const progressPct = Math.min(100, Math.round((loan.monthsPaid / loan.totalMonths!) * 100));
  const isDue = status === "due" || status === "overdue";

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-lg flex-shrink-0">
            {lenderDef?.icon ?? "🏦"}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate">{loan.name}</p>
            <p className="text-xs text-gray-400">{lenderDef?.label} · ~{monthlyRate.toFixed(2)}%/tháng</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(loan)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors" aria-label="Sửa">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(loan.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" aria-label="Xoá">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {status === "paid_off" ? (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold mb-3 bg-green-50 dark:bg-green-950/30 text-[#4CAF50]">
          ✅ Đã trả hết
        </div>
      ) : (
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold mb-3 ${
          isDue ? "bg-red-50 dark:bg-red-950/30 text-[#F44336]" : "bg-gray-50 dark:bg-gray-800 text-gray-400"
        }`}>
          {isDue ? "🔴" : "⚪"} {status === "overdue" ? "Quá hạn" : status === "due" ? "Đến hạn" : "Sắp đến hạn"} ngày {dueDateLabel(nextDueMonth, loan.dueDay!)}
        </div>
      )}

      <div className="flex gap-3 mb-3">
        <div className="flex-1 bg-[#F0F8FF] dark:bg-gray-800/60 rounded-xl p-2.5">
          <p className="text-[10px] text-gray-400">Trả/tháng · ngày {loan.dueDay}</p>
          <p className="font-bold text-[#1A1A2E] dark:text-white text-sm mt-0.5">{formatVNDShort(loan.monthlyPayment!)}</p>
        </div>
        <div className="flex-1 bg-[#F0F8FF] dark:bg-gray-800/60 rounded-xl p-2.5">
          <p className="text-[10px] text-gray-400">Còn phải trả</p>
          <p className="font-bold text-[#F44336] text-sm mt-0.5">{formatVNDShort(remaining)}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-gray-400 mb-1">
          <span>Tiến độ</span>
          <span className="font-semibold text-[#1A1A2E] dark:text-white">{loan.monthsPaid}/{loan.totalMonths} tháng</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#1E90FF] transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {isDue && (
        <button
          onClick={() => onConfirmPay(loan.id)}
          className="w-full mt-3 py-2.5 rounded-xl bg-[#1E90FF] text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <Check size={14} />
          Xác nhận đã trả ngày {dueDateLabel(nextDueMonth, loan.dueDay!)}
        </button>
      )}
    </div>
  );
}
