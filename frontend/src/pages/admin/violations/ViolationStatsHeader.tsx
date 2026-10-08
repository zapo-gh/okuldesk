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
    <div className="flex gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur-sm shadow-sm">
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/70">Bugün:</span>
        <span className="text-sm font-bold">{stats?.todayCount ?? "—"}</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-400/40 bg-red-500/20 text-white backdrop-blur-sm shadow-sm">
        <span className="text-[11px] font-medium uppercase tracking-wider text-red-200">Onaylı:</span>
        <span className="text-sm font-bold">{stats?.confirmedViolations ?? "—"}</span>
      </div>
    </div>
  );
}
