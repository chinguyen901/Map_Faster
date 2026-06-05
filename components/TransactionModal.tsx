"use client";
import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { TransactionType, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/types";
import { getTodayISO } from "@/lib/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { type: TransactionType; category: string; amount: number; note: string; date: string }) => void;
}

export default function TransactionModal({ open, onClose, onAdd }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getTodayISO());

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!parsedAmount || parsedAmount <= 0 || !category) return;
    onAdd({ type, category, amount: parsedAmount, note, date });
    resetForm();
    onClose();
  }

  function resetForm() {
    setType("expense");
    setCategory("");
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ maxWidth: 430, left: "50%", transform: "translateX(-50%)" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Thêm giao dịch</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
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

        <form onSubmit={handleSubmit} className="px-5 space-y-4 pb-6">
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
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Danh mục</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
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

          <button
            type="submit"
            className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98] shadow-lg ${
              type === "expense"
                ? "bg-[#F44336] shadow-red-200"
                : "bg-[#4CAF50] shadow-green-200"
            }`}
          >
            Lưu giao dịch
          </button>
        </form>
      </div>
    </div>
  );
}
