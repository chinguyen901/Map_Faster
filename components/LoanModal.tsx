"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Loan, LenderType, LENDER_TYPES } from "@/types";
import { calcAnnualRate } from "@/lib/calculations";
import { formatVND, getCurrentMonth } from "@/lib/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Loan, "id" | "createdAt">) => void;
  editingLoan?: Loan | null;
}

const DEFAULT_FORM = {
  name: "",
  lenderType: "bank" as LenderType,
  principal: "",
  monthlyPayment: "",
  totalMonths: "",
  monthsPaid: "0",
  startMonth: getCurrentMonth(),
  dueDay: "10",
  note: "",
};

export default function LoanModal({ open, onClose, onSave, editingLoan }: Props) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const isEditing = !!editingLoan;

  useEffect(() => {
    if (editingLoan) {
      setForm({
        name: editingLoan.name,
        lenderType: editingLoan.lenderType,
        principal: editingLoan.principal.toLocaleString("vi-VN"),
        monthlyPayment: editingLoan.monthlyPayment.toLocaleString("vi-VN"),
        totalMonths: String(editingLoan.totalMonths),
        monthsPaid: String(editingLoan.monthsPaid),
        startMonth: editingLoan.startMonth,
        dueDay: String(editingLoan.dueDay),
        note: editingLoan.note,
      });
    } else {
      setForm({ ...DEFAULT_FORM, startMonth: getCurrentMonth() });
    }
  }, [editingLoan, open]);

  const principalNum = parseInt(form.principal.replace(/\D/g, ""), 10) || 0;
  const monthlyPaymentNum = parseInt(form.monthlyPayment.replace(/\D/g, ""), 10) || 0;
  const totalMonthsNum = parseInt(form.totalMonths, 10) || 0;

  const derivedRate =
    principalNum > 0 && monthlyPaymentNum > 0 && totalMonthsNum > 0
      ? calcAnnualRate(principalNum, monthlyPaymentNum, totalMonthsNum)
      : null;

  const totalPaid = monthlyPaymentNum > 0 && totalMonthsNum > 0
    ? monthlyPaymentNum * totalMonthsNum
    : null;
  const totalInterest = totalPaid !== null && principalNum > 0 ? totalPaid - principalNum : null;

  function handleVNDInput(field: "principal" | "monthlyPayment", val: string) {
    const digits = val.replace(/\D/g, "");
    const num = parseInt(digits, 10);
    setForm((f) => ({ ...f, [field]: isNaN(num) ? "" : num.toLocaleString("vi-VN") }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!principalNum || !monthlyPaymentNum || !totalMonthsNum || !form.name) return;
    const monthsPaidNum = Math.min(parseInt(form.monthsPaid, 10) || 0, totalMonthsNum);
    onSave({
      name: form.name,
      lenderType: form.lenderType,
      principal: principalNum,
      monthlyPayment: monthlyPaymentNum,
      totalMonths: totalMonthsNum,
      monthsPaid: monthsPaidNum,
      startMonth: form.startMonth,
      dueDay: parseInt(form.dueDay, 10) || 10,
      note: form.note,
    });
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div
          className="w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl pointer-events-auto"
          style={{ maxHeight: "90dvh", overflowY: "auto" }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 sticky top-5 bg-white z-10">
            <h2 className="text-lg font-bold text-[#1A1A2E]">
              {isEditing ? "Sửa khoản vay" : "Thêm khoản vay"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 space-y-4" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            {/* Loan Name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên khoản vay</label>
              <input
                type="text"
                placeholder="VD: Vay mua xe, Vay ngân hàng VCB..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Lender Type */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Loại khoản vay</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {LENDER_TYPES.map((lt) => (
                  <button
                    key={lt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, lenderType: lt.value }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      form.lenderType === lt.value
                        ? "border-[#1E90FF] bg-blue-50"
                        : "border-transparent bg-gray-50"
                    }`}
                  >
                    <span className="text-xl">{lt.icon}</span>
                    <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">{lt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Principal */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Số tiền vay gốc</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.principal}
                  onChange={(e) => handleVNDInput("principal", e.target.value)}
                  required
                  className="w-full text-2xl font-bold text-[#1A1A2E] border-b-2 border-[#1E90FF] bg-transparent pb-2 pr-8 outline-none placeholder-gray-300"
                />
                <span className="absolute right-0 bottom-2.5 text-lg font-bold text-gray-400">đ</span>
              </div>
            </div>

            {/* Monthly Payment */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tiền trả hằng tháng</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.monthlyPayment}
                  onChange={(e) => handleVNDInput("monthlyPayment", e.target.value)}
                  required
                  className="w-full text-2xl font-bold text-[#1A1A2E] border-b-2 border-[#1E90FF] bg-transparent pb-2 pr-8 outline-none placeholder-gray-300"
                />
                <span className="absolute right-0 bottom-2.5 text-lg font-bold text-gray-400">đ</span>
              </div>
            </div>

            {/* Total Months + Months Paid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tổng số tháng vay</label>
                <div className="mt-1 relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    placeholder="48"
                    value={form.totalMonths}
                    onChange={(e) => setForm((f) => ({ ...f, totalMonths: e.target.value }))}
                    required
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">tháng</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Đã trả được</label>
                <div className="mt-1 relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={form.monthsPaid}
                    onChange={(e) => setForm((f) => ({ ...f, monthsPaid: e.target.value }))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">tháng</span>
                </div>
              </div>
            </div>

            {/* Auto-calculated summary */}
            {derivedRate !== null && totalPaid !== null && totalInterest !== null && (
              <div className="bg-blue-50 rounded-2xl px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Lãi suất tương đương</span>
                  <span className="text-sm font-extrabold text-[#1E90FF]">
                    {derivedRate > 0 ? `~${derivedRate}%/năm` : "Không lãi"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Tổng tiền phải trả</span>
                  <span className="text-sm font-bold text-gray-700">{formatVND(totalPaid)}</span>
                </div>
                {totalInterest > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Tổng tiền lãi</span>
                    <span className="text-sm font-bold text-[#F44336]">{formatVND(totalInterest)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Start Month + Due Day */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tháng bắt đầu trả</label>
                <input
                  type="month"
                  value={form.startMonth}
                  onChange={(e) => setForm((f) => ({ ...f, startMonth: e.target.value }))}
                  required
                  className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày trả hằng tháng</label>
                <div className="mt-1 relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    placeholder="10"
                    value={form.dueDay}
                    onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
                    required
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">ngày</span>
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ghi chú</label>
              <input
                type="text"
                placeholder="Thêm ghi chú..."
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] shadow-lg bg-[#1E90FF] shadow-blue-200"
            >
              {isEditing ? "Cập nhật khoản vay" : "Lưu khoản vay"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
