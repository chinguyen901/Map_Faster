"use client";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import BottomNav from "./BottomNav";
import TransactionModal from "./TransactionModal";
import { Transaction, TransactionType } from "@/types";
import { loadTransactions, addTransaction, deleteTransaction } from "@/lib/storage";

interface TxContextType {
  transactions: Transaction[];
  deleteById: (id: string) => void;
}

export const TxContext = createContext<TxContextType>({ transactions: [], deleteById: () => {} });
export const useTx = () => useContext(TxContext);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setTransactions(loadTransactions());
  }, []);

  const handleAdd = useCallback(
    (data: { type: TransactionType; category: string; amount: number; note: string; date: string }) => {
      setTransactions((prev) => addTransaction(prev, data));
    },
    []
  );

  const deleteById = useCallback((id: string) => {
    setTransactions((prev) => deleteTransaction(prev, id));
  }, []);

  return (
    <TxContext.Provider value={{ transactions, deleteById }}>
      <div className="safe-bottom">
        {children}
      </div>
      <BottomNav onAddClick={() => setModalOpen(true)} />
      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />
    </TxContext.Provider>
  );
}
