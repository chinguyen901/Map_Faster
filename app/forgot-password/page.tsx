"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Phone } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push(`/verify-otp?purpose=reset&userId=${data.userId ?? ""}&email=${encodeURIComponent(data.email)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#1E90FF] flex flex-col">
      <div className="flex items-center px-5 pt-14 pb-6">
        <button onClick={() => router.back()} className="p-2 text-white/80"><ChevronLeft size={24} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mb-4">
          <span className="text-3xl font-black text-white">🔑</span>
        </div>
        <h1 className="text-white font-extrabold text-2xl">Quên mật khẩu?</h1>
        <p className="text-blue-100 text-sm mt-2 max-w-xs">
          Nhập số điện thoại đã đăng ký, chúng tôi sẽ gửi mã OTP về email của bạn
        </p>
      </div>

      <div className="bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">{error}</div>
          )}

          <div className="relative">
            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Số điện thoại đã đăng ký"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full bg-gray-50 rounded-2xl pl-11 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E90FF] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? "Đang gửi..." : "Gửi mã OTP"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Nhớ mật khẩu rồi?{" "}
          <Link href="/login" className="text-[#1E90FF] font-semibold">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
