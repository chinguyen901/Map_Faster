"use client";
import { Transaction, Loan, Budget } from "@/types";

export async function fetchTransactions(month?: string): Promise<Transaction[]> {
  const url = month ? `/api/transactions?month=${month}` : "/api/transactions";
  const res = await fetch(url, { credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return []; }
  if (!res.ok) return [];
  const rows = await res.json();
  // Normalize DB row → Transaction type
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    type: r.type as Transaction["type"],
    category: r.category as string,
    amount: Number(r.amount),
    note: (r.note as string) ?? "",
    date: (r.date as string).slice(0, 10), // date field may include time
    createdAt: r.createdAt as string,
  }));
}

export async function createTransaction(data: {
  type: Transaction["type"];
  category: string;
  amount: number;
  note: string;
  date: string;
}): Promise<Transaction | null> {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  const r = await res.json();
  return {
    id: r.id,
    type: r.type,
    category: r.category,
    amount: Number(r.amount),
    note: r.note ?? "",
    date: r.date.slice(0, 10),
    createdAt: r.createdAt,
  };
}

export async function updateTransaction(id: string, data: {
  type: Transaction["type"];
  category: string;
  amount: number;
  note: string;
  date: string;
}): Promise<Transaction | null> {
  const res = await fetch(`/api/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  const r = await res.json();
  return {
    id: r.id,
    type: r.type,
    category: r.category,
    amount: Number(r.amount),
    note: r.note ?? "",
    date: r.date.slice(0, 10),
    createdAt: r.createdAt,
  };
}

export async function deleteTransactionById(id: string): Promise<boolean> {
  const res = await fetch(`/api/transactions/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  window.location.href = "/login";
}

function normalizeLoan(r: Record<string, unknown>): Loan {
  return {
    id: r.id as string,
    name: r.name as string,
    lenderType: r.lenderType as Loan["lenderType"],
    principal: Number(r.principal),
    monthlyPayment: Number(r.monthlyPayment),
    totalMonths: Number(r.totalMonths),
    monthsPaid: Number(r.monthsPaid),
    startMonth: r.startMonth as string,
    dueDay: Number(r.dueDay),
    note: (r.note as string) ?? "",
    createdAt: r.createdAt as string,
  };
}

export async function fetchLoans(): Promise<Loan[]> {
  const res = await fetch("/api/loans", { credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return []; }
  if (!res.ok) return [];
  const rows = await res.json();
  return rows.map(normalizeLoan);
}

export async function createLoan(data: Omit<Loan, "id" | "createdAt">): Promise<Loan | null> {
  const res = await fetch("/api/loans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeLoan(await res.json());
}

export async function updateLoan(id: string, data: Omit<Loan, "id" | "createdAt">): Promise<Loan | null> {
  const res = await fetch(`/api/loans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeLoan(await res.json());
}

export async function deleteLoanById(id: string): Promise<boolean> {
  const res = await fetch(`/api/loans/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}

export async function confirmLoanPayment(id: string): Promise<Loan | null> {
  const res = await fetch(`/api/loans/${id}/pay`, {
    method: "POST",
    credentials: "include",
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeLoan(await res.json());
}

function normalizeBudget(r: Record<string, unknown>): Budget {
  return {
    id: r.id as string,
    category: r.category as string,
    amount: Number(r.amount),
    month: r.month as string,
    createdAt: r.createdAt as string,
  };
}

export async function fetchBudgets(month: string): Promise<Budget[]> {
  const res = await fetch(`/api/budgets?month=${month}`, { credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return []; }
  if (!res.ok) return [];
  return (await res.json()).map(normalizeBudget);
}

export async function upsertBudget(data: { category: string; amount: number; month: string }): Promise<Budget | null> {
  const res = await fetch("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeBudget(await res.json());
}

export async function deleteBudgetById(id: string): Promise<boolean> {
  const res = await fetch(`/api/budgets/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}
