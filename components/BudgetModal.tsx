"use client";
import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/types";
import { formatVND } from "@/lib/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (category: string, amount: number) => void;
  onDelete?: () => void;
  editingCategory?: string;
  editingAmount?: number;
}

export default function BudgetModal({ open, onClose, onSave, onDelete, editingCategory, editingAmount }: Props) {
  const [category, setCategory] = useState(editingCategory ?? EXPENSE_CATEGORIES[0].name);
  const [amountStr, setAmountStr] = useState(editingAmount ? String(editingAmount) : "");

  useEffect(() => {
    if (open) {
      setCategory(editingCategory ?? EXPENSE_CATEGORIES[0].name);
      setAmountStr(editingAmount ? String(editingAmount) : "");
    }
  }, [open, editingCategory, editingAmount]);

  if (!open) return null;

  function handleSave() {
    const amount = parseInt(amountStr.replace(/\D/g, ""), 10);
    if (!amount || amount <= 0) return;
    onSave(category, amount);
  }

  const parsedAmount = parseInt(amountStr.replace(/\D/g, ""), 10);
  const isEditing = !!editingCategory;

  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] mx-auto bg-white dark:bg-[#161B27] rounded-t-3xl flex flex-col max-h-[90dvh]">
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-[#1A1A2E] dark:text-white text-base">
              {isEditing ? "Sửa ngân sách" : "Đặt ngân sách"}
            </h3>
            <button onClick={onClose} className="p-1 text-gray-400"><X size={20} /></button>
          </div>

          {!isEditing && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Danh mục chi</p>
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setCategory(cat.name)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      category === cat.name
                        ? "border-[#1E90FF] bg-blue-50 dark:bg-blue-950/40 text-[#1E90FF]"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800"
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isEditing && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
              <span className="text-base">
                {EXPENSE_CATEGORIES.find((c) => c.name === editingCategory)?.icon}
              </span>
              <span className="text-sm font-semibold text-[#1E90FF]">{editingCategory}</span>
            </div>
          )}

          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Ngân sách hàng tháng</p>
            <input
              type="number"
              inputMode="numeric"
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:border-[#1E90FF] transition-colors"
              placeholder="Nhập số tiền..."
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
            />
            {parsedAmount > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">{formatVND(parsedAmount)}</p>
            )}
          </div>
        </div>

        {/* Sticky buttons — always visible above keyboard */}
        <div className="px-6 pt-3 pb-6 flex gap-2 flex-shrink-0" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
          {isEditing && onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold"
            >
              <Trash2 size={15} />
              Xoá
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!parsedAmount || parsedAmount <= 0}
            className="flex-1 bg-[#1E90FF] text-white font-bold py-3 rounded-2xl text-sm disabled:opacity-40"
          >
            Lưu ngân sách
          </button>
        </div>
      </div>
    </div>
  );
}
