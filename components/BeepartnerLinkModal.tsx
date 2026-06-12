"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { linkBeepartner, unlinkBeepartner } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  linkedPhone: string | null;
  userPhone: string;
  onLink: (phone: string) => void;
  onUnlink: () => void;
}

export default function BeepartnerLinkModal({ open, onClose, linkedPhone, userPhone, onLink, onUnlink }: Props) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPhone(linkedPhone ?? userPhone);
      setError("");
    }
  }, [open, linkedPhone, userPhone]);

  if (!open) return null;

  async function handleLink() {
    const clean = phone.replace(/\s/g, "");
    if (!/^0\d{8,9}$/.test(clean)) {
      setError("Số điện thoại không hợp lệ (VD: 0912345678)");
      return;
    }
    setLoading(true);
    const ok = await linkBeepartner(clean);
    setLoading(false);
    if (ok) {
      onLink(clean);
      onClose();
    } else {
      setError("Liên kết thất bại, thử lại sau");
    }
  }

  async function handleUnlink() {
    setLoading(true);
    const ok = await unlinkBeepartner();
    setLoading(false);
    if (ok) {
      onUnlink();
      onClose();
    } else {
      setError("Huỷ liên kết thất bại, thử lại sau");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#161B27] rounded-t-3xl px-5 pt-5 pb-8 max-h-[90dvh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-extrabold text-lg text-[#1A1A2E] dark:text-white">
            🐝 Tài khoản Beepartner
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {linkedPhone ? (
          <>
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/40 rounded-2xl p-4 mb-5">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Đã liên kết tài khoản Be</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">SĐT: {linkedPhone}</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Thu nhập Be của bạn sẽ xuất hiện trong danh mục <strong>Be Income</strong>. Nhấn bên dưới để hủy liên kết.
            </p>
            {error && <p className="text-sm text-[#F44336] mb-3">{error}</p>}
            <button
              onClick={handleUnlink}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 text-[#F44336] font-bold text-sm active:opacity-80 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Hủy liên kết"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Nhập SĐT tài khoản Be của bạn. Sau khi liên kết, một danh mục <strong>Be Income</strong> sẽ được tạo tự động để theo dõi thu nhập.
            </p>

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Số điện thoại Be</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(""); }}
                placeholder="0912345678"
                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#0D1117] rounded-2xl px-4 py-3 text-base text-[#1A1A2E] dark:text-white focus:outline-none focus:border-[#1E90FF]"
              />
              {error && <p className="text-xs text-[#F44336] mt-1.5">{error}</p>}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 mb-5">
              <p className="text-xs text-blue-600 dark:text-blue-300">
                💡 Liên kết giúp app tạo danh mục riêng cho thu nhập Be. Bạn sẽ tự nhập số tiền sau mỗi chuyến/ngày làm việc.
              </p>
            </div>

            <button
              onClick={handleLink}
              disabled={loading || !phone.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#1E90FF] text-white font-bold text-sm active:opacity-80 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Xác nhận liên kết"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
