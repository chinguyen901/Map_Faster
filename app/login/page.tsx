"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Phone, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#1E90FF] flex flex-col">
      {/* Top brand area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 pt-16">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-4">
          <span className="text-4xl font-black text-white">₫</span>
        </div>
        <h1 className="text-white font-extrabold text-2xl">Thu Chi Tiết Kiệm</h1>
        <p className="text-blue-100 text-sm mt-1">Quản lý tài chính cá nhân</p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl">
        <h2 className="text-[#1A1A2E] font-bold text-xl mb-6">Đăng nhập</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="relative">
            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full bg-gray-50 rounded-2xl pl-11 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-50 rounded-2xl pl-11 pr-12 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-[#1E90FF] font-medium">
              Quên mật khẩu?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E90FF] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-60 mt-2"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-[#1E90FF] font-semibold">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
