"use client";
import { useState, useEffect, useMemo } from "react";
import { X, Trash2 } from "lucide-react";
import { Loan, LenderType, LENDER_TYPES } from "@/types";
import { calcAnnualRate } from "@/lib/calculations";
import { formatVND, getCurrentMonth } from "@/lib/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Loan, "id" | "createdAt">) => Promise<boolean>;
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
  const [paidAmount, setPaidAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!editingLoan;
  const isPersonal = lenderType === "personal";

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);
    if (editingLoan) {
      setName(editingLoan.name);
      setLenderType(editingLoan.lenderType);
      setPrincipal(editingLoan.principal.toLocaleString("vi-VN"));
      setMonthlyPayment(editingLoan.monthlyPayment != null ? editingLoan.monthlyPayment.toLocaleString("vi-VN") : "");
      setTotalMonths(editingLoan.totalMonths != null ? String(editingLoan.totalMonths) : "");
      setMonthsPaid(String(editingLoan.monthsPaid));
      setStartMonth(editingLoan.startMonth);
      setDueDay(editingLoan.dueDay != null ? String(editingLoan.dueDay) : "5");
      setPaidAmount(editingLoan.paidAmount ? editingLoan.paidAmount.toLocaleString("vi-VN") : "");
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
      setPaidAmount("");
      setNote("");
    }
  }, [open, editingLoan]);

  const principalNum = parseInt(principal.replace(/\D/g, ""), 10) || 0;
  const monthlyPaymentNum = parseInt(monthlyPayment.replace(/\D/g, ""), 10) || 0;
  const totalMonthsNum = parseInt(totalMonths, 10) || 0;
  const paidAmountNum = parseInt(paidAmount.replace(/\D/g, ""), 10) || 0;

  const previewRate = useMemo(() => {
    if (isPersonal || !principalNum || !monthlyPaymentNum || !totalMonthsNum) return null;
    return calcAnnualRate(principalNum, monthlyPaymentNum, totalMonthsNum);
  }, [isPersonal, principalNum, monthlyPaymentNum, totalMonthsNum]);

  if (!open) return null;

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();

    if (!name || !principalNum || !startMonth) {
      setError("Vui lòng điền đủ tên, số tiền vay và tháng bắt đầu.");
      return;
    }
    if (!isPersonal && (!monthlyPaymentNum || !totalMonthsNum)) {
      setError("Vui lòng điền đủ trả/tháng và tổng số tháng.");
      return;
    }

    setError("");
    setSaving(true);
    const ok = isPersonal
      ? await onSave({
          name,
          lenderType,
          principal: principalNum,
          monthlyPayment: null,
          totalMonths: null,
          monthsPaid: 0,
          startMonth,
          dueDay: null,
          paidAmount: paidAmountNum,
          note,
        })
      : await onSave({
          name,
          lenderType,
          principal: principalNum,
          monthlyPayment: monthlyPaymentNum,
          totalMonths: totalMonthsNum,
          monthsPaid: Math.max(0, parseInt(monthsPaid, 10) || 0),
          startMonth,
          dueDay: Math.min(31, Math.max(1, parseInt(dueDay, 10) || 1)),
          paidAmount: 0,
          note,
        });
    setSaving(false);
    if (!ok) setError("Lưu thất bại — vui lòng kiểm tra kết nối mạng và thử lại.");
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
              {isPersonal && (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Vay cá nhân không có lịch trả cố định — bạn ghi nhận số tiền trả mỗi lần, app tự tính còn nợ bao nhiêu.
                </p>
              )}
            </div>

            <div className={isPersonal ? "" : "grid grid-cols-2 gap-3"}>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {isPersonal ? "Số tiền cho vay/đã vay" : "Số tiền vay"}
                </label>
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
              {!isPersonal && (
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
              )}
            </div>

            {isPersonal && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Đã trả trước đó (nếu có)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseAmountInput(e.target.value))}
                  className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            )}

            {previewRate !== null && (
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl px-4 py-2.5 text-xs text-[#FF9800] font-semibold">
                Lãi suất ước tính ~{previewRate}%/năm ({(previewRate / 12).toFixed(2)}%/tháng)
              </div>
            )}

            {!isPersonal && (
              <>
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
              </>
            )}

            {isPersonal && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tháng vay</label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  required
                  className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            )}

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

            {!isPersonal && principalNum > 0 && monthlyPaymentNum > 0 && totalMonthsNum > 0 && (
              <p className="text-xs text-gray-400">
                Tổng phải trả: {formatVND(monthlyPaymentNum * totalMonthsNum)}
              </p>
            )}
            {isPersonal && principalNum > 0 && (
              <p className="text-xs text-gray-400">
                Còn nợ: {formatVND(Math.max(0, principalNum - paidAmountNum))}
              </p>
            )}
          </form>

          <div className="px-5 pt-3 flex-shrink-0" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            {error && (
              <p className="text-xs font-semibold text-[#F44336] bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2 mb-2">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-red-200 dark:border-red-900 text-red-500 text-sm font-semibold disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Xoá
                </button>
              )}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-[#1E90FF] text-white font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : isEditing ? "Cập nhật" : "Lưu khoản vay"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
