import { ClipboardList, UserPlus } from "lucide-react";

type Tab = "entry" | "history";

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

/**
 * ViolationsPage ana sekme çubuğu (Yeni İhlal Kaydı / İhlal Geçmişi).
 */
export function ViolationTabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex justify-center">
      <div className="inline-flex bg-slate-200/80 p-1 rounded-xl gap-1.5 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onTabChange("entry")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "entry"
              ? "bg-white text-indigo-700 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <UserPlus size={15} className={activeTab === "entry" ? "text-indigo-600" : "text-slate-400"} />
          <span>Yeni İhlal Kaydı</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("history")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-white text-indigo-700 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <ClipboardList size={15} className={activeTab === "history" ? "text-indigo-600" : "text-slate-400"} />
          <span>İhlal Geçmişi & Sorgu</span>
        </button>
      </div>
    </div>
  );
}
