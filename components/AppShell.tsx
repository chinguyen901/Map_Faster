"use client";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import BottomNav from "./BottomNav";
import TransactionModal from "./TransactionModal";
import { Transaction, TransactionType } from "@/types";
import { fetchTransactions, createTransaction, updateTransaction, deleteTransactionById, fetchUserProfile } from "@/lib/api";

interface ModalDefaults {
  type?: TransactionType;
  category?: string;
}

interface TxContextType {
  transactions: Transaction[];
  loading: boolean;
  deleteById: (id: string) => void;
  openEditModal: (tx: Transaction) => void;
  openAddModal: (defaults?: ModalDefaults) => void;
  bePartnerPhone: string | null;
  bePartnerMonthlyTarget: number | null;
  setBePartnerMonthlyTarget: (target: number | null) => void;
}

export const TxContext = createContext<TxContextType>({
  transactions: [],
  loading: true,
  deleteById: () => {},
  openEditModal: () => {},
  openAddModal: () => {},
  bePartnerPhone: null,
  bePartnerMonthlyTarget: null,
  setBePartnerMonthlyTarget: () => {},
});
export const useTx = () => useContext(TxContext);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalDefaults, setModalDefaults] = useState<ModalDefaults>({});
  const [bePartnerPhone, setBePartnerPhone] = useState<string | null>(null);
  const [bePartnerMonthlyTarget, setBePartnerMonthlyTarget] = useState<number | null>(null);

  useEffect(() => {
    fetchUserProfile().then((profile) => {
      if (profile) {
        setBePartnerPhone(profile.bePartnerPhone);
        setBePartnerMonthlyTarget(profile.bePartnerMonthlyTarget);
      }
    });
    fetchTransactions().then((data) => {
      setTransactions(data);
      setLoading(false);
    });
  }, []);

  const openAddModal = useCallback((defaults?: ModalDefaults) => {
    setEditingTransaction(null);
    setModalDefaults(defaults ?? {});
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
    async (data: { type: TransactionType; category: string; amount: number; note: string; date: string }) => {
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
    <TxContext.Provider value={{ transactions, loading, deleteById, openEditModal, openAddModal, bePartnerPhone, bePartnerMonthlyTarget, setBePartnerMonthlyTarget }}>
      <div className="safe-bottom">{children}</div>
      <BottomNav onAddClick={() => openAddModal()} />
      <TransactionModal
        open={modalOpen}
        onClose={handleClose}
        onSave={handleSave}
        editingTransaction={editingTransaction}
        initialType={modalDefaults.type}
        initialCategory={modalDefaults.category}
      />
    </TxContext.Provider>
  );
}
