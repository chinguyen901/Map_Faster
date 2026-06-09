"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Reminder } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Reminder, "id" | "createdAt">) => void;
  onDelete?: (id: string) => void;
  editingReminder?: Reminder | null;
}

const DEFAULT_FORM = {
  name: "",
  dayOfMonth: "1",
  amountEstimate: "",
  isActive: true,
  note: "",
};

export default function ReminderModal({ open, onClose, onSave, onDelete, editingReminder }: Props) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const isEditing = !!editingReminder;

  useEffect(() => {
    if (editingReminder) {
      setForm({
        name: editingReminder.name,
        dayOfMonth: String(editingReminder.dayOfMonth),
        amountEstimate: editingReminder.amountEstimate != null
          ? editingReminder.amountEstimate.toLocaleString("vi-VN")
          : "",
        isActive: editingReminder.isActive,
        note: editingReminder.note,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [editingReminder, open]);

  function handleAmountInput(val: string) {
    const digits = val.replace(/\D/g, "");
    const num = parseInt(digits, 10);
    setForm((f) => ({ ...f, amountEstimate: isNaN(num) ? "" : num.toLocaleString("vi-VN") }));
  }

  const dayNum = Math.min(Math.max(parseInt(form.dayOfMonth, 10) || 1, 1), 31);
  const amountNum = parseInt(form.amountEstimate.replace(/\D/g, ""), 10) || null;

  // Show when this reminder will next fire
  function nextDueDateText(): string {
    const today = new Date();
    const thisMonthDate = new Date(today.getFullYear(), today.getMonth(), dayNum);
    const daysUntil = Math.ceil((thisMonthDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil === 0) return "Đến hạn hôm nay!";
    if (daysUntil > 0 && daysUntil <= 31) return `Còn ${daysUntil} ngày (ngày ${dayNum} tháng này)`;
    const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, dayNum);
    const nextDays = Math.ceil((nextMonthDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return `Còn ${nextDays} ngày (ngày ${dayNum} tháng sau)`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !dayNum) return;
    onSave({
      name: form.name,
      dayOfMonth: dayNum,
      amountEstimate: amountNum,
      isActive: form.isActive,
      note: form.note,
    });
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
        <div
          className="w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl pointer-events-auto"
          style={{ maxHeight: "90dvh", overflowY: "auto" }}
        >
          <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-5 py-3 sticky top-5 bg-white z-10">
            <h2 className="text-lg font-bold text-[#1A1A2E]">
              {isEditing ? "Sửa nhắc nhở" : "Thêm nhắc nhở"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 space-y-4" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên nhắc nhở</label>
              <input
                type="text"
                placeholder="VD: Tiền điện, Tiền internet, Học phí..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Day of month */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày đến hạn hằng tháng</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    value={form.dayOfMonth}
                    onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                    required
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-2xl font-bold text-center outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 leading-relaxed">{nextDueDateText()}</p>
                </div>
              </div>
            </div>

            {/* Amount estimate */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Số tiền dự kiến (tuỳ chọn)</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.amountEstimate}
                  onChange={(e) => handleAmountInput(e.target.value)}
                  className="w-full text-xl font-bold text-[#1A1A2E] border-b-2 border-gray-200 bg-transparent pb-2 pr-8 outline-none placeholder-gray-300 focus:border-[#1E90FF]"
                />
                <span className="absolute right-0 bottom-2.5 text-base font-bold text-gray-400">đ</span>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ghi chú</label>
              <input
                type="text"
                placeholder="Thêm ghi chú..."
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-600">
              🔔 App sẽ nhắc bạn khi mở ứng dụng trong vòng 3 ngày trước hạn
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl text-white font-bold text-base active:scale-[0.98] shadow-lg bg-[#1E90FF] shadow-blue-200"
            >
              {isEditing ? "Cập nhật nhắc nhở" : "Lưu nhắc nhở"}
            </button>

            {isEditing && onDelete && editingReminder && (
              <button
                type="button"
                onClick={() => { onDelete(editingReminder.id); onClose(); }}
                className="w-full py-3.5 rounded-2xl text-[#F44336] font-semibold text-sm bg-red-50 active:bg-red-100"
              >
                Xoá nhắc nhở
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
