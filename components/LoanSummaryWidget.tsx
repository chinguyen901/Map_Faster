"use client";
import { useEffect, useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { fetchLoans } from "@/lib/api";
import { calcDueThisMonthTotal, isLoanActive } from "@/lib/calculations";
import { formatVND } from "@/lib/formatters";
import { Loan } from "@/types";

export default function LoanSummaryWidget() {
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    fetchLoans().then(setLoans);
  }, []);

  const activeLoans = useMemo(() => loans.filter(isLoanActive), [loans]);
  const dueThisMonth = useMemo(() => calcDueThisMonthTotal(loans), [loans]);

  if (activeLoans.length === 0) return null;

  return (
    <Link href="/loans" className="card p-4 flex items-center justify-between active:opacity-80 transition-opacity">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-lg flex-shrink-0">
          🏦
        </div>
        <div>
          <p className="font-bold text-[#1A1A2E] dark:text-white text-sm">Khoản vay</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {dueThisMonth > 0
              ? `Còn phải trả tháng này: ${formatVND(dueThisMonth)}`
              : `${activeLoans.length} khoản đang trả`}
          </p>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
    </Link>
  );
}
