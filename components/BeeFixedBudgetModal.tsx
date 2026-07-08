"use client";
import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useTx } from "@/components/AppShell";
import {
  fetchBeeFixedItems, createBeeFixedItem, deleteBeeFixedItemById,
  updateBeepartnerTarget, updateBeepartnerSavingsBuffer, fetchBudgets,
} from "@/lib/api";
import { formatVND, formatVNDShort, getCurrentMonth } from "@/lib/formatters";
import { BeeFixedItem, Budget, EXPENSE_CATEGORIES } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const DEFAULT_SAVINGS_BUFFER = 2_000_000;

function parseAmountInput(val: string): string {
  const digits = val.replace(/\D/g, "");
  const num = parseInt(digits, 10);
  return isNaN(num) ? "" : num.toLocaleString("vi-VN");
}

function getLastMonthStr(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ItemSection({
  title, items, onAdd, onDelete,
}: {
  title: string;
  items: BeeFixedItem[];
  onAdd: (name: string, amount: number) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  function handleAdd() {
    const amountNum = parseInt(amount.replace(/\D/g, ""), 10) || 0;
    if (!name.trim() || amountNum <= 0) return;
    onAdd(name.trim(), amountNum);
    setName("");
    setAmount("");
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
            <span className="text-sm text-[#1A1A2E] dark:text-white">{item.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{formatVND(item.amount)}</span>
              <button onClick={() => onDelete(item.id)} className="p-1 text-gray-300 hover:text-red-400" aria-label="Xoá">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          placeholder="Tên khoản (VD: Lương)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Số tiền"
          value={amount}
          onChange={(e) => setAmount(parseAmountInput(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="w-28 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button onClick={handleAdd} className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#1E90FF] flex-shrink-0" aria-label="Thêm">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export default function BeeFixedBudgetModal({ open, onClose, onSaved }: Props) {
  const { transactions, bePartnerSavingsBuffer, setBePartnerSavingsBuffer, setBePartnerMonthlyTarget } = useTx();
  const [items, setItems] = useState<BeeFixedItem[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bufferInput, setBufferInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setBufferInput((bePartnerSavingsBuffer ?? DEFAULT_SAVINGS_BUFFER).toLocaleString("vi-VN"));
    setLoading(true);
    Promise.all([fetchBeeFixedItems(), fetchBudgets(getCurrentMonth())]).then(([itemRows, budgetRows]) => {
      setItems(itemRows);
      setBudgets(budgetRows);
      setLoading(false);
    });
  }, [open, bePartnerSavingsBuffer]);

  const incomeItems = useMemo(() => items.filter((i) => i.type === "income"), [items]);
  const expenseItems = useMemo(() => items.filter((i) => i.type === "expense"), [items]);
  const totalIncome = useMemo(() => incomeItems.reduce((s, i) => s + i.amount, 0), [incomeItems]);
  const totalExpense = useMemo(() => expenseItems.reduce((s, i) => s + i.amount, 0), [expenseItems]);
  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets]);
  const bufferNum = parseInt(bufferInput.replace(/\D/g, ""), 10) || 0;
  // Bee needs to cover whatever fixed income doesn't: (chi cố định + ngân sách danh mục + để dư) − thu cố định.
  const computedTarget = Math.max(0, totalExpense + totalBudget + bufferNum - totalIncome);
  const hasData = totalIncome > 0 || totalExpense > 0 || totalBudget > 0;

  // Suggest adding last month's actual spending (ăn uống, di chuyển, ...) as fixed-expense
  // items too — Bee needs to cover everyday living costs, not just rent/loan payments.
  // Reuses the same create-item flow as a manual add; skips categories already listed, and
  // skips categories that already have a "Ngân sách tháng này" budget set (§/charts) since
  // that's already summed into totalBudget above — avoids double-counting the same category.
  const lastMonthSuggestions = useMemo(() => {
    const lastMonth = getLastMonthStr();
    const existingNames = new Set(expenseItems.map((i) => i.name.trim().toLowerCase()));
    const budgetedCategories = new Set(budgets.map((b) => b.category.trim().toLowerCase()));
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense" || !t.date.startsWith(lastMonth)) continue;
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    }
    return Array.from(totals.entries())
      .filter(([category]) => {
        const key = category.trim().toLowerCase();
        return !existingNames.has(key) && !budgetedCategories.has(key);
      })
      .map(([category, amount]) => ({
        category,
        amount,
        icon: EXPENSE_CATEGORIES.find((c) => c.name === category)?.icon ?? "💰",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, expenseItems, budgets]);

  if (!open) return null;

  async function handleAddItem(type: BeeFixedItem["type"], name: string, amount: number) {
    const created = await createBeeFixedItem({ type, name, amount });
    if (created) setItems((prev) => [created, ...prev]);
  }

  async function handleDeleteItem(id: string) {
    const ok = await deleteBeeFixedItemById(id);
    if (ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const bufferOk = await updateBeepartnerSavingsBuffer(bufferNum);
    let targetOk = true;
    if (hasData) {
      targetOk = await updateBeepartnerTarget(computedTarget);
    }
    setSaving(false);
    if (!bufferOk || !targetOk) {
      setError("Lưu thất bại — vui lòng kiểm tra kết nối mạng và thử lại.");
      return;
    }
    setBePartnerSavingsBuffer(bufferNum);
    if (hasData) setBePartnerMonthlyTarget(computedTarget);
    onSaved?.();
    onClose();
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
            <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white">📋 Thu chi cố định</h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200">
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="px-5 space-y-5 overflow-y-auto flex-1">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-6">Đang tải...</p>
            ) : (
              <>
                <ItemSection
                  title="Thu Nhập Cố Định"
                  items={incomeItems}
                  onAdd={(name, amount) => handleAddItem("income", name, amount)}
                  onDelete={handleDeleteItem}
                />
                <ItemSection
                  title="Chi Tiêu Cố Định"
                  items={expenseItems}
                  onAdd={(name, amount) => handleAddItem("expense", name, amount)}
                  onDelete={handleDeleteItem}
                />
                {totalBudget > 0 && (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 rounded-xl px-3 py-2.5 -mt-2">
                    <span className="text-xs text-[#1E90FF] font-semibold">🎯 Ngân sách danh mục tháng này (từ Biểu đồ)</span>
                    <span className="text-sm font-bold text-[#1E90FF]">{formatVND(totalBudget)}</span>
                  </div>
                )}
                {lastMonthSuggestions.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1.5">💡 Chi tiêu thực tế tháng trước — thêm vào để Bee target tính luôn cả sinh hoạt:</p>
                    <div className="flex flex-wrap gap-2">
                      {lastMonthSuggestions.map((s) => (
                        <button
                          key={s.category}
                          onClick={() => handleAddItem("expense", s.category, s.amount)}
                          className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-[#1E90FF] text-xs font-semibold px-3 py-1.5 rounded-full active:opacity-80"
                        >
                          <Plus size={11} /> {s.icon} {s.category}: {formatVNDShort(s.amount)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tiền để dư mỗi tháng</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bufferInput}
                    onChange={(e) => setBufferInput(parseAmountInput(e.target.value))}
                    className="mt-1 w-full bg-gray-50 dark:bg-gray-800 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </>
            )}
          </div>

          <div className="px-5 pt-3 flex-shrink-0" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            <div className="bg-[#FFD700]/10 dark:bg-yellow-950/30 rounded-xl px-4 py-3 mb-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Target Bee tháng này (tự tính)</p>
              <p className="font-bold text-yellow-700 dark:text-yellow-400 text-lg mt-0.5">
                {hasData ? formatVND(computedTarget) : "Chưa đủ dữ liệu"}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {formatVND(totalExpense)} (chi cố định) + {formatVND(totalBudget)} (ngân sách danh mục tháng này) + {formatVND(bufferNum)} (để dư) − {formatVND(totalIncome)} (thu cố định)
              </p>
            </div>
            {error && (
              <p className="text-xs font-semibold text-[#F44336] bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2 mb-2">
                {error}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full bg-[#1E90FF] text-white font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
