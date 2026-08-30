import { ViolationStats } from "./types";

interface Props {
  stats: ViolationStats | null;
}

/**
 * ViolationsPage istatistik ozeti (bugun + toplam onaylar).
 * PageHeader actions prop icin kullanilir.
 */
export function ViolationStatsHeader({ stats }: Props) {
  return (
    <div className="flex gap-4">
      <div className="text-center px-4 py-1 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="text-xl font-bold text-gray-800">{stats?.todayCount ?? "—"}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Bugün</div>
      </div>
      <div className="text-center px-4 py-1 bg-red-50 border border-red-100 rounded-lg shadow-sm">
        <div className="text-xl font-bold text-red-600">{stats?.confirmedViolations ?? "—"}</div>
        <div className="text-[10px] text-red-500 uppercase tracking-wider font-semibold">Toplam Onaylı</div>
      </div>
    </div>
  );
}
