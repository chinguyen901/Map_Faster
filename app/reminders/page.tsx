"use client";
import { useState, useEffect } from "react";
import { Plus, ChevronLeft, Pencil, Bell, BellOff } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import ReminderModal from "@/components/ReminderModal";
import { Reminder } from "@/types";
import { fetchReminders, createReminder, updateReminder, deleteReminderById } from "@/lib/api";
import { formatVND } from "@/lib/formatters";

function getDaysUntil(dayOfMonth: number): number {
  const today = new Date();
  const thisMonthDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  const diff = Math.ceil((thisMonthDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff >= 0) return diff;
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
  return Math.ceil((nextMonthDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ReminderCard({ reminder, onEdit, onToggle }: {
  reminder: Reminder;
  onEdit: (r: Reminder) => void;
  onToggle: (r: Reminder) => void;
}) {
  const days = getDaysUntil(reminder.dayOfMonth);
  const isUrgent = days <= 3;
  const isToday = days === 0;

  return (
    <div className={`card p-4 ${!reminder.isActive ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          !reminder.isActive ? "bg-gray-100 dark:bg-gray-700" :
          isToday ? "bg-red-100 dark:bg-red-900/30" :
          isUrgent ? "bg-orange-100 dark:bg-orange-900/30" :
          "bg-blue-50 dark:bg-blue-950/30"
        }`}>
          {reminder.isActive
            ? <Bell size={18} className={isToday ? "text-[#F44336]" : isUrgent ? "text-[#FF9800]" : "text-[#1E90FF]"} />
            : <BellOff size={18} className="text-gray-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[#1A1A2E] dark:text-white text-sm">{reminder.name}</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Ngày {reminder.dayOfMonth} hằng tháng</p>
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              <button
                onClick={() => onToggle(reminder)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200"
              >
                {reminder.isActive
                  ? <Bell size={14} className="text-[#1E90FF]" />
                  : <BellOff size={14} className="text-gray-400" />
                }
              </button>
              <button
                onClick={() => onEdit(reminder)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200"
              >
                <Pencil size={14} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            {reminder.isActive && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isToday ? "bg-red-100 dark:bg-red-900/30 text-[#F44336]" :
                isUrgent ? "bg-orange-100 dark:bg-orange-900/30 text-[#FF9800]" :
                "bg-blue-50 dark:bg-blue-950/30 text-[#1E90FF]"
              }`}>
                {isToday ? "🔴 Đến hạn hôm nay!" : isUrgent ? `🟠 Còn ${days} ngày` : `Còn ${days} ngày`}
              </span>
            )}
            {reminder.amountEstimate && (
              <span className="text-[10px] text-gray-500 font-semibold">
                ~{formatVND(reminder.amountEstimate)}
              </span>
            )}
          </div>

          {reminder.note ? (
            <p className="text-[10px] text-gray-400 mt-1">{reminder.note}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RemindersContent() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    fetchReminders().then((data) => {
      setReminders(data);
      setLoading(false);
    });
  }, []);

  const dueCount = reminders.filter((r) => r.isActive && getDaysUntil(r.dayOfMonth) <= 3).length;

  async function handleSave(data: Omit<Reminder, "id" | "createdAt">) {
    if (editingReminder) {
      const updated = await updateReminder(editingReminder.id, data);
      if (updated) setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const created = await createReminder(data);
      if (created) setReminders((prev) => [...prev, created].sort((a, b) => a.dayOfMonth - b.dayOfMonth));
    }
  }

  async function handleDelete(id: string) {
    const ok = await deleteReminderById(id);
    if (ok) setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleToggle(reminder: Reminder) {
    const updated = await updateReminder(reminder.id, { ...reminder, isActive: !reminder.isActive });
    if (updated) setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  function openAdd() { setEditingReminder(null); setModalOpen(true); }
  function openEdit(r: Reminder) { setEditingReminder(r); setModalOpen(true); }

  return (
    <div className="min-h-screen bg-[#F0F8FF] dark:bg-[#0D1117]">
      {/* Header */}
      <div className="bg-[#1E90FF] safe-header pb-6 px-5 rounded-b-[32px]">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/settings" className="p-1.5 rounded-full bg-white/20 active:bg-white/30">
            <ChevronLeft size={20} className="text-white" />
          </Link>
          <div>
            <h1 className="text-white font-extrabold text-xl">Nhắc nhở hoá đơn</h1>
            <p className="text-blue-100 text-sm">
              {dueCount > 0
                ? `🔔 ${dueCount} hoá đơn sắp đến hạn`
                : `${reminders.filter((r) => r.isActive).length} nhắc nhở đang hoạt động`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-3 pb-32">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
        ) : reminders.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-gray-600 dark:text-gray-300 font-semibold text-sm">Chưa có nhắc nhở nào</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Nhấn + để thêm nhắc nhở đầu tiên</p>
          </div>
        ) : (
          reminders.map((r) => (
            <ReminderCard key={r.id} reminder={r} onEdit={openEdit} onToggle={handleToggle} />
          ))
        )}

        {reminders.length > 0 && (
          <div className="text-xs text-gray-400 text-center px-4 pb-2">
            App sẽ nhắc bạn khi mở ứng dụng trong vòng 3 ngày trước hạn
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-[#1E90FF] shadow-lg shadow-blue-300 flex items-center justify-center active:scale-95 transition-transform z-40"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom) + 16px)" }}
      >
        <Plus size={28} className="text-white" strokeWidth={2.5} />
      </button>

      <ReminderModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingReminder(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        editingReminder={editingReminder}
      />
    </div>
  );
}

export default function RemindersPage() {
  return (
    <AppShell>
      <RemindersContent />
    </AppShell>
  );
}
