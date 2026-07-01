"use client";
import { useState, useEffect, useMemo } from "react";
import { X, Trash2 } from "lucide-react";
import { Loan, LenderType, LENDER_TYPES } from "@/types";
import { calcAnnualRate } from "@/lib/calculations";
import { formatVND, getCurrentMonth } from "@/lib/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Loan, "id" | "createdAt">) => void;
  onDelete?: () => void;
  editingLoan?: Loan | null;
}

function parseAmountInput(val: string): string {
  const digits = val.replace(/\D/g, "");
  const num = parseInt(digits, 10);
  return isNaN(num) ? "" : num.toLocaleString("vi-VN");
}

export default function LoanModal({ open, onClose, onSave, onDelete, editingLoan }: Props) {
  const [name, setName] = useState("");
  const [lenderType, setLenderType] = useState<LenderType>("bank");
  const [principal, setPrincipal] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [totalMonths, setTotalMonths] = useState("");
  const [monthsPaid, setMonthsPaid] = useState("0");
  const [startMonth, setStartMonth] = useState(getCurrentMonth());
  const [dueDay, setDueDay] = useState("5");
  const [note, setNote] = useState("");

  const isEditing = !!editingLoan;

  useEffect(() => {
    if (!open) return;
    if (editingLoan) {
      setName(editingLoan.name);
      setLenderType(editingLoan.lenderType);
      setPrincipal(editingLoan.principal.toLocaleString("vi-VN"));
      setMonthlyPayment(editingLoan.monthlyPayment.toLocaleString("vi-VN"));
      setTotalMonths(String(editingLoan.totalMonths));
      setMonthsPaid(String(editingLoan.monthsPaid));
      setStartMonth(editingLoan.startMonth);
      setDueDay(String(editingLoan.dueDay));
      setNote(editingLoan.note);
    } else {
      setName("");
      setLenderType("bank");
      setPrincipal("");
      setMonthlyPayment("");
      setTotalMonths("");
      setMonthsPaid("0");
      setStartMonth(getCurrentMonth());
      setDueDay("5");
      setNote("");
    }
  }, [open, editingLoan]);

  const principalNum = parseInt(principal.replace(/\D/g, ""), 10) || 0;
  const monthlyPaymentNum = parseInt(monthlyPayment.replace(/\D/g, ""), 10) || 0;
  const totalMonthsNum = parseInt(totalMonths, 10) || 0;

  const previewRate = useMemo(() => {
    if (!principalNum || !monthlyPaymentNum || !totalMonthsNum) return null;
    return calcAnnualRate(principalNum, monthlyPaymentNum, totalMonthsNum);
  }, [principalNum, monthlyPaymentNum, totalMonthsNum]);

  if (!open) return null;

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const dueDayNum = Math.min(31, Math.max(1, parseInt(dueDay, 10) || 1));
    const monthsPaidNum = Math.max(0, parseInt(monthsPaid, 10) || 0);
    if (!name || !principalNum || !monthlyPaymentNum || !totalMonthsNum || !startMonth) return;
    onSave({
      name,
      lenderType,
      principal: principalNum,
      monthlyPayment: monthlyPaymentNum,
      totalMonths: totalMonthsNum,
      monthsPaid: monthsPaidNum,
      startMonth,
      dueDay: dueDayNum,
      note,
    });
  }

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
            <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
              {isEditing ? "Sửa khoản vay" : "Thêm khoản vay"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200">
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tên khoản vay</label>
              <input
                type="text"
                placeholder="VD: Vay mua xe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Loại</label>
              <div className="mt-1 grid grid-cols-4 gap-2">
                {LENDER_TYPES.map((lt) => (
                  <button
                    key={lt.value}
                    type="button"
                    onClick={() => setLenderType(lt.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      lenderType === lt.value
                        ? "border-[#1E90FF] bg-blue-50 dark:bg-blue-950/40"
                        : "border-transparent bg-gray-50 dark:bg-gray-800"
                    }`}
                  >
                    <span className="text-xl">{lt.icon}</span>
                    <span className="text-[9px] font-medium text-gray-600 dark:text-gray-300 text-center leading-tight">{lt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Số tiền vay</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={principal}
                  onChange={(e) => setPrincipal(parseAmountInput(e.target.value))}
                  required
                  className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Trả/tháng</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(parseAmountInput(e.target.value))}
                  required
                  className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {previewRate !== null && (
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl px-4 py-2.5 text-xs text-[#FF9800] font-semibold">
                Lãi suất ước tính ~{previewRate}%/năm ({(previewRate / 12).toFixed(2)}%/tháng)
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tổng số tháng</label>
                <input
                  type="number"
                  min={1}
                  placeholder="VD: 24"
                  value={totalMonths}
                  onChange={(e) => setTotalMonths(e.target.value)}
                  required
                  className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Đã trả (tháng)</label>
                <input
                  type="number"
                  min={0}
                  value={monthsPaid}
                  onChange={(e) => setMonthsPaid(e.target.value)}
                  className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tháng bắt đầu</label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  required
                  className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ngày trả/tháng</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  required
                  className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ghi chú</label>
              <input
                type="text"
                placeholder="Không bắt buộc"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {principalNum > 0 && monthlyPaymentNum > 0 && totalMonthsNum > 0 && (
              <p className="text-xs text-gray-400">
                Tổng phải trả: {formatVND(monthlyPaymentNum * totalMonthsNum)}
              </p>
            )}
          </form>

          <div className="px-5 pt-3 flex gap-2 flex-shrink-0" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-red-200 dark:border-red-900 text-red-500 text-sm font-semibold"
              >
                <Trash2 size={15} />
                Xoá
              </button>
            )}
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 bg-[#1E90FF] text-white font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-all"
            >
              {isEditing ? "Cập nhật" : "Lưu khoản vay"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
