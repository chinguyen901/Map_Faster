export function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + " đ";
}

export function formatVNDShort(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(1) + " tỷ đ";
  }
  if (Math.abs(amount) >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1) + " tr đ";
  }
  return formatVND(amount);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  return `Tháng ${parseInt(month)}/${year}`;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}
