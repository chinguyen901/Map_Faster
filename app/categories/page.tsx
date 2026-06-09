"use client";
import { useState, useEffect } from "react";
import { Plus, ChevronLeft, Pencil } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import CustomCategoryModal from "@/components/CustomCategoryModal";
import { CustomCategory } from "@/types";
import {
  fetchCustomCategories,
  createCustomCategory,
  updateCustomCategory,
  deleteCustomCategoryById,
} from "@/lib/api";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/types";

function CategoryCard({ cat, onEdit }: { cat: CustomCategory; onEdit: (c: CustomCategory) => void }) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-[#161B27] rounded-2xl px-4 py-3 shadow-sm">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: cat.color + "22" }}
      >
        {cat.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1A1A2E] dark:text-white text-sm">{cat.name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {cat.type === "expense" ? "Chi tiêu" : "Thu nhập"}
        </p>
      </div>
      <button
        onClick={() => onEdit(cat)}
        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 shrink-0"
      >
        <Pencil size={14} className="text-gray-400" />
      </button>
    </div>
  );
}

function DefaultCategoryChip({ icon, name, color }: { icon: string; name: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-white dark:bg-[#161B27] rounded-xl px-2.5 py-1.5 shadow-sm">
      <span className="text-base">{icon}</span>
      <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{name}</span>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
    </div>
  );
}

function CategoriesContent() {
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CustomCategory | null>(null);
  const [defaultType, setDefaultType] = useState<"income" | "expense">("expense");

  useEffect(() => {
    fetchCustomCategories().then((data) => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  async function handleSave(data: Omit<CustomCategory, "id" | "createdAt">) {
    if (editingCat) {
      const updated = await updateCustomCategory(editingCat.id, data);
      if (updated) setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      const created = await createCustomCategory(data);
      if (created) setCategories((prev) => [...prev, created]);
    }
  }

  async function handleDelete(id: string) {
    const ok = await deleteCustomCategoryById(id);
    if (ok) setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function openAdd(type: "income" | "expense") {
    setDefaultType(type);
    setEditingCat(null);
    setModalOpen(true);
  }

  function openEdit(cat: CustomCategory) {
    setEditingCat(cat);
    setModalOpen(true);
  }

  const customExpense = categories.filter((c) => c.type === "expense");
  const customIncome = categories.filter((c) => c.type === "income");

  return (
    <div className="min-h-screen bg-[#F0F8FF] dark:bg-[#0D1117]">
      {/* Header */}
      <div className="bg-[#1E90FF] safe-header pb-6 px-5 rounded-b-[32px]">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/settings" className="p-1.5 rounded-full bg-white/20 active:bg-white/30">
            <ChevronLeft size={20} className="text-white" />
          </Link>
          <div>
            <h1 className="text-white font-extrabold text-xl">Danh mục tùy chỉnh</h1>
            <p className="text-blue-100 text-sm">{categories.length} danh mục đã thêm</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 pb-28">
        {/* Default categories info */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Danh mục mặc định (không thể xoá)</p>
          <div>
            <p className="text-[11px] font-semibold text-[#F44336] mb-1.5">Chi tiêu</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {EXPENSE_CATEGORIES.map((c) => (
                <DefaultCategoryChip key={c.name} icon={c.icon} name={c.name} color={c.color} />
              ))}
            </div>
            <p className="text-[11px] font-semibold text-[#4CAF50] mb-1.5">Thu nhập</p>
            <div className="flex flex-wrap gap-1.5">
              {INCOME_CATEGORIES.map((c) => (
                <DefaultCategoryChip key={c.name} icon={c.icon} name={c.name} color={c.color} />
              ))}
            </div>
          </div>
        </div>

        {/* Custom expense categories */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm">Chi tiêu tùy chỉnh</h2>
            <button
              onClick={() => openAdd("expense")}
              className="flex items-center gap-1 text-[#1E90FF] text-xs font-semibold py-1 px-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-full active:bg-blue-100"
            >
              <Plus size={12} /> Thêm
            </button>
          </div>
          {loading ? (
            <div className="text-center py-4 text-gray-400 text-xs">Đang tải...</div>
          ) : customExpense.length === 0 ? (
            <div className="card p-4 text-center">
              <p className="text-gray-400 text-xs">Chưa có danh mục chi tiêu nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customExpense.map((c) => <CategoryCard key={c.id} cat={c} onEdit={openEdit} />)}
            </div>
          )}
        </div>

        {/* Custom income categories */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-[#1A1A2E] dark:text-white text-sm">Thu nhập tùy chỉnh</h2>
            <button
              onClick={() => openAdd("income")}
              className="flex items-center gap-1 text-[#4CAF50] text-xs font-semibold py-1 px-2.5 bg-green-50 dark:bg-green-950/30 rounded-full active:bg-green-100"
            >
              <Plus size={12} /> Thêm
            </button>
          </div>
          {!loading && customIncome.length === 0 ? (
            <div className="card p-4 text-center">
              <p className="text-gray-400 text-xs">Chưa có danh mục thu nhập nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customIncome.map((c) => <CategoryCard key={c.id} cat={c} onEdit={openEdit} />)}
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-3 text-xs text-blue-600 dark:text-blue-300">
          💡 Danh mục tùy chỉnh sẽ xuất hiện cuối danh sách khi thêm giao dịch
        </div>
      </div>

      <CustomCategoryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCat(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        editingCategory={editingCat}
        defaultType={defaultType}
      />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <AppShell>
      <CategoriesContent />
    </AppShell>
  );
}
