"use client";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import BottomNav from "./BottomNav";
import TransactionModal from "./TransactionModal";
import { Transaction, TransactionType } from "@/types";
import { fetchTransactions, createTransaction, updateTransaction, deleteTransactionById } from "@/lib/api";

function getRecurringDateForMonth(month: string, day: number): string {
  const [y, m] = month.split("-").map(Number);
  const maxDay = new Date(y, m, 0).getDate(); // last day of month
  const actualDay = Math.min(day, maxDay);
  return `${month}-${String(actualDay).padStart(2, "0")}`;
}

interface TxContextType {
  transactions: Transaction[];
  loading: boolean;
  deleteById: (id: string) => void;
  openEditModal: (tx: Transaction) => void;
}

export const TxContext = createContext<TxContextType>({
  transactions: [],
  loading: true,
  deleteById: () => {},
  openEditModal: () => {},
});
export const useTx = () => useContext(TxContext);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [recurringToast, setRecurringToast] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions().then(async (data) => {
      const today = new Date();
      const todayDay = today.getDate();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

      // Find distinct recurring patterns from all historical transactions
      const recurringTxs = data.filter((t) => t.isRecurring && t.recurringDay != null);
      const patternMap = new Map<string, Transaction>();
      for (const tx of recurringTxs) {
        const key = `${tx.type}|${tx.category}|${tx.amount}|${tx.recurringDay}`;
        if (!patternMap.has(key)) patternMap.set(key, tx);
      }

      // Check which patterns are missing from the current month
      const thisMonthRecurring = data.filter(
        (t) => t.isRecurring && t.date.startsWith(currentMonth)
      );

      const toCreate: Transaction[] = [];
      for (const [key, template] of patternMap) {
        const alreadyExists = thisMonthRecurring.some(
          (t) => `${t.type}|${t.category}|${t.amount}|${t.recurringDay}` === key
        );
        if (!alreadyExists && template.recurringDay! <= todayDay) {
          toCreate.push(template);
        }
      }

      // Auto-create missing recurring transactions
      const newTxs: Transaction[] = [];
      for (const template of toCreate) {
        const date = getRecurringDateForMonth(currentMonth, template.recurringDay!);
        const created = await createTransaction({
          type: template.type,
          category: template.category,
          amount: template.amount,
          note: template.note,
          date,
          isRecurring: true,
          recurringDay: template.recurringDay,
        });
        if (created) newTxs.push(created);
      }

      setTransactions([...newTxs, ...data]);
      setLoading(false);
      if (newTxs.length > 0) {
        setRecurringToast(`📅 Đã tự động thêm ${newTxs.length} giao dịch lặp lại tháng này`);
        setTimeout(() => setRecurringToast(null), 4000);
      }
    });
  }, []);

  const openAddModal = useCallback(() => {
    setEditingTransaction(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const handleSave = useCallback(
    async (data: { type: TransactionType; category: string; amount: number; note: string; date: string; isRecurring: boolean; recurringDay: number | null }) => {
      if (editingTransaction) {
        const updated = await updateTransaction(editingTransaction.id, data);
        if (updated) {
          setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }
      } else {
        const created = await createTransaction(data);
        if (created) setTransactions((prev) => [created, ...prev]);
      }
    },
    [editingTransaction]
  );

  const deleteById = useCallback(async (id: string) => {
    const ok = await deleteTransactionById(id);
    if (ok) setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TxContext.Provider value={{ transactions, loading, deleteById, openEditModal }}>
      <div className="safe-bottom">{children}</div>
      <BottomNav onAddClick={openAddModal} />
      <TransactionModal
        open={modalOpen}
        onClose={handleClose}
        onSave={handleSave}
        editingTransaction={editingTransaction}
      />
      {recurringToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[360px] w-[90vw] bg-[#1A1A2E] text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl text-center">
          {recurringToast}
        </div>
      )}
    </TxContext.Provider>
  );
}
