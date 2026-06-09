"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Lock, Eye, EyeOff } from "lucide-react";
import { Suspense } from "react";

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const resetToken = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Mật khẩu xác nhận không khớp"); return; }
    if (password.length < 6) { setError("Mật khẩu phải có ít nhất 6 ký tự"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#1E90FF] flex flex-col">
      <div className="flex items-center px-5 safe-auth-nav pb-6">
        <button onClick={() => router.back()} className="p-2 text-white/80"><ChevronLeft size={24} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mb-4">
          <Lock size={28} className="text-white" />
        </div>
        <h1 className="text-white font-extrabold text-2xl">Đặt mật khẩu mới</h1>
        <p className="text-blue-100 text-sm mt-2">Nhập mật khẩu mới cho tài khoản của bạn</p>
      </div>

      <div className="bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl">
        {done ? (
          <div className="py-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="font-bold text-[#1A1A2E] text-lg">Đổi mật khẩu thành công!</p>
            <p className="text-gray-500 text-sm mt-2">Đang chuyển đến trang đăng nhập...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">{error}</div>
            )}

            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Mật khẩu mới"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 rounded-2xl pl-11 pr-12 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Xác nhận mật khẩu mới"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full bg-gray-50 rounded-2xl pl-11 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E90FF] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? "Đang lưu..." : "Đặt mật khẩu mới"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
