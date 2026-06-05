"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import AppShell, { useTx } from "@/components/AppShell";
import TransactionItem from "@/components/TransactionItem";
import { formatMonth, getCurrentMonth } from "@/lib/formatters";
import { getMonthTransactions, calcMonthSummary } from "@/lib/calculations";
import { formatVND } from "@/lib/formatters";

function TransactionsContent() {
  const { transactions, deleteById } = useTx();
  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const monthTxs = useMemo(() => getMonthTransactions(transactions, month), [transactions, month]);
  const summary = useMemo(() => calcMonthSummary(transactions, month), [transactions, month]);

  const filtered = useMemo(() => {
    return monthTxs
      .filter((t) => filter === "all" || t.type === filter)
      .filter((t) =>
        search === "" ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.note.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTxs, filter, search]);

  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="min-h-screen bg-[#F0F8FF]">
      {/* Header */}
      <div className="bg-[#1E90FF] pt-12 pb-6 px-5 rounded-b-[32px]">
        <h1 className="text-white font-extrabold text-xl mb-4">Giao dịch</h1>

        {/* Summary row */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-white/15 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-blue-100 text-[10px]">Tổng thu</p>
            <p className="text-white font-bold text-sm">{formatVND(summary.totalIncome)}</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-blue-100 text-[10px]">Tổng chi</p>
            <p className="text-white font-bold text-sm">{formatVND(summary.totalExpense)}</p>
          </div>
          <div className="flex-1 bg-white/15 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-blue-100 text-[10px]">Số dư</p>
            <p className={`font-bold text-sm ${summary.balance >= 0 ? "text-green-200" : "text-red-200"}`}>
              {formatVND(summary.balance)}
            </p>
          </div>
        </div>

        {/* Month picker */}
        <div className="flex items-center justify-between bg-white/20 rounded-2xl px-4 py-2">
          <button onClick={prevMonth} className="p-1 text-white"><ChevronLeft size={18} /></button>
          <span className="text-white font-semibold text-sm">{formatMonth(month)}</span>
          <button onClick={nextMonth} className="p-1 text-white"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm giao dịch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white rounded-2xl pl-9 pr-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "income", "expense"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                filter === f
                  ? f === "all"
                    ? "bg-[#1E90FF] text-white"
                    : f === "income"
                    ? "bg-[#4CAF50] text-white"
                    : "bg-[#F44336] text-white"
                  : "bg-white text-gray-500"
              }`}
            >
              {f === "all" ? "Tất cả" : f === "income" ? "Thu" : "Chi"}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} giao dịch</span>
        </div>

        {/* List */}
        {filtered.length > 0 ? (
          <div className="card p-4 divide-y divide-gray-50">
            {filtered.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} onDelete={deleteById} />
            ))}
          </div>
        ) : (
          <div className="card p-10 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-gray-400 text-sm">Không tìm thấy giao dịch</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <AppShell>
      <TransactionsContent />
    </AppShell>
  );
}
