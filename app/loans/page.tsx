"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Loan } from "@/types";
import { fetchLoans, createLoan, updateLoan, deleteLoanById, confirmLoanPayment } from "@/lib/api";
import { calcTotalRemainingDebt, calcLoanStatus } from "@/lib/calculations";
import { formatVND } from "@/lib/formatters";
import LoanItem from "@/components/LoanItem";
import LoanModal from "@/components/LoanModal";

export default function LoansPage() {
  const router = useRouter();
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

  const openAdd = useCallback(() => {
    setEditingLoan(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((loan: Loan) => {
    setEditingLoan(loan);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: Omit<Loan, "id" | "createdAt">) => {
      if (editingLoan) {
        const updated = await updateLoan(editingLoan.id, data);
        if (updated) setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await createLoan(data);
        if (created) setLoans((prev) => [created, ...prev]);
      }
    },
    [editingLoan]
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Xoá khoản vay này?")) return;
    const ok = await deleteLoanById(id);
    if (ok) setLoans((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleConfirmPayment = useCallback(async (id: string) => {
    const updated = await confirmLoanPayment(id);
    if (updated) setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  const activeLoans = loans.filter((l) => l.monthsPaid < l.totalMonths);
  const unpaidThisMonth = loans
    .filter((l) => { const { status } = calcLoanStatus(l); return status === "due" || status === "overdue"; })
    .reduce((sum, l) => sum + l.monthlyPayment, 0);
  const totalDebt = calcTotalRemainingDebt(loans);

  return (
    <div className="min-h-screen bg-[#F0F8FF]">
      {/* Header */}
      <div className="bg-[#1E90FF] rounded-b-[32px] px-5 safe-header pb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/20 active:bg-white/30 transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Khoản Vay</h1>
          <button
            onClick={openAdd}
            className="ml-auto p-2 rounded-full bg-white/20 active:bg-white/30 transition-colors"
            aria-label="Thêm khoản vay"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/15 rounded-2xl px-4 py-3">
            <p className="text-xs text-white/70 font-semibold">Còn phải trả tháng này</p>
            <p className="text-lg font-extrabold mt-0.5">{formatVND(unpaidThisMonth)}</p>
            {unpaidThisMonth === 0 && activeLoans.length > 0 && (
              <p className="text-[10px] text-green-200 mt-0.5">✅ Tháng này đã trả hết</p>
            )}
          </div>
          <div className="bg-white/15 rounded-2xl px-4 py-3">
            <p className="text-xs text-white/70 font-semibold">Tổng còn phải trả</p>
            <p className="text-lg font-extrabold mt-0.5">{formatVND(totalDebt)}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 pb-8 space-y-3 max-w-[430px] mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#1E90FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">🏦</span>
            <p className="text-gray-500 font-semibold">Chưa có khoản vay nào</p>
            <p className="text-sm text-gray-400 mt-1">Nhấn + để thêm khoản vay đầu tiên</p>
            <button
              onClick={openAdd}
              className="mt-5 px-6 py-3 bg-[#1E90FF] text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-200 active:scale-[0.98] transition-transform"
            >
              Thêm khoản vay
            </button>
          </div>
        ) : (
          <>
            {activeLoans.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Đang trả nợ ({activeLoans.length})
                </p>
                <div className="space-y-3">
                  {activeLoans.map((loan) => (
                    <LoanItem
                      key={loan.id}
                      loan={loan}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onConfirmPayment={handleConfirmPayment}
                    />
                  ))}
                </div>
              </div>
            )}

            {loans.filter((l) => l.monthsPaid >= l.totalMonths).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">
                  Đã trả hết
                </p>
                <div className="space-y-3">
                  {loans
                    .filter((l) => l.monthsPaid >= l.totalMonths)
                    .map((loan) => (
                      <LoanItem
                        key={loan.id}
                        loan={loan}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <LoanModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingLoan(null); }}
        onSave={handleSave}
        editingLoan={editingLoan}
      />
    </div>
  );
}
