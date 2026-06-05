"use client";
import { useState } from "react";
import { Trash2, Download, Info, Shield, LogOut } from "lucide-react";
import AppShell, { useTx } from "@/components/AppShell";
import { logout } from "@/lib/api";
import { formatVND } from "@/lib/formatters";
import { calcMonthSummary, getLast6Months } from "@/lib/calculations";

function SettingsContent() {
  const { transactions } = useTx();
  const [showConfirm, setShowConfirm] = useState(false);

  const last6 = getLast6Months();
  const currentMonthSummary = calcMonthSummary(transactions, last6[5]);

  function handleExport() {
    const data = JSON.stringify(transactions, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thu-chi-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    // No longer uses localStorage — deletion is handled per-transaction
    alert("Để xoá dữ liệu, hãy xoá từng giao dịch trong trang Giao dịch.");
  }

  return (
    <div className="min-h-screen bg-[#F0F8FF]">
      <div className="bg-[#1E90FF] pt-12 pb-6 px-5 rounded-b-[32px]">
        <h1 className="text-white font-extrabold text-xl">Cài đặt</h1>
        <p className="text-blue-100 text-sm mt-1">{transactions.length} giao dịch đã lưu</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="card p-4">
          <h2 className="font-bold text-[#1A1A2E] text-sm mb-3 flex items-center gap-2">
            <Info size={16} className="text-[#1E90FF]" /> Thống kê tổng
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F0F8FF] rounded-xl p-3">
              <p className="text-xs text-gray-500">Số giao dịch</p>
              <p className="font-bold text-[#1A1A2E] text-lg">{transactions.length}</p>
            </div>
            <div className="bg-[#F0F8FF] rounded-xl p-3">
              <p className="text-xs text-gray-500">Số dư tháng này</p>
              <p className={`font-bold text-lg ${currentMonthSummary.balance >= 0 ? "text-[#4CAF50]" : "text-[#F44336]"}`}>
                {formatVND(currentMonthSummary.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* PWA instructions */}
        <div className="card p-4">
          <h2 className="font-bold text-[#1A1A2E] text-sm mb-3 flex items-center gap-2">
            <Shield size={16} className="text-[#1E90FF]" /> Thêm vào màn hình chính (iOS)
          </h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex gap-2"><span className="font-bold text-[#1E90FF] w-5">1.</span>Mở app trong Safari</div>
            <div className="flex gap-2"><span className="font-bold text-[#1E90FF] w-5">2.</span>Nhấn nút Chia sẻ (□↑) ở thanh dưới</div>
            <div className="flex gap-2"><span className="font-bold text-[#1E90FF] w-5">3.</span>Chọn <strong>Thêm vào màn hình chính</strong></div>
            <div className="flex gap-2"><span className="font-bold text-[#1E90FF] w-5">4.</span>Nhấn <strong>Thêm</strong> — xong!</div>
          </div>
          <div className="mt-3 bg-blue-50 rounded-xl p-3 text-xs text-blue-600">
            💡 App sẽ hiển thị như app thật, không có thanh địa chỉ Safari
          </div>
        </div>

        {/* Actions */}
        <div className="card p-4 space-y-3">
          <h2 className="font-bold text-[#1A1A2E] text-sm mb-1">Dữ liệu</h2>
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 py-3.5 px-4 bg-[#F0F8FF] rounded-2xl active:bg-blue-50 transition-colors"
          >
            <Download size={18} className="text-[#1E90FF]" />
            <span className="text-sm font-semibold text-[#1A1A2E]">Xuất dữ liệu (JSON)</span>
          </button>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full flex items-center gap-3 py-3.5 px-4 bg-red-50 rounded-2xl active:bg-red-100 transition-colors"
            >
              <Trash2 size={18} className="text-[#F44336]" />
              <span className="text-sm font-semibold text-[#F44336]">Xoá toàn bộ dữ liệu</span>
            </button>
          ) : (
            <div className="bg-red-50 rounded-2xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-3">Bạn chắc chắn muốn xoá hết dữ liệu?</p>
              <div className="flex gap-2">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600">
                  Huỷ
                </button>
                <button onClick={handleClear} className="flex-1 py-2.5 rounded-xl bg-[#F44336] text-sm font-bold text-white">
                  Xoá hết
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 py-3.5 px-4 bg-gray-50 rounded-2xl active:bg-gray-100 transition-colors"
        >
          <LogOut size={18} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Đăng xuất</span>
        </button>

        <p className="text-center text-xs text-gray-400 pb-2 mt-2">
          Thu Chi Tiết Kiệm v2.0 · Dữ liệu lưu trên cloud
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}
