export const DEFAULT_PERIOD_TIMES: Record<number, string> = {
  1: '08:30 - 09:10',
  2: '09:20 - 10:00',
  3: '10:10 - 10:50',
  4: '11:00 - 11:40',
  5: '11:50 - 12:30',
  6: '13:40 - 14:20',
  7: '14:30 - 15:10',
  8: '15:20 - 16:00',
  9: '16:10 - 16:50',
  10: '16:55 - 17:35',
  11: '17:40 - 18:20',
};

const STORAGE_KEY = 'okuldesk_period_times';

export function getPeriodTimes(): Record<number, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return { ...DEFAULT_PERIOD_TIMES, ...parsed };
      }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PERIOD_TIMES };
}

export function savePeriodTimes(times: Record<number, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
  } catch {
    // ignore
  }
}

export interface CurrentPeriodInfo {
  isWeekday: boolean;
  dayOfWeek: number; // 1 = Pazartesi ... 5 = Cuma
  dayLabel: string;
  currentPeriod: number | null;
  isExactLesson: boolean;
  isBreak: boolean;
  isLunchBreak: boolean;
  nextPeriod: number | null;
  timeRange: string | null;
  badgeText: string;
}

export function getCurrentPeriodInfo(
  times: Record<number, string> = getPeriodTimes(),
  now: Date = new Date()
): CurrentPeriodInfo {
  const day = now.getDay(); // 0 = Pazar, 1 = Pzt, ..., 6 = Cmt
  const daysMap: Record<number, string> = {
    1: 'Pazartesi',
    2: 'Salı',
    3: 'Çarşamba',
    4: 'Perşembe',
    5: 'Cuma',
    6: 'Cumartesi',
    0: 'Pazar',
  };

  const dayLabel = daysMap[day] || '';
  const isWeekday = day >= 1 && day <= 5;

  if (!isWeekday) {
    return {
      isWeekday: false,
      dayOfWeek: day === 0 ? 7 : day,
      dayLabel,
      currentPeriod: null,
      isExactLesson: false,
      isBreak: false,
      isLunchBreak: false,
      nextPeriod: null,
      timeRange: null,
      badgeText: `Hafta Sonu (${dayLabel})`,
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timeRegex = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/;

  const parsedPeriods: Array<{ period: number; start: number; end: number; raw: string }> = [];

  Object.entries(times).forEach(([pStr, timeStr]) => {
    const p = parseInt(pStr, 10);
    if (isNaN(p)) return;
    const m = String(timeStr).match(timeRegex);
    if (m && m[1] && m[2] && m[3] && m[4]) {
      const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      const end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
      parsedPeriods.push({ period: p, start, end, raw: timeStr });
    }
  });

  parsedPeriods.sort((a, b) => a.start - b.start);

  if (parsedPeriods.length === 0) {
    return {
      isWeekday: true,
      dayOfWeek: day,
      dayLabel,
      currentPeriod: null,
      isExactLesson: false,
      isBreak: false,
      isLunchBreak: false,
      nextPeriod: null,
      timeRange: null,
      badgeText: `${dayLabel}`,
    };
  }

  // Check if inside a lesson
  for (let i = 0; i < parsedPeriods.length; i++) {
    const item = parsedPeriods[i];
    if (currentMinutes >= item.start && currentMinutes <= item.end) {
      return {
        isWeekday: true,
        dayOfWeek: day,
        dayLabel,
        currentPeriod: item.period,
        isExactLesson: true,
        isBreak: false,
        isLunchBreak: false,
        nextPeriod: i + 1 < parsedPeriods.length ? parsedPeriods[i + 1].period : null,
        timeRange: item.raw,
        badgeText: `CANLI: ${item.period}. Ders (${item.raw})`,
      };
    }
  }

  // Check if in break between lessons
  for (let i = 0; i < parsedPeriods.length - 1; i++) {
    const prev = parsedPeriods[i];
    const next = parsedPeriods[i + 1];
    if (currentMinutes > prev.end && currentMinutes < next.start) {
      const isLunch = next.start - prev.end >= 45; // Öğle arası genellikle >= 45 dk
      return {
        isWeekday: true,
        dayOfWeek: day,
        dayLabel,
        currentPeriod: null,
        isExactLesson: false,
        isBreak: true,
        isLunchBreak: isLunch,
        nextPeriod: next.period,
        timeRange: `${prev.end % 60 ? Math.floor(prev.end / 60) : prev.end / 60}:${String(prev.end % 60).padStart(2, '0')} - ${Math.floor(next.start / 60)}:${String(next.start % 60).padStart(2, '0')}`,
        badgeText: isLunch
          ? `Öğle Arası (Sıradaki: ${next.period}. Ders)`
          : `Teneffüs (Sıradaki: ${next.period}. Ders)`,
      };
    }
  }

  // Before first period or after last period
  if (currentMinutes < parsedPeriods[0].start) {
    return {
      isWeekday: true,
      dayOfWeek: day,
      dayLabel,
      currentPeriod: null,
      isExactLesson: false,
      isBreak: false,
      isLunchBreak: false,
      nextPeriod: parsedPeriods[0].period,
      timeRange: null,
      badgeText: `Ders Başlamadı (1. Ders: ${parsedPeriods[0].raw})`,
    };
  }

  const last = parsedPeriods[parsedPeriods.length - 1];
  return {
    isWeekday: true,
    dayOfWeek: day,
    dayLabel,
    currentPeriod: null,
    isExactLesson: false,
    isBreak: false,
    isLunchBreak: false,
    nextPeriod: null,
    timeRange: null,
    badgeText: `Dersler Tamamlandı (${dayLabel})`,
  };
}
