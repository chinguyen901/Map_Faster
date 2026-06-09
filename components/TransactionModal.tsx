"use client";
import { useState, useEffect } from "react";
import { X, Settings2 } from "lucide-react";
import Link from "next/link";
import { Transaction, TransactionType, CustomCategory } from "@/types";
import { getTodayISO } from "@/lib/formatters";
import { fetchCustomCategories } from "@/lib/api";
import { getMergedCategories } from "@/lib/categories";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { type: TransactionType; category: string; amount: number; note: string; date: string; isRecurring: boolean; recurringDay: number | null }) => void;
  editingTransaction?: Transaction | null;
}

export default function TransactionModal({ open, onClose, onSave, editingTransaction }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getTodayISO());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState<number>(1);
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);

  const isEditing = !!editingTransaction;
  const categories = getMergedCategories(type, customCats);

  // Fetch custom categories when modal opens
  useEffect(() => {
    if (open) {
      fetchCustomCategories().then(setCustomCats);
    }
  }, [open]);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setAmount(editingTransaction.amount.toLocaleString("vi-VN"));
      setNote(editingTransaction.note);
      setDate(editingTransaction.date);
      setIsRecurring(editingTransaction.isRecurring);
      setRecurringDay(editingTransaction.recurringDay ?? 1);
    } else {
      resetForm();
    }
  }, [editingTransaction, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!parsedAmount || parsedAmount <= 0 || !category) return;
    onSave({
      type, category, amount: parsedAmount, note, date,
      isRecurring,
      recurringDay: isRecurring ? recurringDay : null,
    });
    resetForm();
    onClose();
  }

  function resetForm() {
    setType("expense");
    setCategory("");
    setAmount("");
    setNote("");
    setDate(getTodayISO());
    setIsRecurring(false);
    setRecurringDay(1);
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
              {isEditing ? "Sửa giao dịch" : "Thêm giao dịch"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Type Toggle */}
          <div className="mx-5 mb-4 flex rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => { setType("expense"); setCategory(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                type === "expense" ? "bg-[#F44336] text-white shadow" : "text-gray-500"
              }`}
            >
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => { setType("income"); setCategory(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                type === "income" ? "bg-[#4CAF50] text-white shadow" : "text-gray-500"
              }`}
            >
              Thu nhập
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 space-y-4" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Số tiền</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  required
                  className="w-full text-3xl font-bold text-[#1A1A2E] border-b-2 border-[#1E90FF] bg-transparent pb-2 pr-8 outline-none placeholder-gray-300"
                />
                <span className="absolute right-0 bottom-2.5 text-xl font-bold text-gray-400">đ</span>
              </div>
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Danh mục</label>
                <Link
                  href="/categories"
                  onClick={onClose}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#1E90FF]"
                >
                  <Settings2 size={11} /> Quản lý
                </Link>
              </div>
              <div className="mt-1 grid grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      category === cat.name
                        ? "border-[#1E90FF] bg-blue-50"
                        : "border-transparent bg-gray-50"
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ghi chú</label>
              <input
                type="text"
                placeholder="Thêm ghi chú..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Recurring toggle */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#1A1A2E]">Lặp lại hàng tháng</p>
                <p className="text-xs text-gray-400 mt-0.5">Tự động nhắc vào ngày cố định</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecurring((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isRecurring ? "bg-[#1E90FF]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    isRecurring ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            {isRecurring && (
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-600">Ngày</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={recurringDay}
                  onChange={(e) => setRecurringDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-16 bg-white rounded-lg px-3 py-1.5 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-blue-200"
                />
                <span className="text-sm text-gray-600">hằng tháng</span>
              </div>
            )}

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
