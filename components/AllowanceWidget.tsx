"use client";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useTx } from "@/components/AppShell";
import { formatVND } from "@/lib/formatters";

interface Props {
  month: string;
}

export default function AllowanceWidget({ month }: Props) {
  const { transactions, openAddModal } = useTx();

  const total = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "income" && t.category === "Phụ cấp" && t.date.startsWith(month))
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions, month]
  );

  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm flex items-center gap-1.5">
          💵 Phụ cấp tháng này
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">{formatVND(total)}</p>
      </div>
      <button
        onClick={() => openAddModal({ type: "income", category: "Phụ cấp" })}
        className="flex items-center gap-1 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full active:opacity-80"
      >
        <Plus size={13} />
        Thêm
      </button>
    </div>
  );
}
