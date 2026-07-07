"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import LoanItem from "@/components/LoanItem";
import LoanModal from "@/components/LoanModal";
import { fetchLoans, createLoan, updateLoan, deleteLoanById, confirmLoanPayment } from "@/lib/api";
import { calcDueThisMonthTotal } from "@/lib/calculations";
import { formatVND } from "@/lib/formatters";
import { Loan } from "@/types";

function LoansContent() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  useEffect(() => {
    fetchLoans().then((data) => {
      setLoans(data);
      setLoading(false);
    });
  }, []);

  const dueThisMonth = useMemo(() => calcDueThisMonthTotal(loans), [loans]);

  const openAdd = useCallback(() => {
    setEditingLoan(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((loan: Loan) => {
    setEditingLoan(loan);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async (data: Omit<Loan, "id" | "createdAt">): Promise<boolean> => {
    if (editingLoan) {
      const updated = await updateLoan(editingLoan.id, data);
      if (!updated) return false;
      setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } else {
      const created = await createLoan(data);
      if (!created) return false;
      setLoans((prev) => [created, ...prev]);
    }
    setModalOpen(false);
    setEditingLoan(null);
    return true;
  }, [editingLoan]);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await deleteLoanById(id);
    if (ok) setLoans((prev) => prev.filter((l) => l.id !== id));
    setModalOpen(false);
    setEditingLoan(null);
  }, []);

  const handleConfirmPay = useCallback(async (id: string) => {
    const updated = await confirmLoanPayment(id);
    if (updated) setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  return (
    <div className="min-h-screen bg-[#F0F8FF] dark:bg-[#0D1117]">
      <div className="bg-[#1E90FF] safe-header pb-6 px-5 rounded-b-[32px]">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/settings" className="p-1 text-white"><ChevronLeft size={20} /></Link>
          <h1 className="text-white font-extrabold text-xl">Khoản vay</h1>
        </div>
        <div className="bg-white/15 rounded-2xl px-4 py-3">
          <p className="text-blue-100 text-xs">Còn phải trả tháng này</p>
          <p className="text-white font-extrabold text-xl mt-0.5">{formatVND(dueThisMonth)}</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-3">
        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#1E90FF]/40 text-[#1E90FF] text-sm font-semibold active:bg-blue-50 dark:active:bg-blue-950/30 transition-colors"
        >
          <Plus size={16} /> Thêm khoản vay
        </button>

        {!loading && loans.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-4xl mb-3">🏦</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Chưa có khoản vay nào</p>
          </div>
        )}

        {loans.map((loan) => (
          <LoanItem key={loan.id} loan={loan} onEdit={openEdit} onDelete={handleDelete} onConfirmPay={handleConfirmPay} />
        ))}
      </div>

      <LoanModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingLoan(null); }}
        onSave={handleSave}
        onDelete={editingLoan ? () => handleDelete(editingLoan.id) : undefined}
        editingLoan={editingLoan}
      />
    </div>
  );
}

export default function LoansPage() {
  return (
    <AppShell>
      <LoansContent />
    </AppShell>
  );
}
