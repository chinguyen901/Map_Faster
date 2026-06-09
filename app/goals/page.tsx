"use client";
import { useState, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, Pencil } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import GoalModal from "@/components/GoalModal";
import { Goal } from "@/types";
import { fetchGoals, createGoal, updateGoal, deleteGoalById } from "@/lib/api";
import { formatVND, formatVNDShort, getCurrentMonth } from "@/lib/formatters";

function daysUntilDeadline(deadline: string): number {
  const [dy, dm] = deadline.split("-").map(Number);
  const now = new Date();
  return (dy - now.getFullYear()) * 12 + (dm - (now.getMonth() + 1));
}

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: (g: Goal) => void }) {
  const progress = goal.targetAmount > 0
    ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
    : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const months = goal.deadline ? daysUntilDeadline(goal.deadline) : null;
  const monthlyNeeded = months && months > 0 && remaining > 0 ? Math.ceil(remaining / months) : null;
  const isDone = goal.savedAmount >= goal.targetAmount;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate">{goal.name}</h3>
            {isDone && <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold shrink-0">✅ Đạt!</span>}
          </div>
          {goal.deadline && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {months !== null && months > 0
                ? `Hạn chót: ${goal.deadline.replace("-", "/")} — còn ${months} tháng`
                : months === 0 ? "Đến hạn tháng này!"
                : "Đã qua hạn"}
            </p>
          )}
        </div>
        <button
          onClick={() => onEdit(goal)}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 ml-2 shrink-0"
        >
          <Pencil size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: isDone ? "#4CAF50" : progress >= 70 ? "#1E90FF" : "#FF9800",
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Đã tiết kiệm</p>
          <p className="font-bold text-sm text-[#4CAF50]">{formatVND(goal.savedAmount)}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-[#1E90FF]">{progress}%</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Mục tiêu</p>
          <p className="font-bold text-sm text-[#1A1A2E] dark:text-white">{formatVNDShort(goal.targetAmount)}</p>
        </div>
      </div>

      {monthlyNeeded && !isDone && (
        <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl px-3 py-2">
          <p className="text-[11px] text-[#1E90FF] font-semibold">
            💰 Cần tiết kiệm ~{formatVND(monthlyNeeded)}/tháng để đúng hạn
          </p>
        </div>
      )}

      {goal.note ? (
        <p className="text-[10px] text-gray-400 mt-1.5">{goal.note}</p>
      ) : null}
    </div>
  );
}

function GoalsContent() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals().then((data) => {
      setGoals(data);
      setLoading(false);
    });
  }, []);

  const totalTarget = useMemo(() => goals.reduce((s, g) => s + g.targetAmount, 0), [goals]);
  const totalSaved = useMemo(() => goals.reduce((s, g) => s + g.savedAmount, 0), [goals]);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  async function handleSave(data: Omit<Goal, "id" | "createdAt">) {
    if (editingGoal) {
      const updated = await updateGoal(editingGoal.id, data);
      if (updated) setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } else {
      const created = await createGoal(data);
      if (created) setGoals((prev) => [created, ...prev]);
    }
  }

  async function handleDelete(id: string) {
    const ok = await deleteGoalById(id);
    if (ok) setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  function openAdd() { setEditingGoal(null); setModalOpen(true); }
  function openEdit(g: Goal) { setEditingGoal(g); setModalOpen(true); }

  return (
    <div className="min-h-screen bg-[#F0F8FF] dark:bg-[#0D1117]">
      {/* Header */}
      <div className="bg-[#1E90FF] safe-header pb-6 px-5 rounded-b-[32px]">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/settings" className="p-1.5 rounded-full bg-white/20 active:bg-white/30">
            <ChevronLeft size={20} className="text-white" />
          </Link>
          <div>
            <h1 className="text-white font-extrabold text-xl">Mục tiêu tiết kiệm</h1>
            <p className="text-blue-100 text-sm">{goals.length} mục tiêu</p>
          </div>
        </div>

        {goals.length > 0 && (
          <div className="bg-white/15 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-blue-100 text-xs">Tổng tiến độ</span>
              <span className="text-white font-bold text-sm">{overallProgress}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-200 font-semibold">Đã: {formatVNDShort(totalSaved)}</span>
              <span className="text-blue-200">Mục tiêu: {formatVNDShort(totalTarget)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-3 pb-32">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
        ) : goals.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-gray-600 dark:text-gray-300 font-semibold text-sm">Chưa có mục tiêu nào</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Nhấn + để thêm mục tiêu tiết kiệm đầu tiên</p>
          </div>
        ) : (
          goals.map((g) => <GoalCard key={g.id} goal={g} onEdit={openEdit} />)
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

      <GoalModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingGoal(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        editingGoal={editingGoal}
      />
    </div>
  );
}

export default function GoalsPage() {
  return (
    <AppShell>
      <GoalsContent />
    </AppShell>
  );
}
