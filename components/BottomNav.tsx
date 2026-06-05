"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, BarChart2, Settings, Plus } from "lucide-react";

interface Props {
  onAddClick: () => void;
}

const navItems = [
  { href: "/", icon: Home, label: "Tổng quan" },
  { href: "/transactions", icon: List, label: "Giao dịch" },
  { href: "/charts", icon: BarChart2, label: "Biểu đồ" },
  { href: "/settings", icon: Settings, label: "Cài đặt" },
];

export default function BottomNav({ onAddClick }: Props) {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 z-50 shadow-lg">
      <div className="flex items-center justify-around h-16 px-2 relative">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px]">
              <Icon size={22} className={active ? "text-[#1E90FF]" : "text-gray-400"} />
              <span className={`text-[10px] font-medium ${active ? "text-[#1E90FF]" : "text-gray-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* FAB Button */}
        <button
          onClick={onAddClick}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-[#1E90FF] shadow-lg shadow-blue-300 -mt-6 active:scale-95 transition-transform"
          aria-label="Thêm giao dịch"
        >
          <Plus size={28} className="text-white" strokeWidth={2.5} />
        </button>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px]">
              <Icon size={22} className={active ? "text-[#1E90FF]" : "text-gray-400"} />
              <span className={`text-[10px] font-medium ${active ? "text-[#1E90FF]" : "text-gray-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
