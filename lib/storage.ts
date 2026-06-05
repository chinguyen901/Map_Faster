"use client";
import { Transaction } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getTodayISO } from "./formatters";

const STORAGE_KEY = "thu-chi-data";

export function loadTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : seedData();
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

export function addTransaction(
  transactions: Transaction[],
  data: Omit<Transaction, "id" | "createdAt">
): Transaction[] {
  const newTx: Transaction = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  const updated = [newTx, ...transactions];
  saveTransactions(updated);
  return updated;
}

export function deleteTransaction(transactions: Transaction[], id: string): Transaction[] {
  const updated = transactions.filter((t) => t.id !== id);
  saveTransactions(updated);
  return updated;
}

function seedData(): Transaction[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const prev = today.getMonth() === 0
    ? `${y - 1}-12`
    : `${y}-${String(today.getMonth()).padStart(2, "0")}`;

  const make = (
    type: Transaction["type"],
    category: string,
    amount: number,
    note: string,
    dateStr: string
  ): Transaction => ({
    id: uuidv4(),
    type,
    category,
    amount,
    note,
    date: dateStr,
    createdAt: new Date().toISOString(),
  });

  const data: Transaction[] = [
    make("income", "Lương", 15_000_000, "Lương tháng này", `${y}-${m}-01`),
    make("expense", "Ăn uống", 120_000, "Cơm trưa văn phòng", `${y}-${m}-02`),
    make("expense", "Di chuyển", 50_000, "Grab đi làm", `${y}-${m}-03`),
    make("expense", "Giải trí", 250_000, "Xem phim cuối tuần", `${y}-${m}-04`),
    make("expense", "Ăn uống", 85_000, "Cafe sáng", `${y}-${m}-05`),
    make("expense", "Mua sắm", 450_000, "Quần áo", `${y}-${m}-06`),
    make("income", "Thưởng", 2_000_000, "Thưởng KPI Q3", `${y}-${m}-07`),
    make("expense", "Hoá đơn", 300_000, "Điện tháng này", `${y}-${m}-08`),
    make("expense", "Y tế", 180_000, "Thuốc cảm", `${y}-${m}-10`),
    make("expense", "Ăn uống", 200_000, "Đi ăn cùng gia đình", `${y}-${m}-12`),
    make("income", "Lương", 15_000_000, "Lương tháng trước", `${prev}-01`),
    make("expense", "Ăn uống", 1_200_000, "Ăn uống tháng trước", `${prev}-15`),
    make("expense", "Giải trí", 620_000, "Giải trí tháng trước", `${prev}-20`),
    make("expense", "Di chuyển", 400_000, "Di chuyển tháng trước", `${prev}-22`),
  ];

  saveTransactions(data);
  return data;
}
