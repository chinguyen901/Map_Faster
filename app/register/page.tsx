"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Phone, Mail, Lock, ChevronLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Mật khẩu xác nhận không khớp"); return; }
    if (password.length < 6) { setError("Mật khẩu phải có ít nhất 6 ký tự"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push(`/verify-otp?purpose=register&userId=${data.userId}&email=${encodeURIComponent(data.email)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#1E90FF] flex flex-col">
      <div className="flex items-center px-5 pt-14 pb-6">
        <button onClick={() => router.back()} className="p-2 text-white/80">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center pr-8">
          <span className="text-white font-extrabold text-lg">Tạo tài khoản</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-6">
        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center">
          <span className="text-3xl font-black text-white">₫</span>
        </div>
      </div>

      <div className="bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl">
        <h2 className="text-[#1A1A2E] font-bold text-xl mb-6">Đăng ký</h2>

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
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              placeholder="Email (nhận mã OTP)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-50 rounded-2xl pl-11 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Mật khẩu (ít nhất 6 ký tự)"
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
              placeholder="Xác nhận mật khẩu"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full bg-gray-50 rounded-2xl pl-11 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E90FF] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-60 mt-2"
          >
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-[#1E90FF] font-semibold">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
