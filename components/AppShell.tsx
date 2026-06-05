"use client";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import BottomNav from "./BottomNav";
import TransactionModal from "./TransactionModal";
import { Transaction, TransactionType } from "@/types";
import { fetchTransactions, createTransaction, deleteTransactionById } from "@/lib/api";

interface TxContextType {
  transactions: Transaction[];
  loading: boolean;
  deleteById: (id: string) => void;
}

export const TxContext = createContext<TxContextType>({
  transactions: [],
  loading: true,
  deleteById: () => {},
});
export const useTx = () => useContext(TxContext);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchTransactions().then((data) => {
      setTransactions(data);
      setLoading(false);
    });
  }, []);

  const handleAdd = useCallback(
    async (data: { type: TransactionType; category: string; amount: number; note: string; date: string }) => {
      const created = await createTransaction(data);
      if (created) setTransactions((prev) => [created, ...prev]);
    },
    []
  );

  const deleteById = useCallback(async (id: string) => {
    const ok = await deleteTransactionById(id);
    if (ok) setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TxContext.Provider value={{ transactions, loading, deleteById }}>
      <div className="safe-bottom">{children}</div>
      <BottomNav onAddClick={() => setModalOpen(true)} />
      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />
    </TxContext.Provider>
  );
}
