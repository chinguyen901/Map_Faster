"use client";
import { Trash2, Pencil } from "lucide-react";
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/types";
import { formatVND, formatDateShort } from "@/lib/formatters";

interface Props {
  transaction: Transaction;
  onDelete?: (id: string) => void;
  onEdit?: (tx: Transaction) => void;
}

export default function TransactionItem({ transaction, onDelete, onEdit }: Props) {
  const cats = transaction.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const cat = cats.find((c) => c.name === transaction.category);
  const isExpense = transaction.type === "expense";

  return (
    <div className="flex items-center gap-3 py-3">
      {/* Icon — tap to edit */}
      <button
        type="button"
        onClick={() => onEdit?.(transaction)}
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 active:opacity-70 transition-opacity"
        style={{ backgroundColor: (cat?.color ?? "#B0B0B0") + "22" }}
        disabled={!onEdit}
      >
        {cat?.icon ?? "💰"}
      </button>

      {/* Info — tap to edit */}
      <button
        type="button"
        onClick={() => onEdit?.(transaction)}
        className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
        disabled={!onEdit}
      >
        <p className="font-semibold text-[#1A1A2E] dark:text-white text-sm truncate">
          {transaction.note || transaction.category}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {transaction.category} · {formatDateShort(transaction.date)}
        </p>
      </button>

      {/* Amount + actions */}
      <div className="flex items-center gap-1.5">
        <span className={`font-bold text-sm ${isExpense ? "text-[#F44336]" : "text-[#4CAF50]"}`}>
          {isExpense ? "-" : "+"}{formatVND(transaction.amount)}
        </span>
        {onEdit && (
          <button
            onClick={() => onEdit(transaction)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-blue-400 hover:bg-blue-50 active:bg-blue-100 transition-colors"
            aria-label="Sửa"
          >
            <Pencil size={13} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(transaction.id)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 active:bg-red-100 transition-colors"
            aria-label="Xoá"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
