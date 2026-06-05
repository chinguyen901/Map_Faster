"use client";
import { Trash2 } from "lucide-react";
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/types";
import { formatVND, formatDateShort } from "@/lib/formatters";

interface Props {
  transaction: Transaction;
  onDelete?: (id: string) => void;
}

export default function TransactionItem({ transaction, onDelete }: Props) {
  const cats = transaction.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const cat = cats.find((c) => c.name === transaction.category);
  const isExpense = transaction.type === "expense";

  return (
    <div className="flex items-center gap-3 py-3">
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: (cat?.color ?? "#B0B0B0") + "22" }}
      >
        {cat?.icon ?? "💰"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1A1A2E] text-sm truncate">
          {transaction.note || transaction.category}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {transaction.category} · {formatDateShort(transaction.date)}
        </p>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2">
        <span className={`font-bold text-sm ${isExpense ? "text-[#F44336]" : "text-[#4CAF50]"}`}>
          {isExpense ? "-" : "+"}{formatVND(transaction.amount)}
        </span>
        {onDelete && (
          <button
            onClick={() => onDelete(transaction.id)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
