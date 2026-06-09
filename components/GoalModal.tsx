"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Goal } from "@/types";
import { formatVND, getCurrentMonth } from "@/lib/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Goal, "id" | "createdAt">) => void;
  onDelete?: (id: string) => void;
  editingGoal?: Goal | null;
}

const DEFAULT_FORM = {
  name: "",
  targetAmount: "",
  savedAmount: "0",
  deadline: "",
  note: "",
};

export default function GoalModal({ open, onClose, onSave, onDelete, editingGoal }: Props) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const isEditing = !!editingGoal;

  useEffect(() => {
    if (editingGoal) {
      setForm({
        name: editingGoal.name,
        targetAmount: editingGoal.targetAmount.toLocaleString("vi-VN"),
        savedAmount: editingGoal.savedAmount.toLocaleString("vi-VN"),
        deadline: editingGoal.deadline ?? "",
        note: editingGoal.note,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [editingGoal, open]);

  function handleVNDInput(field: "targetAmount" | "savedAmount", val: string) {
    const digits = val.replace(/\D/g, "");
    const num = parseInt(digits, 10);
    setForm((f) => ({ ...f, [field]: isNaN(num) ? "" : num.toLocaleString("vi-VN") }));
  }

  const targetNum = parseInt(form.targetAmount.replace(/\D/g, ""), 10) || 0;
  const savedNum = parseInt(form.savedAmount.replace(/\D/g, ""), 10) || 0;
  const remaining = Math.max(0, targetNum - savedNum);
  const progress = targetNum > 0 ? Math.min(100, Math.round((savedNum / targetNum) * 100)) : 0;

  function monthsUntilDeadline(): number | null {
    if (!form.deadline) return null;
    const [dy, dm] = form.deadline.split("-").map(Number);
    const now = new Date();
    const months = (dy - now.getFullYear()) * 12 + (dm - (now.getMonth() + 1));
    return months > 0 ? months : null;
  }

  const months = monthsUntilDeadline();
  const monthlyNeeded = months && remaining > 0 ? Math.ceil(remaining / months) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !targetNum) return;
    onSave({
      name: form.name,
      targetAmount: targetNum,
      savedAmount: savedNum,
      deadline: form.deadline || null,
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
              {isEditing ? "Sửa mục tiêu" : "Thêm mục tiêu"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 space-y-4" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên mục tiêu</label>
              <input
                type="text"
                placeholder="VD: Mua xe máy, Sửa nhà, Du lịch..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Target amount */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Số tiền cần đạt</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.targetAmount}
                  onChange={(e) => handleVNDInput("targetAmount", e.target.value)}
                  required
                  className="w-full text-2xl font-bold text-[#1A1A2E] border-b-2 border-[#1E90FF] bg-transparent pb-2 pr-8 outline-none placeholder-gray-300"
                />
                <span className="absolute right-0 bottom-2.5 text-lg font-bold text-gray-400">đ</span>
              </div>
            </div>

            {/* Saved amount */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Đã tiết kiệm được</label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.savedAmount}
                  onChange={(e) => handleVNDInput("savedAmount", e.target.value)}
                  className="w-full text-2xl font-bold text-[#1A1A2E] border-b-2 border-gray-200 bg-transparent pb-2 pr-8 outline-none placeholder-gray-300"
                />
                <span className="absolute right-0 bottom-2.5 text-lg font-bold text-gray-400">đ</span>
              </div>
            </div>

            {/* Progress preview */}
            {targetNum > 0 && (
              <div className="bg-blue-50 rounded-2xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Tiến độ</span>
                  <span className="text-sm font-extrabold text-[#1E90FF]">{progress}%</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1E90FF] rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {remaining > 0 && (
                  <p className="text-xs text-gray-500">Còn cần: <span className="font-bold text-gray-700">{formatVND(remaining)}</span></p>
                )}
                {monthlyNeeded && (
                  <p className="text-xs text-[#4CAF50] font-semibold">
                    💰 Cần tiết kiệm ~{formatVND(monthlyNeeded)}/tháng để đúng hạn
                  </p>
                )}
              </div>
            )}

            {/* Deadline */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hạn chót (tuỳ chọn)</label>
              <input
                type="month"
                value={form.deadline}
                min={getCurrentMonth()}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
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

            <button
              type="submit"
              className="w-full py-4 rounded-2xl text-white font-bold text-base active:scale-[0.98] shadow-lg bg-[#1E90FF] shadow-blue-200"
            >
              {isEditing ? "Cập nhật mục tiêu" : "Lưu mục tiêu"}
            </button>

            {isEditing && onDelete && editingGoal && (
              <button
                type="button"
                onClick={() => { onDelete(editingGoal.id); onClose(); }}
                className="w-full py-3.5 rounded-2xl text-[#F44336] font-semibold text-sm bg-red-50 active:bg-red-100"
              >
                Xoá mục tiêu
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
