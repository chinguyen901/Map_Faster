"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Transaction, TransactionType, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/types";
import { getTodayISO } from "@/lib/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { type: TransactionType; category: string; amount: number; note: string; date: string }) => void;
  editingTransaction?: Transaction | null;
  initialType?: TransactionType;
  initialCategory?: string;
}

export default function TransactionModal({ open, onClose, onSave, editingTransaction, initialType, initialCategory }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getTodayISO());

  const isEditing = !!editingTransaction;
  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // Pre-fill form when editing
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setAmount(editingTransaction.amount.toLocaleString("vi-VN"));
      setNote(editingTransaction.note);
      setDate(editingTransaction.date);
    } else {
      resetForm();
    }
  }, [editingTransaction, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!parsedAmount || parsedAmount <= 0 || !category) return;
    onSave({ type, category, amount: parsedAmount, note, date });
    resetForm();
    onClose();
  }

  function resetForm() {
    setType(initialType ?? "expense");
    setCategory(initialCategory ?? "");
    setAmount("");
    setNote("");
    setDate(getTodayISO());
  }

  function handleAmountChange(val: string) {
    const digits = val.replace(/\D/g, "");
    const num = parseInt(digits, 10);
    setAmount(isNaN(num) ? "" : num.toLocaleString("vi-VN"));
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop — full screen */}
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Card — anchored to bottom, centered, max 430px */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
        <div
          className="w-full max-w-[430px] bg-white dark:bg-[#161B27] rounded-t-3xl shadow-2xl pointer-events-auto"
          style={{ maxHeight: "90dvh", overflowY: "auto" }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white dark:bg-[#161B27]">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 sticky top-5 bg-white dark:bg-[#161B27] z-10">
            <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
              {isEditing ? "Sửa giao dịch" : "Thêm giao dịch"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200">
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Type Toggle */}
          <div className="mx-5 mb-4 flex rounded-2xl bg-gray-100 dark:bg-gray-800 p-1">
            <button
              type="button"
              onClick={() => { setType("expense"); setCategory(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                type === "expense" ? "bg-[#F44336] text-white shadow" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => { setType("income"); setCategory(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                type === "income" ? "bg-[#4CAF50] text-white shadow" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Thu nhập
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 space-y-4" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Số tiền</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  required
                  className="w-full text-3xl font-bold text-[#1A1A2E] dark:text-white border-b-2 border-[#1E90FF] bg-transparent pb-2 pr-8 outline-none placeholder-gray-300 dark:placeholder-gray-600"
                />
                <span className="absolute right-0 bottom-2.5 text-xl font-bold text-gray-400">đ</span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Danh mục</label>
              <div className="mt-1 grid grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      category === cat.name
                        ? "border-[#1E90FF] bg-blue-50 dark:bg-blue-950/40"
                        : "border-transparent bg-gray-50 dark:bg-gray-800"
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-[9px] font-medium text-gray-600 dark:text-gray-300 text-center leading-tight">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ghi chú</label>
              <input
                type="text"
                placeholder="Thêm ghi chú..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ngày</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] shadow-lg ${
                type === "expense"
                  ? "bg-[#F44336] shadow-red-200"
                  : "bg-[#4CAF50] shadow-green-200"
              }`}
            >
              {isEditing ? "Cập nhật giao dịch" : "Lưu giao dịch"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
