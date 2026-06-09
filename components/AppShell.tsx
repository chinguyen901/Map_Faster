"use client";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import BottomNav from "./BottomNav";
import TransactionModal from "./TransactionModal";
import { Transaction, TransactionType } from "@/types";
import { fetchTransactions, createTransaction, updateTransaction, deleteTransactionById, fetchReminders } from "@/lib/api";
import { calcStreak, calcMonthSummary, getLast6Months } from "@/lib/calculations";

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
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

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

      const allTxs = [...newTxs, ...data];
      setTransactions(allTxs);
      setLoading(false);

      if (newTxs.length > 0) {
        setRecurringToast(`📅 Đã tự động thêm ${newTxs.length} giao dịch lặp lại tháng này`);
        setTimeout(() => setRecurringToast(null), 4000);
      }

      // Milestone detection
      if (typeof window !== "undefined") {
        const streak = calcStreak(allTxs);

        const streakMilestones = [
          { threshold: 30, key: "ms_s30", msg: "🏆 30 ngày streak! Bạn thật kiên trì tuyệt vời!" },
          { threshold: 7, key: "ms_s7", msg: "🔥 7 ngày liên tiếp! Tuyệt vời!" },
          { threshold: 3, key: "ms_s3", msg: "🔥 3 ngày liên tiếp! Hãy tiếp tục nhé!" },
        ];

        let milestoneMsg: string | null = null;
        for (const m of streakMilestones) {
          if (streak >= m.threshold && !localStorage.getItem(m.key)) {
            localStorage.setItem(m.key, "1");
            milestoneMsg = m.msg;
            break;
          }
        }

        // First positive month milestone
        if (!milestoneMsg) {
          const { balance } = calcMonthSummary(allTxs, currentMonth);
          if (balance > 0 && !localStorage.getItem("ms_fp")) {
            const prevMonths = getLast6Months().slice(0, 5);
            const hadPrevPositive = prevMonths.some((m) => calcMonthSummary(data, m).balance > 0);
            if (!hadPrevPositive) {
              localStorage.setItem("ms_fp", "1");
              milestoneMsg = "🎉 Tháng đầu tiên số dư dương! Chúc mừng bạn!";
            }
          }
        }

        if (milestoneMsg) {
          const msg = milestoneMsg;
          const delay = newTxs.length > 0 ? 5000 : 1500;
          setTimeout(() => {
            setMilestoneToast(msg);
            setTimeout(() => setMilestoneToast(null), 4500);
          }, delay);
        }
      }

      // Reminder check — show once per day
      const todayKey = `reminders_shown_${new Date().toISOString().split("T")[0]}`;
      if (typeof window !== "undefined" && !localStorage.getItem(todayKey)) {
        fetchReminders().then((reminders) => {
          const today = new Date();
          const todayDay = today.getDate();
          const dueSoon = reminders.filter((r) => {
            if (!r.isActive) return false;
            const thisMonthDate = new Date(today.getFullYear(), today.getMonth(), r.dayOfMonth);
            const diff = Math.ceil((thisMonthDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diff >= 0 && diff <= 3;
          });
          if (dueSoon.length > 0) {
            localStorage.setItem(todayKey, "1");
            const names = dueSoon.map((r) => r.name).join(", ");
            const msg = dueSoon.length === 1
              ? `🔔 ${names} đến hạn ${dueSoon[0].dayOfMonth === todayDay ? "hôm nay" : "trong " + Math.ceil((new Date(today.getFullYear(), today.getMonth(), dueSoon[0].dayOfMonth).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + " ngày"}!`
              : `🔔 ${dueSoon.length} hoá đơn sắp đến hạn: ${names}`;
            const delay = 2500;
            setTimeout(() => {
              setReminderToast(msg);
              setTimeout(() => setReminderToast(null), 5000);
            }, delay);
          }
        });
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
      {milestoneToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[360px] w-[90vw] bg-gradient-to-r from-[#1E90FF] to-[#1565C0] text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl text-center animate-bounce">
          {milestoneToast}
        </div>
      )}
      {reminderToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[360px] w-[90vw] bg-[#FF9800] text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl text-center">
          {reminderToast}
        </div>
      )}
    </TxContext.Provider>
  );
}
