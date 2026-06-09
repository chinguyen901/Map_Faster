"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Mail } from "lucide-react";
import { Suspense } from "react";

function VerifyOTPContent() {
  const router = useRouter();
  const params = useSearchParams();
  const purpose = params.get("purpose") as "register" | "reset";
  const userId = params.get("userId") ?? "";
  const email = params.get("email") ?? "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  function handleChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) inputs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) inputs.current[idx - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) setOtp(text.split(""));
    e.preventDefault();
  }

  const handleSubmit = useCallback(async () => {
    const code = otp.join("");
    if (code.length < 6) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code, purpose }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setOtp(["","","","","",""]); inputs.current[0]?.focus(); return; }

      if (purpose === "register") {
        router.push("/");
        router.refresh();
      } else {
        router.push(`/reset-password?token=${data.resetToken}`);
      }
    } finally {
      setLoading(false);
    }
  }, [otp, userId, purpose, router]);

  useEffect(() => {
    if (otp.every(d => d !== "")) handleSubmit();
  }, [otp, handleSubmit]);

  async function handleResend() {
    if (cooldown > 0) return;
    const endpoint = purpose === "register" ? "/api/auth/register" : "/api/auth/forgot-password";
    await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(purpose === "register" ? { userId } : { userId }) });
    setCooldown(60);
    setOtp(["","","","","",""]);
    inputs.current[0]?.focus();
  }

  return (
    <div className="min-h-dvh bg-[#1E90FF] flex flex-col">
      <div className="flex items-center px-5 safe-auth-nav pb-6">
        <button onClick={() => router.back()} className="p-2 text-white/80"><ChevronLeft size={24} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mb-4">
          <Mail size={28} className="text-white" />
        </div>
        <h1 className="text-white font-extrabold text-2xl">Xác nhận OTP</h1>
        <p className="text-blue-100 text-sm mt-2 max-w-xs">
          Mã 6 chữ số đã được gửi đến<br />
          <strong className="text-white">{decodeURIComponent(email)}</strong>
        </p>
      </div>

      <div className="bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3 mb-4 text-center">
            {error}
          </div>
        )}

        {/* OTP inputs */}
        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-2xl border-2 outline-none transition-all ${
                digit ? "border-[#1E90FF] bg-blue-50 text-[#1E90FF]" : "border-gray-200 bg-gray-50"
              } focus:border-[#1E90FF]`}
            />
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || otp.some(d => !d)}
          className="w-full bg-[#1E90FF] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? "Đang xác nhận..." : "Xác nhận"}
        </button>

        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="w-full mt-3 py-3 text-sm font-medium text-gray-500 disabled:text-gray-300"
        >
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã OTP"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-2">Mã OTP có hiệu lực trong 5 phút</p>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense>
      <VerifyOTPContent />
    </Suspense>
  );
}
