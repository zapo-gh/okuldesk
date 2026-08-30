import { ClipboardList, UserPlus } from "lucide-react";
import { Button } from '../../../components/ui/Button';

type Tab = "entry" | "history";

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

/**
 * ViolationsPage ana sekme cesidi (Yeni Ihlal Kaydi / Ihlal Gecmisi).
 */
export function ViolationTabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-center">
      <div className="inline-flex bg-gray-200/70 p-1.5 rounded-xl shadow-inner gap-2 w-full md:w-auto">
        <Button
          variant="ghost"
          onClick={() => onTabChange("entry")}
          className={`flex-1 md:flex-none relative flex items-center justify-center gap-2 px-8 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
            activeTab === "entry"
              ? "bg-white text-indigo-700 shadow-[0_2px_8px_rgb(0,0,0,0.08)] ring-1 ring-black/5 scale-100"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-200/50 scale-95"
          }`}
        >
          <UserPlus size={18} className={activeTab === "entry" ? "text-indigo-600" : "text-gray-400"} />
          <span>Yeni İhlal Kaydı</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => onTabChange("history")}
          className={`flex-1 md:flex-none relative flex items-center justify-center gap-2 px-8 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
            activeTab === "history"
              ? "bg-white text-indigo-700 shadow-[0_2px_8px_rgb(0,0,0,0.08)] ring-1 ring-black/5 scale-100"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-200/50 scale-95"
          }`}
        >
          <ClipboardList size={18} className={activeTab === "history" ? "text-indigo-600" : "text-gray-400"} />
          <span>İhlal Geçmişi</span>
        </Button>
      </div>
    </div>
  );
}
