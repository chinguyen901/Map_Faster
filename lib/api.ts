"use client";
import { Transaction, Loan, Budget, Goal, Reminder, CustomCategory } from "@/types";

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
    isRecurring: (r.isRecurring as boolean) ?? false,
    recurringDay: r.recurringDay != null ? Number(r.recurringDay) : null,
    createdAt: r.createdAt as string,
  }));
}

export async function createTransaction(data: {
  type: Transaction["type"];
  category: string;
  amount: number;
  note: string;
  date: string;
  isRecurring?: boolean;
  recurringDay?: number | null;
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
    isRecurring: r.isRecurring ?? false,
    recurringDay: r.recurringDay != null ? Number(r.recurringDay) : null,
    createdAt: r.createdAt,
  };
}

export async function updateTransaction(id: string, data: {
  type: Transaction["type"];
  category: string;
  amount: number;
  note: string;
  date: string;
  isRecurring?: boolean;
  recurringDay?: number | null;
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
    isRecurring: r.isRecurring ?? false,
    recurringDay: r.recurringDay != null ? Number(r.recurringDay) : null,
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

// --- Goals ---

function normalizeGoal(r: Record<string, unknown>): Goal {
  return {
    id: r.id as string,
    name: r.name as string,
    targetAmount: Number(r.targetAmount),
    savedAmount: Number(r.savedAmount ?? 0),
    deadline: (r.deadline as string | null) ?? null,
    note: (r.note as string) ?? "",
    createdAt: r.createdAt as string,
  };
}

export async function fetchGoals(): Promise<Goal[]> {
  const res = await fetch("/api/goals", { credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return []; }
  if (!res.ok) return [];
  return (await res.json()).map(normalizeGoal);
}

export async function createGoal(data: Omit<Goal, "id" | "createdAt">): Promise<Goal | null> {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeGoal(await res.json());
}

export async function updateGoal(id: string, data: Omit<Goal, "id" | "createdAt">): Promise<Goal | null> {
  const res = await fetch(`/api/goals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeGoal(await res.json());
}

export async function deleteGoalById(id: string): Promise<boolean> {
  const res = await fetch(`/api/goals/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}

// --- Reminders ---

function normalizeReminder(r: Record<string, unknown>): Reminder {
  return {
    id: r.id as string,
    name: r.name as string,
    dayOfMonth: Number(r.dayOfMonth),
    amountEstimate: r.amountEstimate != null ? Number(r.amountEstimate) : null,
    isActive: Boolean(r.isActive ?? true),
    note: (r.note as string) ?? "",
    createdAt: r.createdAt as string,
  };
}

export async function fetchReminders(): Promise<Reminder[]> {
  const res = await fetch("/api/reminders", { credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return []; }
  if (!res.ok) return [];
  return (await res.json()).map(normalizeReminder);
}

export async function createReminder(data: Omit<Reminder, "id" | "createdAt">): Promise<Reminder | null> {
  const res = await fetch("/api/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeReminder(await res.json());
}

export async function updateReminder(id: string, data: Omit<Reminder, "id" | "createdAt">): Promise<Reminder | null> {
  const res = await fetch(`/api/reminders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeReminder(await res.json());
}

export async function deleteReminderById(id: string): Promise<boolean> {
  const res = await fetch(`/api/reminders/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}

// --- Custom Categories ---

function normalizeCustomCategory(r: Record<string, unknown>): CustomCategory {
  return {
    id: r.id as string,
    type: r.type as CustomCategory["type"],
    name: r.name as string,
    icon: r.icon as string,
    color: r.color as string,
    createdAt: r.createdAt as string,
  };
}

export async function fetchCustomCategories(): Promise<CustomCategory[]> {
  const res = await fetch("/api/categories", { credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return []; }
  if (!res.ok) return [];
  return (await res.json()).map(normalizeCustomCategory);
}

export async function createCustomCategory(data: Omit<CustomCategory, "id" | "createdAt">): Promise<CustomCategory | null> {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeCustomCategory(await res.json());
}

export async function updateCustomCategory(id: string, data: Omit<CustomCategory, "id" | "createdAt">): Promise<CustomCategory | null> {
  const res = await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  return normalizeCustomCategory(await res.json());
}

export async function deleteCustomCategoryById(id: string): Promise<boolean> {
  const res = await fetch(`/api/categories/${id}`, {
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
  telegramLinked: boolean;
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

// --- Telegram Bot ---

export async function getTelegramLinkUrl(): Promise<string | null> {
  const res = await fetch("/api/telegram/link", { credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) return null;
  const data = await res.json();
  return data.url ?? null;
}

export async function unlinkTelegram(): Promise<boolean> {
  const res = await fetch("/api/telegram/link", { method: "DELETE", credentials: "include" });
  if (res.status === 401) { window.location.href = "/login"; return false; }
  return res.ok;
}
