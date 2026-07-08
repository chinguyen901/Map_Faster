"use client";
import { Transaction, Budget, Loan, BeDailyTarget, BeeFixedItem } from "@/types";

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
    date: (r.date as string).slice(0, 10),
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

// --- Loans ---

function normalizeLoan(r: Record<string, unknown>): Loan {
  return {
    id: r.id as string,
    name: r.name as string,
    lenderType: r.lenderType as Loan["lenderType"],
    principal: Number(r.principal),
    monthlyPayment: r.monthlyPayment != null ? Number(r.monthlyPayment) : null,
    totalMonths: r.totalMonths != null ? Number(r.totalMonths) : null,
    monthsPaid: Number(r.monthsPaid),
    startMonth: r.startMonth as string,
    dueDay: r.dueDay != null ? Number(r.dueDay) : null,
    paidAmount: Number(r.paidAmount ?? 0),
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

export async function confirmLoanPayment(id: string, amount?: number): Promise<Loan | null> {
  const res = await fetch(`/api/loans/${id}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(amount != null ? { amount } : {}),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeLoan(await res.json());
}

// --- Beepartner weekly daily targets ---

function normalizeBeDailyTarget(r: Record<string, unknown>): BeDailyTarget {
  return {
    id: r.id as string,
    date: (r.date as string).slice(0, 10),
    targetAmount: Number(r.targetAmount),
    createdAt: r.createdAt as string,
  };
}

export async function fetchBeDailyTargets(start: string, end: string): Promise<BeDailyTarget[]> {
  const res = await fetch(`/api/be-targets?start=${start}&end=${end}`, { credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return []; }
  if (!res.ok) return [];
  return (await res.json()).map(normalizeBeDailyTarget);
}

export async function upsertBeDailyTarget(date: string, targetAmount: number): Promise<BeDailyTarget | null> {
  const res = await fetch("/api/be-targets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ date, targetAmount }),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeBeDailyTarget(await res.json());
}

// --- Beepartner fixed income/expense items (auto-calc monthly target) ---

function normalizeBeeFixedItem(r: Record<string, unknown>): BeeFixedItem {
  return {
    id: r.id as string,
    type: r.type as BeeFixedItem["type"],
    name: r.name as string,
    amount: Number(r.amount),
    createdAt: r.createdAt as string,
  };
}

export async function fetchBeeFixedItems(): Promise<BeeFixedItem[]> {
  const res = await fetch("/api/bee-fixed-items", { credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return []; }
  if (!res.ok) return [];
  return (await res.json()).map(normalizeBeeFixedItem);
}

export async function createBeeFixedItem(data: { type: BeeFixedItem["type"]; name: string; amount: number }): Promise<BeeFixedItem | null> {
  const res = await fetch("/api/bee-fixed-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeBeeFixedItem(await res.json());
}

export async function updateBeeFixedItem(id: string, data: { name: string; amount: number }): Promise<BeeFixedItem | null> {
  const res = await fetch(`/api/bee-fixed-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeBeeFixedItem(await res.json());
}

export async function deleteBeeFixedItemById(id: string): Promise<boolean> {
  const res = await fetch(`/api/bee-fixed-items/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}

// --- User Profile / bePartner ---

export interface UserProfile {
  phone: string;
  bePartnerPhone: string | null;
  bePartnerMonthlyTarget: number | null;
  bePartnerSavingsBuffer: number | null;
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  const res = await fetch("/api/user/me", { credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return res.json();
}

export async function linkBeepartner(phone: string): Promise<boolean> {
  const res = await fetch("/api/user/beepartner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ phone }),
  });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}

export async function unlinkBeepartner(): Promise<boolean> {
  const res = await fetch("/api/user/beepartner", {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}

export async function updateBeepartnerTarget(target: number | null): Promise<boolean> {
  const res = await fetch("/api/user/beepartner", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ monthlyTarget: target }),
  });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}

export async function updateBeepartnerSavingsBuffer(buffer: number | null): Promise<boolean> {
  const res = await fetch("/api/user/beepartner", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ savingsBuffer: buffer }),
  });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}
