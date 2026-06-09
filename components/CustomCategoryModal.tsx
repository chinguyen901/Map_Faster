"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { CustomCategory } from "@/types";
import { PRESET_COLORS, EXPENSE_EMOJI_SUGGESTIONS, INCOME_EMOJI_SUGGESTIONS } from "@/lib/categories";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<CustomCategory, "id" | "createdAt">) => void;
  onDelete?: (id: string) => void;
  editingCategory?: CustomCategory | null;
  defaultType?: "income" | "expense";
}

const DEFAULT_FORM = {
  type: "expense" as "income" | "expense",
  name: "",
  icon: "💰",
  color: "#1E90FF",
};

export default function CustomCategoryModal({ open, onClose, onSave, onDelete, editingCategory, defaultType }: Props) {
  const [form, setForm] = useState({ ...DEFAULT_FORM, type: defaultType ?? "expense" });
  const isEditing = !!editingCategory;

  useEffect(() => {
    if (editingCategory) {
      setForm({
        type: editingCategory.type,
        name: editingCategory.name,
        icon: editingCategory.icon,
        color: editingCategory.color,
      });
    } else {
      setForm({ ...DEFAULT_FORM, type: defaultType ?? "expense" });
    }
  }, [editingCategory, open, defaultType]);

  const emojiSuggestions = form.type === "expense" ? EXPENSE_EMOJI_SUGGESTIONS : INCOME_EMOJI_SUGGESTIONS;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.icon) return;
    onSave({ type: form.type, name: form.name.trim(), icon: form.icon, color: form.color });
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
              {isEditing ? "Sửa danh mục" : "Thêm danh mục"}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 space-y-4" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            {/* Type toggle */}
            {!editingCategory && (
              <div className="flex rounded-2xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    form.type === "expense" ? "bg-[#F44336] text-white shadow" : "text-gray-500"
                  }`}
                >
                  Chi tiêu
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: "income" }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    form.type === "income" ? "bg-[#4CAF50] text-white shadow" : "text-gray-500"
                  }`}
                >
                  Thu nhập
                </button>
              </div>
            )}

            {/* Preview */}
            <div className="flex items-center justify-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
                style={{ backgroundColor: form.color + "22" }}
              >
                {form.icon}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên danh mục</label>
              <input
                type="text"
                placeholder="VD: Cà phê, Thú cưng, Freelance..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                maxLength={30}
                className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Icon picker */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Biểu tượng (Emoji)</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Take only the last character entered (to handle emoji replacement)
                    const chars = [...val];
                    if (chars.length > 0) setForm((f) => ({ ...f, icon: chars[chars.length - 1] }));
                  }}
                  className="w-16 h-12 text-2xl text-center bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-200"
                />
                <span className="text-xs text-gray-400">hoặc chọn nhanh:</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {emojiSuggestions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                      form.icon === emoji
                        ? "bg-blue-100 ring-2 ring-[#1E90FF] scale-110"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Màu sắc</label>
              <div className="mt-2 flex flex-wrap gap-2.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className="w-8 h-8 rounded-full transition-all active:scale-90"
                    style={{
                      backgroundColor: color,
                      outline: form.color === color ? `3px solid ${color}` : "none",
                      outlineOffset: "2px",
                      transform: form.color === color ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl text-white font-bold text-base active:scale-[0.98] shadow-lg"
              style={{ backgroundColor: form.type === "expense" ? "#F44336" : "#4CAF50" }}
            >
              {isEditing ? "Cập nhật danh mục" : "Thêm danh mục"}
            </button>

            {isEditing && onDelete && editingCategory && (
              <button
                type="button"
                onClick={() => { onDelete(editingCategory.id); onClose(); }}
                className="w-full py-3.5 rounded-2xl text-[#F44336] font-semibold text-sm bg-red-50 active:bg-red-100"
              >
                Xoá danh mục
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
