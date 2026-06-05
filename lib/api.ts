"use client";
import { Transaction } from "@/types";

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
