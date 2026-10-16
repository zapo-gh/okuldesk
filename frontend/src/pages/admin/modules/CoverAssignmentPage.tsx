import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import api from '../../../services/api';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import {
  UserCheck, Calendar, UserX, Save, Printer, AlertTriangle,
  ExternalLink, RefreshCw, Trash2, Zap, CheckCircle, Info, Check, Copy,
  ChevronLeft, ChevronRight, BookOpen, Clock, Layers, ChevronDown, FileText, Table,
  Undo2, Redo2, LayoutGrid, List, MessageSquare, Shield, Lock, Unlock, BarChart3, Plus
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ActionModal } from '../../../components/ui/ActionModal';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { RoomStationMappingModal } from './components/RoomStationMappingModal';
import { CoverMatrixPrintTemplate } from './print/CoverMatrixPrintTemplate';
import { parseAndStandardizeClass } from '../../../utils/classNameFormatter';

// Yeni Entegre Bileşenler (nobetci-assigner mimarisi)
import { AssignmentOptionsCard } from './cover/AssignmentOptionsCard';
import { AssignmentInsightsCard } from './cover/AssignmentInsightsCard';
import { AssignmentGridEditor } from './cover/AssignmentGridEditor';
import { AssignmentTextCard } from './cover/AssignmentTextCard';
import { PrintNotesCard, DEFAULT_PRINT_NOTES } from './cover/PrintNotesCard';
import { DutyTeacherAvailabilityGrid } from './cover/DutyTeacherAvailabilityGrid';
import { ClassAbsenceMatrixGrid } from './cover/ClassAbsenceMatrixGrid';
import { AssignmentPlanMatrixGrid } from './cover/AssignmentPlanMatrixGrid';

// ─── Standart Yazdırma Şablonu ───────────────────────────────────────────────
const CoverPrintTemplate = React.forwardRef<
  HTMLDivElement,
  {
    date: string;
    covers: any[];
    absences: any[];
    schoolName: string;
    classDisplayMap?: Record<string, string>;
    printNotes?: string;
    printNotesEnabled?: boolean;
    onlyAssigned?: boolean;
    showMerged?: boolean;
  }
>(({ date, covers, absences, schoolName, classDisplayMap, printNotes, printNotesEnabled, onlyAssigned = false, showMerged = true }, ref) => {
  const filteredCovers = covers.filter(c => {
    if (c.isCancelled) return false;
    const isMerged = Boolean(c.isMerged || c.isCombined);
    if (!showMerged && isMerged) return false;
    if (onlyAssigned) {
      const hasAssignment = Boolean(
        (c.substituteStaffId && c.substituteStaffId !== 'CANCEL') ||
        c.substituteStaff ||
        c.suggestedSubstitute?.staff ||
        (showMerged && isMerged)
      );
      if (!hasAssignment) return false;
    }
    return true;
  });

  return (
    <div
      ref={ref}
      className="w-full max-w-[210mm] min-h-[297mm] p-8 mx-auto bg-white font-sans text-xs print:p-0 print:text-[11px] print:max-w-none print:w-full print:min-h-0"
      style={{ boxSizing: 'border-box' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait !important;
          margin: 12mm 10mm !important;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
      <div className="text-center mb-6 border-b pb-4">
        <h1 className="text-base font-bold text-slate-800 uppercase tracking-wide">{schoolName}</h1>
        <h2 className="text-sm font-black mt-1 text-slate-900 uppercase">Günlük Boş Ders Görevlendirme Listesi</h2>
        <p className="text-slate-500 text-xs mt-0.5">
          {new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      {absences.length > 0 && (
        <div className="mb-4">
          <p className="font-semibold text-xs mb-1">İzinli Öğretmenler:</p>
          <p className="text-slate-600 text-[11px] leading-relaxed">{absences.map(a => `${a.staff?.name} (${a.reason || 'İzinli'})`).join(', ')}</p>
        </div>
      )}
      <table className="w-full border-collapse border border-slate-300 text-[11px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 p-2 text-left w-[28%] font-bold text-slate-800">Gelmeyen Öğretmen</th>
            <th className="border border-slate-300 p-2 text-center w-[12%] font-bold text-slate-800">Saat</th>
            <th className="border border-slate-300 p-2 text-center w-[16%] font-bold text-slate-800">Ders</th>
            <th className="border border-slate-300 p-2 text-center w-[18%] font-bold text-slate-800">Sınıf</th>
            <th className="border border-slate-300 p-2 text-left w-[26%] font-bold text-slate-800">Görevlendirilen Nöbetçi</th>
          </tr>
        </thead>
        <tbody>
          {filteredCovers.length === 0 ? (
            <tr>
              <td colSpan={5} className="border border-slate-300 p-4 text-center text-slate-500 italic">
                Görüntülenecek görevlendirme bulunamadı.
              </td>
            </tr>
          ) : (
            filteredCovers.map((c, i) => (
              <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                <td className="border border-slate-300 p-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {[c.absentStaff, ...(c.coAbsentStaffs || [])].filter(Boolean).map((staff: any, idx: number, arr: any[]) => (
                      <div key={staff.id || idx} className="flex items-center">
                        <div>
                          <span>{staff.name}</span>
                          <span className="text-slate-500 text-[10px] ml-1">
                            ({(() => {
                              const a = absences.find(a => a.staffId === staff.id);
                              const r = a?.reason || 'İzinli';
                              const t = a?.absenceTime === 'SABAH' ? ' (Sabah)' : a?.absenceTime === 'OGLEDEN_SONRA' ? ' (Öğleden Sonra)' : '';
                              return r + t;
                            })()})
                          </span>
                        </div>
                        {idx < arr.length - 1 && <span className="ml-2 text-slate-400 font-bold">&amp;</span>}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="border border-slate-300 p-2 text-center">{c.period}. Ders</td>
                <td className="border border-slate-300 p-2 text-center">{c.subject || '—'}</td>
                <td className="border border-slate-300 p-2 text-center">
                  <div>{parseAndStandardizeClass(c.className, classDisplayMap).displayName}</div>
                  {c.room && <div className="text-[10px] text-slate-500 mt-0.5">{c.room}</div>}
                </td>
                <td className="border border-slate-300 p-2">
                  {c.isMerged || c.isCombined ? (
                    <span className="font-bold text-purple-700">
                      Grup Birleştirildi ({c.mergedWithStaff?.name || c.presentCoTeachers?.[0]?.name || c.substituteStaff?.name || 'Öğretmen'})
                    </span>
                  ) : c.substituteStaffId === 'ADMIN' ? (
                    <span className="font-bold text-purple-700">İdare Kontrolünde</span>
                  ) : c.isCancelled || c.substituteStaffId === 'CANCEL' ? (
                    <span className="text-slate-400 italic">İptal Edildi</span>
                  ) : (
                    c.substituteStaff?.name || c.suggestedSubstitute?.staff?.name || '—'
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

    {/* Resmi Açıklamalar / Notlar */}
    {printNotesEnabled && printNotes && printNotes.trim() && (
      <div className="mt-5 pt-3 border-t border-slate-300 text-xs">
        <p className="font-bold uppercase text-slate-800 text-[11px] mb-1">Açıklamalar:</p>
        <p className="whitespace-pre-line text-slate-600 leading-relaxed text-[10px] pl-1">{printNotes.trim()}</p>
      </div>
    )}

    <p className="mt-6 text-xs text-slate-400 text-right">Yazdırma: {new Date().toLocaleString('tr-TR')}</p>
  </div>
);
});
CoverPrintTemplate.displayName = 'CoverPrintTemplate';

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function CoverAssignmentPage() {
  const { settings } = useSettings();
  const { confirm, confirmModal } = useConfirm();
  const academicYear = settings?.academicYear || '2025-2026';
  const schoolName = settings?.schoolName || 'Okul Adı';

  // Yazdırma Ref ve Durumları
  const printStandardRef = useRef<HTMLDivElement>(null);
  const printMatrixRef = useRef<HTMLDivElement>(null);
  const [printFormat, setPrintFormat] = useState<'matrix' | 'standard'>('matrix');
  const [onlyAssigned, setOnlyAssigned] = useState<boolean>(true);
  const [showMergedClasses, setShowMergedClasses] = useState<boolean>(true);
  const [dailyDutyStaff, setDailyDutyStaff] = useState<any[]>([]);

  // Resmi Açıklamalar & Notlar State
  const [printNotes, setPrintNotes] = useState<string>(() => {
    try {
      return localStorage.getItem('nobetci_print_notes') || DEFAULT_PRINT_NOTES;
    } catch {
      return DEFAULT_PRINT_NOTES;
    }
  });

  const [printNotesEnabled, setPrintNotesEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nobetci_print_notes_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleNotesChange = (newNotes: string) => {
    setPrintNotes(newNotes);
    try {
      localStorage.setItem('nobetci_print_notes', newNotes);
    } catch {}
  };

  const handleNotesEnabledChange = (enabled: boolean) => {
    setPrintNotesEnabled(enabled);
    try {
      localStorage.setItem('nobetci_print_notes_enabled', String(enabled));
    } catch {}
  };

  const classDisplayMap = useMemo<Record<string, string>>(() => {
    try {
      return JSON.parse(settings?.classDisplayMap || '{}');
    } catch {
      return {};
    }
  }, [settings?.classDisplayMap]);

  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Tabs: 1. Okula Gelemeyenler, 2. Sınıf Boş Ders Matrisi, 3. Nöbetçi Saatlik Müsaitlik, 4. Planlama & Dağıtım, 5. Çıktılar & WhatsApp
  type TabType = 'absences' | 'classes' | 'duty_availability' | 'planning' | 'outputs';
  const [activeTab, setActiveTab] = useState<TabType>('absences');

  // Görünüm Modları
  const [planningViewMode, setPlanningViewMode] = useState<'matrix' | 'grid' | 'table'>('matrix');

  // Manuel boş ders geçersiz kılmaları (Sınıf Boş Ders Matrisinde hücreye tıklayarak manuel ekleme/kaldırma)
  const [manualCoverOverrides, setManualCoverOverrides] = useState<Record<string, {
    className: string;
    period: number;
    room?: string;
    subject?: string;
    reason?: string;
    isRemoved?: boolean;
  }>>({});

  const handleToggleCellEmpty = (className: string, period: number, isCurrentlyEmpty: boolean, room?: string) => {
    const key = `${className}_${period}`;
    setManualCoverOverrides(prev => {
      const next = { ...prev };
      if (isCurrentlyEmpty) {
        next[key] = { className, period, room, isRemoved: true };
      } else {
        next[key] = {
          className,
          period,
          room: room || '',
          reason: 'Manuel İşaretlendi',
          isRemoved: false
        };
      }
      return next;
    });
  };

  const handleClearClassOverrides = (className: string) => {
    setManualCoverOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${className}_`)) {
          delete next[key];
        }
      });
      return next;
    });
  };

  // Nöbetçi Öğretmen Saatlik Müsaitlik Haritası (staffId -> Set of period numbers)
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, Set<number>>>({});

  const handleTogglePeriod = (staffId: string, period: number) => {
    setAvailabilityMap(prev => {
      const currentSet = new Set(prev[staffId] || []);
      if (currentSet.has(period)) {
        currentSet.delete(period);
      } else {
        currentSet.add(period);
      }
      return { ...prev, [staffId]: currentSet };
    });
  };

  const handleSetAllDay = (staffId: string) => {
    setAvailabilityMap(prev => ({
      ...prev,
      [staffId]: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    }));
  };

  const handleClearAll = (staffId: string) => {
    setAvailabilityMap(prev => ({
      ...prev,
      [staffId]: new Set()
    }));
  };

  const handleSetGlobalAllDay = () => {
    const allPeriods = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const newMap: Record<string, Set<number>> = {};
    dailyDutyStaff.forEach(d => {
      const sid = String(d.staff?.id || d.staffId || '');
      if (sid) newMap[sid] = new Set(allPeriods);
    });
    setAvailabilityMap(newMap);
  };

  const handleClearGlobalAll = () => {
    const newMap: Record<string, Set<number>> = {};
    dailyDutyStaff.forEach(d => {
      const sid = String(d.staff?.id || d.staffId || '');
      if (sid) newMap[sid] = new Set();
    });
    setAvailabilityMap(newMap);
  };

  // Rules / Options
  const [rulePreventConsecutive, setRulePreventConsecutive] = useState(true);
  const [ruleMaxPerHour, setRuleMaxPerHour] = useState(1);
  const [ruleMaxPerDay, setRuleMaxPerDay] = useState(6);

  // Kilitli Atamalar (Lock): `${c.absentStaffId}_${c.period}`
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(new Set());

  // Veriler
  const [absences, setAbsences] = useState<any[]>([]);
  const [savedCovers, setSavedCovers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [allTimetableEntries, setAllTimetableEntries] = useState<any[]>([]);
  const [hasTimetable, setHasTimetable] = useState<boolean | null>(null);
  const [suggestStatus, setSuggestStatus] = useState<{ status: string; message?: string } | null>(null);

  // Undo / Redo Geçmişi
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const pushHistoryState = (newSugs: any[]) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newSugs]);
    setHistoryIndex(prev => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      setHistoryIndex(targetIdx);
      setSuggestions(history[targetIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      setHistoryIndex(targetIdx);
      setSuggestions(history[targetIdx]);
    }
  };

  // Devamsız öğretmen günlük ders listesi ve detay modalı
  const [absentTeacherSchedules, setAbsentTeacherSchedules] = useState<Record<string, any[]>>({});
  const [scheduleModalAbs, setScheduleModalAbs] = useState<any | null>(null);

  // Modal Durumları
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({ staffId: '', startDate: dateStr, endDate: dateStr, reason: 'Raporlu', absenceTime: 'TAM_GUN' });

  // İki farklı yazdırma çıktısı (Standart liste [A4 Dikey] & Saatlik Nöbetçi Çizelgesi [A4 Yatay])
  const handlePrintStandard = useReactToPrint({
    contentRef: printStandardRef,
    documentTitle: `BosDersGorevlendirme_Standart_${dateStr}`,
    pageStyle: `
      @page {
        size: A4 portrait !important;
        margin: 12mm 10mm !important;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        table {
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        thead {
          display: table-header-group;
        }
      }
    `
  });

  const handlePrintMatrix = useReactToPrint({
    contentRef: printMatrixRef,
    documentTitle: `NobetciBosDersCizelgesi_${dateStr}`,
    pageStyle: `
      @page {
        size: A4 landscape !important;
        margin: 8mm !important;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `
  });

  // Sınıf Listesi
  const [allClassNames, setAllClassNames] = useState<string[]>([]);

  // ─── Veri Yükleme ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setSuggestions([]);
    setSuggestStatus(null);
    setAbsentTeacherSchedules({});
    setHistory([]);
    setHistoryIndex(-1);
    setLockedKeys(new Set());
    setManualCoverOverrides({});
    try {
      const [absRes, coversRes, staffRes, timetableRes, dutyStaffRes, classesRes, entriesRes] = await Promise.all([
        api.get(`/duty-schedule/absences?date=${dateStr}&academicYear=${academicYear}`),
        api.get(`/duty-schedule/covers?date=${dateStr}&academicYear=${academicYear}`),
        api.get('/staff'),
        api.get(`/timetable/active?academicYear=${academicYear}`).catch(() => ({ data: { data: null } })),
        api.get(`/duty-schedule/daily-duty-staff?date=${dateStr}&academicYear=${academicYear}`).catch(() => ({ data: { data: [] } })),
        api.get(`/timetable/classes?academicYear=${academicYear}`).catch(() => ({ data: { data: [] } })),
        api.get(`/timetable/all-active-entries?academicYear=${academicYear}`).catch(() => ({ data: { data: { entries: [] } } }))
      ]);
      const fetchedAbsences: any[] = absRes.data.data || [];
      setAbsences(fetchedAbsences);
      setSavedCovers(coversRes.data.data || []);
      setStaffList(staffRes.data.data?.staff || staffRes.data.data || []);
      setHasTimetable(!!timetableRes.data.data);
      setAllClassNames(classesRes.data?.data || []);
      const allEntries = entriesRes.data?.data?.entries || [];
      setAllTimetableEntries(allEntries);

      const fetchedDuty = dutyStaffRes.data?.data || [];
      setDailyDutyStaff(fetchedDuty);
      const nextMap: Record<string, Set<number>> = {};
      fetchedDuty.forEach((d: any) => {
        const sid = String(d.staff?.id || d.staffId || '');
        if (sid) {
          const freeList = Array.isArray(d.freePeriods) ? d.freePeriods : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
          nextMap[sid] = new Set(freeList);
        }
      });
      setAvailabilityMap(nextMap);

      if (fetchedAbsences.length > 0) {
        if (allEntries.length > 0) {
          const schedMap: Record<string, any[]> = {};
          fetchedAbsences.forEach((a: any) => {
            schedMap[a.staffId] = allEntries.filter((e: any) => e.staffId === a.staffId);
          });
          setAbsentTeacherSchedules(schedMap);
        } else if (timetableRes.data.data) {
          const scheduleResults = await Promise.allSettled(
            fetchedAbsences.map((a: any) =>
              api.get(`/timetable/teacher/${a.staffId}?academicYear=${academicYear}`)
            )
          );
          const schedMap: Record<string, any[]> = {};
          fetchedAbsences.forEach((a: any, idx: number) => {
            const result = scheduleResults[idx];
            schedMap[a.staffId] = result.status === 'fulfilled' ? (result.value.data.data?.entries || result.value.data.data || []) : [];
          });
          setAbsentTeacherSchedules(schedMap);
        }
      }
    } catch {
      toast.error('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [dateStr, academicYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Öneri Oluştur (Otomatik Dağıt) ──────────────────────────────────────
  const handleSuggest = async () => {
    setSuggestLoading(true);
    try {
      const res = await api.get(
        `/duty-schedule/covers/suggest?date=${dateStr}&academicYear=${academicYear}&preventConsecutive=${rulePreventConsecutive}&maxCoversPerHour=${ruleMaxPerHour}&maxCoversPerDay=${ruleMaxPerDay}`
      );
      const { status, message, suggestions: sugs } = res.data.data;
      
      // Kilitli olan atamaları koru ve saatlik müsaitlik haritasına göre kontrol et
      const mergedSugs = (sugs || []).map((newSug: any) => {
        const key = `${newSug.absentStaff?.id || newSug.absentStaffId}_${newSug.period}`;
        if (lockedKeys.has(key)) {
          const existing = suggestions.find((old: any) => `${old.absentStaff?.id || old.absentStaffId}_${old.period}` === key);
          if (existing) {
            return { ...newSug, substituteStaffId: existing.substituteStaffId };
          }
        }

        const currentSubId = newSug.substituteStaffId || newSug.suggestedSubstitute?.staff?.id;
        if (currentSubId && availabilityMap[currentSubId] && !availabilityMap[currentSubId].has(newSug.period)) {
          const alt = (newSug.availableDutyStaff || []).find((c: any) =>
            c.isEligible && c.isFree && (!availabilityMap[c.id] || availabilityMap[c.id].has(newSug.period))
          );
          if (alt) {
            return {
              ...newSug,
              substituteStaffId: alt.id,
              suggestedSubstitute: { staff: { id: alt.id, name: alt.name } }
            };
          } else {
            return {
              ...newSug,
              substituteStaffId: '',
              suggestedSubstitute: null
            };
          }
        }

        return newSug;
      });

      setSuggestions(mergedSugs);
      pushHistoryState(mergedSugs);

      if (sugs && sugs.length > 0 && sugs[0].availableDutyStaff) {
        setDailyDutyStaff(prev => {
          if (prev.length > 0) return prev;
          return sugs[0].availableDutyStaff.map((st: any) => ({
            staffId: st.id,
            staff: { id: st.id, name: st.name, title: st.title },
            station: st.station
          }));
        });
      }
      setSuggestStatus({ status, message });
      if (status !== 'success') toast(message || 'Öneri oluşturulamadı.', { icon: '⚠️' });
      else toast.success('Boş dersler otomatik başarıyla dağıtıldı!');
    } catch {
      toast.error('Öneri oluşturulamadı.');
    } finally {
      setSuggestLoading(false);
    }
  };

  const updateSuggestion = (index: number, substituteStaffId: string, extraData?: any) => {
    setSuggestions(prev => {
      const source = prev.length > 0 ? prev : displayCovers;
      const updated = source.map((s, i) => {
        if (i !== index) return s;
        const newCover = {
          ...s,
          substituteStaffId: substituteStaffId || null,
          ...(extraData || {})
        };
        if (substituteStaffId && !extraData?.isMerged && !extraData?.isCombined) {
          const foundStaff = staffList.find(st => st.id === substituteStaffId);
          if (foundStaff) {
            newCover.substituteStaff = foundStaff;
          }
        } else if (!substituteStaffId) {
          newCover.substituteStaff = null;
        }
        return newCover;
      });
      pushHistoryState(updated);
      return updated;
    });
  };

  const toggleLock = (key: string) => {
    setLockedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ─── İzin Ekle ──────────────────────────────────────────────────────────
  const handleSaveAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/duty-schedule/absences', { ...absenceForm, academicYear });
      toast.success('İzin/Devamsızlık kaydedildi.');
      setIsAbsenceModalOpen(false);
      setAbsenceForm({ staffId: '', startDate: dateStr, endDate: dateStr, reason: 'Raporlu', absenceTime: 'TAM_GUN' });
      fetchData();
    } catch {
      toast.error('Kaydedilemedi.');
    }
  };

  const handleDeleteAbsence = async (id: string, name: string) => {
    if (await confirm(`${name} adlı öğretmenin izni/devamsızlığı silinecek. Emin misiniz?`)) {
      try {
        await api.delete(`/duty-schedule/absences/${id}`);
        toast.success('İzin silindi.');
        fetchData();
      } catch {
        toast.error('Silinemedi.');
      }
    }
  };

  // ─── Kaydet ve Sil ───────────────────────────────────────────────────────
  const handleSaveCovers = async () => {
    try {
      const sourceCovers = suggestions.length > 0 ? suggestions : displayCovers;
      const coversToSave = sourceCovers.map(s => {
        const isCancelled = s.substituteStaffId === 'CANCEL';
        return {
          absenceId: s.absenceId,
          absentStaffId: s.absentStaff?.id || s.absentStaffId,
          substituteStaffId: isCancelled || s.substituteStaffId === 'ADMIN' ? null : (s.substituteStaffId || null),
          isCancelled: isCancelled,
          period: s.period,
          className: s.className,
          subject: s.subject,
          room: s.room
        };
      });
      await api.post('/duty-schedule/covers', { date: dateStr, academicYear, covers: coversToSave });
      toast.success('Atamalar başarıyla kaydedildi.');
      fetchData();
    } catch {
      toast.error('Kaydedilemedi.');
    }
  };

  const handleDeleteCover = async (id: string) => {
    try {
      await api.delete(`/duty-schedule/covers/${id}`);
      toast.success('Görevlendirme silindi.');
      fetchData();
    } catch {
      toast.error('Silinemedi.');
    }
  };

  const handleClearAllCovers = async () => {
    if (!window.confirm('Tüm kayıtlı görevlendirmeleri silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/duty-schedule/covers-clear?date=${dateStr}`);
      toast.success('Tüm görevlendirmeler silindi.');
      fetchData();
    } catch {
      toast.error('Silinemedi.');
    }
  };

  const handleDateChange = (days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    setDateStr(d.toISOString().split('T')[0]);
  };

  // ─── Dinamik Hesaplama (Kullanıcı seçim yaptıkça güncellenir) ────────────
  const derivedSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];

    const currentCoverCounts = new Map<string, number>();
    suggestions.forEach(sug => {
      sug.availableDutyStaff?.forEach((st: any) => {
        const existing = currentCoverCounts.get(st.id);
        if (existing === undefined || st.coverCount < existing) {
          currentCoverCounts.set(st.id, st.coverCount);
        }
      });
    });

    const assignedPeriods = new Map<string, Set<number>>();

    // 1. Aşama: Şu anki tüm seçimleri say ve saatleri kaydet
    suggestions.forEach(sug => {
      if (sug.substituteStaffId && sug.substituteStaffId !== 'CANCEL' && sug.substituteStaffId !== 'ADMIN') {
        currentCoverCounts.set(sug.substituteStaffId, (currentCoverCounts.get(sug.substituteStaffId) || 0) + 1);
        if (!assignedPeriods.has(sug.substituteStaffId)) {
          assignedPeriods.set(sug.substituteStaffId, new Set());
        }
        assignedPeriods.get(sug.substituteStaffId)!.add(sug.period);
      }
    });

    // 2. Aşama: Her satır için kuralları yeniden değerlendir
    return suggestions.map(sug => {
      const updatedAvailableStaff = sug.availableDutyStaff?.map((st: any) => {
        let isEligible = true;
        let conflictReason = '';

        if (st.conflictReason && st.conflictReason.includes('izinli')) {
          isEligible = false;
          conflictReason = st.conflictReason;
        }

        const periods = assignedPeriods.get(st.id) || new Set();
        
        let assignedCountThisPeriod = 0;
        suggestions.forEach((s: any) => {
          if (s.period === sug.period && s.substituteStaffId === st.id) {
            assignedCountThisPeriod++;
          }
        });
        
        const isSelectedHere = sug.substituteStaffId === st.id;
        const hasOtherAssignmentThisPeriod = isSelectedHere ? assignedCountThisPeriod > 1 : assignedCountThisPeriod > 0;

        if (hasOtherAssignmentThisPeriod && isEligible) {
          isEligible = false;
          conflictReason = 'Bu saatte dolu';
        }

        if (rulePreventConsecutive && isEligible) {
           const hasPrev = periods.has(sug.period - 1);
           const hasNext = periods.has(sug.period + 1);
           if (hasPrev || hasNext) {
             isEligible = false;
             conflictReason = 'Ardışık görev';
           }
        }

        const currentCount = currentCoverCounts.get(st.id) || 0;
        const projectedCount = isSelectedHere ? currentCount : currentCount + 1;
        if (ruleMaxPerDay && projectedCount > ruleMaxPerDay && isEligible) {
          isEligible = false;
          conflictReason = 'Günlük max limit';
        }

        const isAvailableInMatrix = !availabilityMap[st.id] || availabilityMap[st.id].has(sug.period);
        if (!isAvailableInMatrix && isEligible) {
          isEligible = false;
          conflictReason = 'Bu saatte müsait değil';
        }

        if (!st.isFree && isEligible) {
          isEligible = false;
          conflictReason = 'Derste (Çakışma)';
        }

        return {
          ...st,
          isEligible,
          conflictReason,
          coverCount: currentCount
        };
      });

      // Adayları öncelik hiyerarşisine göre sırala (Aynı Kat > En Yakın Kat > Görev Sayısı)
      updatedAvailableStaff?.sort((a: any, b: any) => {
        if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
        const tierA = a.matchTier ?? 5;
        const tierB = b.matchTier ?? 5;
        if (tierA !== tierB) return tierA - tierB;
        const distA = a.floorDistance ?? 999;
        const distB = b.floorDistance ?? 999;
        if (distA !== distB) return distA - distB;
        if (a.coverCount !== b.coverCount) return a.coverCount - b.coverCount;
        const orderA = a.station?.sortOrder ?? 99;
        const orderB = b.station?.sortOrder ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '', 'tr-TR');
      });

      let isConflict = false;
      if (sug.substituteStaffId && sug.substituteStaffId !== 'CANCEL' && sug.substituteStaffId !== 'ADMIN') {
        const selectedOption = updatedAvailableStaff?.find((s: any) => s.id === sug.substituteStaffId);
        if (selectedOption && (!selectedOption.isEligible || !selectedOption.isFree)) {
          isConflict = true;
        }
      }

      return {
        ...sug,
        availableDutyStaff: updatedAvailableStaff,
        suggestedSubstitute: {
          ...sug.suggestedSubstitute,
          isConflict
        }
      };
    });
  }, [suggestions, rulePreventConsecutive, ruleMaxPerDay, availabilityMap]);

  // Boş ders matrisi için temel boş ders listesi (Öneri henüz üretilmemiş olsa dahi ders programından çeker)
  const derivedAbsentCovers = useMemo(() => {
    const targetDayOfWeek = (() => {
      const d = new Date(dateStr).getDay();
      return d === 0 ? 7 : d;
    })();

    const isStaffAbsentForPeriod = (staffId: string, period: number) => {
      const abs = absences.find(a => a.staffId === staffId);
      if (!abs) return false;
      const aTime = abs.absenceTime || 'TAM_GUN';
      if (aTime === 'TAM_GUN') return true;
      if (aTime === 'SABAH' && period <= 5) return true;
      if (aTime === 'OGLEDEN_SONRA' && period > 5) return true;
      return false;
    };

    const list: any[] = [];
    absences.forEach((abs) => {
      const entries = absentTeacherSchedules[abs.staffId] || [];
      entries.forEach((e: any) => {
        if (e.dayOfWeek !== targetDayOfWeek) return;
        if (abs.absenceTime === 'SABAH' && e.period > 5) return;
        if (abs.absenceTime === 'OGLEDEN_SONRA' && e.period <= 5) return;

        // Ortak ders tespiti
        const coTeacherEntries = (allTimetableEntries || []).filter(
          (t: any) => t.dayOfWeek === targetDayOfWeek &&
                      t.className === e.className &&
                      t.period === e.period &&
                      t.staffId !== abs.staffId &&
                      t.staffId !== null
        );

        const presentCoTeachers = coTeacherEntries
          .filter(c => c.staffId && !isStaffAbsentForPeriod(c.staffId, e.period))
          .map(c => c.staff || staffList.find(s => s.id === c.staffId))
          .filter(Boolean);

        const absentCoTeachers = coTeacherEntries
          .filter(c => c.staffId && isStaffAbsentForPeriod(c.staffId, e.period))
          .map(c => absences.find(a => a.staffId === c.staffId)?.staff || c.staff || staffList.find(s => s.id === c.staffId))
          .filter(Boolean);

        const hasPresentCoTeacher = presentCoTeachers.length > 0;
        const defaultMerged = hasPresentCoTeacher ? presentCoTeachers[0] : null;

        list.push({
          absenceId: abs.id,
          absentStaffId: abs.staffId,
          absentStaff: abs.staff,
          period: e.period,
          className: e.className,
          subject: e.subject,
          room: e.room,
          substituteStaffId: defaultMerged ? defaultMerged.id : null,
          substituteStaff: defaultMerged || null,
          isCoTeaching: coTeacherEntries.length > 0,
          hasPresentCoTeacher,
          presentCoTeachers,
          coAbsentStaffs: absentCoTeachers,
          isMerged: hasPresentCoTeacher,
          isCombined: hasPresentCoTeacher,
          mergedWithStaff: defaultMerged,
        });
      });
    });

    // Manuel geçersiz kılmaları uygula (Hücreye tıklayarak kaldırma/ekleme)
    const filteredList = list.filter(item => {
      const key = `${item.className}_${item.period}`;
      const override = manualCoverOverrides[key];
      if (override && override.isRemoved) return false;
      return true;
    });

    Object.entries(manualCoverOverrides).forEach(([key, override]) => {
      if (!override.isRemoved) {
        const exists = filteredList.some(item => item.className === override.className && item.period === override.period);
        if (!exists) {
          filteredList.push({
            absenceId: `manual_${key}`,
            absentStaffId: 'manual',
            absentStaff: { name: 'Manuel Boş Ders' },
            period: override.period,
            className: override.className,
            subject: override.subject || 'Boş Ders',
            room: override.room || '',
            substituteStaffId: null,
          });
        }
      }
    });

    return filteredList;
  }, [absences, absentTeacherSchedules, dateStr, manualCoverOverrides, allTimetableEntries, staffList]);

  // Görevlendirme tablosu için birleşik veri
  const isShowingSaved = savedCovers.length > 0 && suggestions.length === 0;
  const baseCovers = suggestions.length > 0 
    ? derivedSuggestions 
    : (savedCovers.length > 0 ? savedCovers : derivedAbsentCovers);

  const displayCovers = useMemo(() => {
    const filtered = baseCovers.filter((item: any) => {
      const key = `${item.className}_${item.period}`;
      return !manualCoverOverrides[key]?.isRemoved;
    });

    Object.entries(manualCoverOverrides).forEach(([key, override]) => {
      if (!override.isRemoved) {
        const exists = filtered.some((item: any) => item.className === override.className && item.period === override.period);
        if (!exists) {
          filtered.push({
            absenceId: `manual_${key}`,
            absentStaffId: 'manual',
            absentStaff: { name: 'Manuel Boş Ders' },
            period: override.period,
            className: override.className,
            subject: override.subject || 'Boş Ders',
            room: override.room || '',
            substituteStaffId: null,
          });
        }
      }
    });

    return filtered;
  }, [baseCovers, manualCoverOverrides]);

  // Kullanılabilir tüm sınıf seçenekleri
  const availableClassOptions = useMemo(() => {
    const set = new Set<string>(allClassNames);
    absences.forEach(a => {
      (absentTeacherSchedules[a.staffId] || []).forEach(e => {
        if (e.className) set.add(e.className);
      });
    });
    savedCovers.forEach(c => {
      if (c.className) set.add(c.className);
    });
    displayCovers.forEach(c => {
      if (c.className) set.add(c.className);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [allClassNames, absences, absentTeacherSchedules, savedCovers, displayCovers]);

  // Günlük özet istatistikleri
  const summaryStat = useMemo(() => {
    if (displayCovers.length === 0) return null;
    const total    = displayCovers.length;
    const assigned = displayCovers.filter((c: any) => c.substituteStaffId || c.substituteStaff).length;
    const conflict = displayCovers.filter((c: any) => c.suggestedSubstitute?.isConflict).length;
    const empty    = total - assigned;
    return { total, assigned, empty, conflict };
  }, [displayCovers]);

  // ─── Yazdırma Seçenekleri Açılır Menü Bileşeni ───
  const PrintDropdownButton = ({ className, label }: { className?: string; label?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const timeoutRef = useRef<any>(null);

    const handleMouseEnter = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsOpen(true);
    };

    const handleMouseLeave = () => {
      timeoutRef.current = setTimeout(() => setIsOpen(false), 300);
    };

    const isEnabled = displayCovers.length > 0;

    return (
      <div
        className="relative inline-flex items-center text-left"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          disabled={!isEnabled}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-xs text-slate-700 hover:bg-slate-50 font-semibold rounded-xl border border-slate-300 shadow-xs transition cursor-pointer select-none ${className || ''} ${!isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Yazdırma formatını seçin"
        >
          <Printer size={14} className="text-indigo-600" />
          <span>{label || 'Yazdır'}</span>
          <ChevronDown size={13} className={`text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && isEnabled && (
          <div
            className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              Yazdırma Formatı Seçin
            </div>
            <button
              type="button"
              onClick={() => {
                setPrintFormat('standard');
                setIsOpen(false);
                setTimeout(() => handlePrintStandard(), 60);
              }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/70 flex items-start gap-2.5 transition-colors border-b border-slate-100 group cursor-pointer"
            >
              <FileText size={18} className="text-indigo-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                  📄 Standart Liste Formatı (A4 Dikey)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Gelmeyen öğretmen, ders saati ve görevli tablosu (Dikey kağıt)
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setPrintFormat('matrix');
                setIsOpen(false);
                setTimeout(() => handlePrintMatrix(), 60);
              }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/70 flex items-start gap-2.5 transition-colors group cursor-pointer"
            >
              <Table size={18} className="text-indigo-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                  📊 Saatlik Nöbetçi Çizelgesi (A4 Yatay)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Nöbetçiler, saatlik hücreler ve görevlendirme metni (Geniş matris)
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boş Ders Doldurma & Nöbetçi Atama"
        description="İzinli öğretmenlerin boş derslerine nöbetçileri adil, kat mesafesine uygun ve akıllı şekilde dağıtın."
        icon={<UserCheck size={26} />}
      />
      {confirmModal}

      {/* Aktif Ders Programı Uyarısı */}
      {hasTimetable === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-bold text-amber-800">Aktif Ders Programı Yok</h3>
            <p className="text-amber-700 text-sm mt-1">
              Bu modül, hangi öğretmenin hangi saatte hangi sınıfa girdiğini tespit etmek için aktif bir ders programına ihtiyaç duyar.
              Ders programı olmadan izinli öğretmen eklenemez ve boş ders ataması yapılamaz.
            </p>
          </div>
          <Link to="/admin/timetable">
            <Button variant="outline" className="gap-1.5 shrink-0 text-amber-800 border-amber-300 hover:bg-amber-100">
              <ExternalLink size={14} /> Ders Programı
            </Button>
          </Link>
        </div>
      )}

      {/* Tarih Seçici Barı */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="font-bold text-sm text-slate-700 flex items-center gap-2">
            <Calendar size={18} className="text-indigo-600" /> Planlama Tarihi:
          </label>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" className="px-2 py-1.5" onClick={() => handleDateChange(-1)}>
              <ChevronLeft size={16} />
            </Button>
            <input
              type="date"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-800 shadow-2xs"
            />
            <Button variant="outline" className="px-2 py-1.5" onClick={() => handleDateChange(1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={fetchData} disabled={loading} className="gap-2 text-xs">
            <RefreshCw size={15} className={loading ? 'animate-spin text-indigo-600' : ''} />
            {loading ? 'Yükleniyor...' : 'Verileri Yenile'}
          </Button>
        </div>
      </div>

      {/* Ana Sekmeler (3 Adımlı Profesyonel Akış) */}
      <div className="overflow-x-auto pb-1 max-w-full">
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl w-max">
          {[
            { id: 'absences', label: '1. Okula Gelemeyenler', icon: <UserX size={16} />, badge: absences.length },
            { id: 'classes', label: '2. Sınıf Boş Ders Matrisi', icon: <LayoutGrid size={16} />, badge: derivedAbsentCovers.length },
            { id: 'duty_availability', label: '3. Nöbetçi Saatlik Müsaitlik', icon: <Shield size={16} />, badge: dailyDutyStaff.length },
            { id: 'planning', label: '4. Planlama & Dağıtım', icon: <Calendar size={16} />, badge: displayCovers.length },
            { id: 'outputs', label: '5. Çıktılar & WhatsApp', icon: <Printer size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ─── 1. SEKME: OKULA GELEMEYENLER / İZİNLİLER ─── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'absences' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <UserX size={18} className="text-red-500" />
                Okula Gelemeyen / İzinli Öğretmenler
                {absences.length > 0 && (
                  <span className="ml-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {absences.length} kişi
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Seçili tarihte devamsızlığı veya izni olan personeller ve dersleri
              </p>
            </div>

            <Button
              onClick={() => {
                setAbsenceForm({ staffId: '', startDate: dateStr, endDate: dateStr, reason: 'Raporlu', absenceTime: 'TAM_GUN' });
                setIsAbsenceModalOpen(true);
              }}
              className="gap-2 bg-slate-800 hover:bg-slate-900 text-xs font-bold py-2 shadow-xs"
              disabled={!hasTimetable}
            >
              <UserX size={15} /> İzinli Öğretmen Ekle
            </Button>
          </div>

          {/* Öğretmen Kartları */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
            {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-7 w-7 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
                </div>
              ) : absences.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <UserCheck size={36} className="mx-auto mb-2 text-emerald-400" />
                  <p className="font-bold text-sm text-slate-700">Bu tarihte kayıtlı devamsız öğretmen yok.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Yeni izin veya rapor eklemek için sağ üstteki "İzinli Öğretmen Ekle" butonunu kullanabilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {absences.map(abs => {
                    const targetDayOfWeek = (() => {
                      const d = new Date(dateStr).getDay();
                      return d === 0 ? 7 : d;
                    })();
                    const staffClasses = (absentTeacherSchedules[abs.staffId] || [])
                      .filter((e: any) => {
                        if (e.dayOfWeek !== targetDayOfWeek) return false;
                        if (abs.absenceTime === 'SABAH') return e.period <= 5;
                        if (abs.absenceTime === 'OGLEDEN_SONRA') return e.period > 5;
                        return true;
                      })
                      .sort((a: any, b: any) => a.period - b.period);

                    const reasonColor: Record<string, string> = {
                      'Raporlu': 'bg-red-50 text-red-700 border-red-200',
                      'Sevkli': 'bg-orange-50 text-orange-700 border-orange-200',
                      'Görevli İzinli': 'bg-blue-50 text-blue-700 border-blue-200',
                      'İdari İzinli': 'bg-purple-50 text-purple-700 border-purple-200',
                      'Mazeret İzni': 'bg-amber-50 text-amber-700 border-amber-200',
                    };
                    const reasonCls = reasonColor[abs.reason || ''] || 'bg-slate-100 text-slate-600 border-slate-200';

                    return (
                      <div
                        key={abs.id}
                        className="group relative flex items-center gap-3 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl p-4 cursor-pointer transition-all duration-200 select-none"
                        onClick={() => setScheduleModalAbs({ abs, staffClasses })}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                          {abs.staff?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm leading-tight truncate">{abs.staff?.name}</p>
                          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${reasonCls}`}>
                            {abs.reason || 'İzinli'}
                            {abs.absenceTime === 'SABAH' ? ' (Sabah)' : abs.absenceTime === 'OGLEDEN_SONRA' ? ' (Öğleden Sonra)' : ''}
                          </span>
                        </div>
                        <div className="shrink-0 flex flex-col items-center justify-center w-10">
                          <div className="flex flex-col items-center group-hover:hidden">
                            {staffClasses.length > 0 ? (
                              <>
                                <span className="text-lg font-extrabold text-indigo-600 leading-none">{staffClasses.length}</span>
                                <span className="text-[9px] text-slate-400 font-medium uppercase">ders</span>
                              </>
                            ) : (
                              <span className="text-[9px] text-slate-300 uppercase">ders yok</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAbsence(abs.id, abs.staff?.name);
                            }}
                            className="hidden group-hover:flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                            title="İzni Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ─── 2. SEKME: SINIF BOŞ DERS MATRİSİ (Görsel 2) ─── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <ClassAbsenceMatrixGrid
            covers={derivedAbsentCovers}
            absences={absences}
            classDisplayMap={classDisplayMap}
            manualCoverOverrides={manualCoverOverrides}
            onToggleCellEmpty={handleToggleCellEmpty}
            onClearClassOverrides={handleClearClassOverrides}
            allClassNames={availableClassOptions}
            onRemoveAbsence={(absId) => {
              const abs = absences.find(a => a.id === absId);
              if (abs) handleDeleteAbsence(absId, abs.staff?.name);
            }}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ─── 3. SEKME: NÖBETÇİ SAATLİK MÜSAİTLİK MATRİSİ (Görsel 1) ─── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'duty_availability' && (
        <DutyTeacherAvailabilityGrid
          dailyDutyStaff={dailyDutyStaff}
          availabilityMap={availabilityMap}
          onTogglePeriod={handleTogglePeriod}
          onSetAllDay={handleSetAllDay}
          onClearAll={handleClearAll}
          onSetGlobalAllDay={handleSetGlobalAllDay}
          onClearGlobalAll={handleClearGlobalAll}
        />
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ─── 3. SEKME: PLANLAMA & DAĞITIM MATRİSİ (Görsel 3) ─── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'planning' && (
        <div className="space-y-4">
          {/* Planlama Üst Eylem ve Görünüm Çubuğu */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
            {/* Sol: Görünüm Değiştirici */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPlanningViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  planningViewMode === 'matrix'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Sınıf ve saat bazlı interaktif görev matrisi"
              >
                <Table size={14} /> Sınıf Matrisi
              </button>
              <button
                type="button"
                onClick={() => setPlanningViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  planningViewMode === 'grid'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Saatlik kart çizelgesi"
              >
                <LayoutGrid size={14} /> Saatlik Çizelge
              </button>
              <button
                type="button"
                onClick={() => setPlanningViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  planningViewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Detaylı liste tablosu"
              >
                <List size={14} /> Liste Tablosu
              </button>
            </div>

            {/* Sağ: Eylem Butonları */}
            <div className="flex items-center gap-2 flex-wrap">
              {savedCovers.length > 0 && (
                <Button
                  variant="danger"
                  onClick={handleClearAllCovers}
                  className="gap-1.5 text-xs py-1.5"
                >
                  <Trash2 size={14} /> Tümünü Sil
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setIsRoomModalOpen(true)}
                className="gap-1.5 text-xs py-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
                title="Derslikleri nöbet yerleriyle eşleştir"
              >
                <Layers size={14} className="text-indigo-600" /> Derslik Eşleştir
              </Button>

              <Button
                onClick={handleSuggest}
                disabled={suggestLoading || !hasTimetable || absences.length === 0}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 shadow-xs"
              >
                {suggestLoading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                Otomatik Dağıt (Öner)
              </Button>

              {suggestions.length > 0 && (
                <Button
                  onClick={handleSaveCovers}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 shadow-xs"
                >
                  <Save size={14} /> Atamaları Kaydet
                </Button>
              )}

              {displayCovers.length > 0 && (
                <PrintDropdownButton label="Yazdır" />
              )}
            </div>
          </div>

          {/* GÖRÜNÜM 1: Sınıf & Derslik Dağıtım Matrisi (Görsel 3) */}
          {planningViewMode === 'matrix' && (
            <AssignmentPlanMatrixGrid
              displayCovers={displayCovers}
              absences={absences}
              dailyDutyStaff={dailyDutyStaff}
              lockedKeys={lockedKeys}
              onToggleLock={toggleLock}
              onSelectSubstitute={updateSuggestion}
              classDisplayMap={classDisplayMap}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              rulePreventConsecutive={rulePreventConsecutive}
              onPreventConsecutiveChange={setRulePreventConsecutive}
              ruleMaxPerHour={ruleMaxPerHour}
              onMaxPerHourChange={setRuleMaxPerHour}
              ruleMaxPerDay={ruleMaxPerDay}
              onMaxPerDayChange={setRuleMaxPerDay}
              staffList={staffList}
              allTimetableEntries={allTimetableEntries}
            />
          )}

          {/* GÖRÜNÜM 2: Saatlik Kart Çizelgesi */}
          {planningViewMode === 'grid' && (
            <>
              <AssignmentOptionsCard
                rulePreventConsecutive={rulePreventConsecutive}
                onPreventConsecutiveChange={setRulePreventConsecutive}
                ruleMaxPerHour={ruleMaxPerHour}
                onMaxPerHourChange={setRuleMaxPerHour}
                ruleMaxPerDay={ruleMaxPerDay}
                onMaxPerDayChange={setRuleMaxPerDay}
              />
              <AssignmentGridEditor
                displayCovers={displayCovers}
                absences={absences}
                dailyDutyStaff={dailyDutyStaff}
                lockedKeys={lockedKeys}
                onToggleLock={toggleLock}
                onSelectSubstitute={updateSuggestion}
                classDisplayMap={classDisplayMap}
                isShowingSaved={isShowingSaved}
              />
            </>
          )}

          {/* GÖRÜNÜM 3: Detaylı Tablo */}
          {planningViewMode === 'table' && (
            <>
              <AssignmentOptionsCard
                rulePreventConsecutive={rulePreventConsecutive}
                onPreventConsecutiveChange={setRulePreventConsecutive}
                ruleMaxPerHour={ruleMaxPerHour}
                onMaxPerHourChange={setRuleMaxPerHour}
                ruleMaxPerDay={ruleMaxPerDay}
                onMaxPerDayChange={setRuleMaxPerDay}
              />
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[350px]">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/70 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Gelmeyen</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Saat</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Ders</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Sınıf</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Atanan Nöbetçi</th>
                        {isShowingSaved && <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">İşlem</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayCovers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-16 text-center text-slate-400">
                            {absences.length === 0
                              ? 'Bu tarihte izinli öğretmen yok. "Okula Gelemeyenler" sekmesinden ekleyin.'
                              : !hasTimetable
                              ? 'Aktif ders programı gereklidir.'
                              : (
                                <div className="flex flex-col items-center gap-3">
                                  <Zap size={32} className="text-slate-300" />
                                  <span className="text-base font-semibold text-slate-600">Görevlendirme önerisi oluşturmak için "Otomatik Dağıt" butonuna basın.</span>
                                </div>
                              )
                            }
                          </td>
                        </tr>
                      ) : isShowingSaved ? (
                        savedCovers.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800 text-sm">
                              {c.absentStaff?.name || 'Öğretmen'}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-indigo-600">{c.period}. Ders</td>
                            <td className="px-4 py-3 text-center">
                              {c.subject ? <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">{c.subject}</span> : '—'}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">
                              {parseAndStandardizeClass(c.className, classDisplayMap).displayName}
                            </td>
                            <td className="px-4 py-3 text-left">
                              {c.isCombined || c.isMerged ? (
                                <span className="font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 text-xs">
                                  <span>📚</span> Birleştirildi: {c.mergedWithStaff?.name || c.substituteStaff?.name || 'Grup Öğretmeni'}
                                </span>
                              ) : c.substituteStaffId === 'ADMIN' ? (
                                <span className="font-bold text-purple-700">🏢 İdare Kontrolünde</span>
                              ) : c.isCancelled ? (
                                <span className="text-slate-400 italic">İptal Edildi</span>
                              ) : (
                                <span className="font-bold text-emerald-700">{c.substituteStaff?.name || '—'}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteCover(c.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                title="Sil"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        displayCovers.map((sug, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-sm">
                              {sug.absentStaff?.name || 'Öğretmen'}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-indigo-600">{sug.period}. Ders</td>
                            <td className="px-4 py-3 text-center">{sug.subject || '—'}</td>
                            <td className="px-4 py-3 text-center font-bold">
                              {parseAndStandardizeClass(sug.className, classDisplayMap).displayName}
                            </td>
                            <td className="px-4 py-3 text-left">
                              {sug.isCombined || sug.isMerged ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md text-xs inline-flex items-center gap-1">
                                    <span>📚</span> Birleştirildi: {sug.mergedWithStaff?.name || sug.presentCoTeachers?.[0]?.name || 'Grup Öğretmeni'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateSuggestion(i, '', { isMerged: false, isCombined: false, mergedWithStaff: null })}
                                    className="text-[10px] text-rose-600 hover:text-rose-800 underline font-semibold cursor-pointer"
                                    title="Birleştirmeyi kaldır ve nöbetçi ata"
                                  >
                                    Ayır
                                  </button>
                                </div>
                              ) : (
                                <select
                                  value={sug.substituteStaffId || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const matchingCoTeacher = sug.presentCoTeachers?.find((pt: any) => pt.id === val);
                                    if (matchingCoTeacher) {
                                      updateSuggestion(i, val, { isMerged: true, isCombined: true, mergedWithStaff: matchingCoTeacher });
                                    } else {
                                      updateSuggestion(i, val, { isMerged: false, isCombined: false, mergedWithStaff: null });
                                    }
                                  }}
                                  className="text-xs p-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                                >
                                  <option value="">⚪ Boş Bırak</option>
                                  {sug.presentCoTeachers?.map((pt: any) => (
                                    <option key={pt.id} value={pt.id}>
                                      📚 Grubu Birleştir: {pt.name}
                                    </option>
                                  ))}
                                  <option value="ADMIN">🏢 İdareye Bırak</option>
                                  <option value="CANCEL">❌ İptal Et</option>
                                  {(sug.availableDutyStaff || []).map((st: any) => (
                                    <option key={st.id} value={st.id}>
                                      {st.name} ({st.station?.name || 'Nöbetçi'}) - {st.coverCount || 0} Görev
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Planlama Analiz Kartı (İş Yükü ve Boşta Kalanlar) */}
          <AssignmentInsightsCard
            summaryStat={summaryStat}
            dailyDutyStaff={dailyDutyStaff}
            displayCovers={displayCovers}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ─── 5. SEKME: ÇIKTILAR & WHATSAPP PAYLAŞIMI ─── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'outputs' && (
        <div className="space-y-6">
          {/* 1. Canlı Yazdırma Önizleme ve Tetikleyici Kartı */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50 gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Printer size={16} className="text-indigo-600" /> Yazdırma Önizlemesi
                </h3>
                <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPrintFormat('matrix')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                      printFormat === 'matrix' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    <Table size={14} /> Saatlik Çizelge (Yatay)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintFormat('standard')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                      printFormat === 'standard' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    <FileText size={14} /> Standart Liste (Dikey)
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={onlyAssigned}
                    onChange={e => setOnlyAssigned(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Sadece Görevi Olanları Göster</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={showMergedClasses}
                    onChange={e => setShowMergedClasses(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Grup Birleştirilenleri Göster</span>
                </label>
              </div>

              <PrintDropdownButton label="Yazdır" />
            </div>

            <div className="p-6 bg-slate-200/60 overflow-x-auto flex justify-center">
              {printFormat === 'matrix' ? (
                <div className="bg-white border border-slate-300 rounded-xl overflow-x-auto shadow-md max-w-full w-full">
                  <CoverMatrixPrintTemplate
                    date={dateStr}
                    covers={displayCovers.filter(c => !c.isCancelled)}
                    absences={absences}
                    dailyDutyStaff={dailyDutyStaff}
                    staffList={staffList}
                    schoolName={schoolName}
                    onlyAssigned={onlyAssigned}
                    showMerged={showMergedClasses}
                    classDisplayMap={classDisplayMap}
                    printNotes={printNotes}
                    printNotesEnabled={printNotesEnabled}
                  />
                </div>
              ) : (
                <div className="w-full flex justify-center py-2">
                  <div className="bg-white border border-slate-300 shadow-xl rounded-sm w-[210mm] max-w-full min-h-[297mm] mx-auto overflow-hidden">
                    <CoverPrintTemplate
                      date={dateStr}
                      covers={displayCovers.filter(c => !c.isCancelled)}
                      absences={absences}
                      schoolName={schoolName}
                      classDisplayMap={classDisplayMap}
                      printNotes={printNotes}
                      printNotesEnabled={printNotesEnabled}
                      onlyAssigned={onlyAssigned}
                      showMerged={showMergedClasses}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Resmi Yazdırma Notları & Açıklamalar Kartı */}
          <PrintNotesCard
            notes={printNotes}
            notesEnabled={printNotesEnabled}
            onNotesChange={handleNotesChange}
            onNotesEnabledChange={handleNotesEnabledChange}
          />

          {/* 3. WhatsApp & Duyuru Görev Metni Kartı */}
          <AssignmentTextCard
            dateStr={dateStr}
            schoolName={schoolName}
            displayCovers={displayCovers}
            absences={absences}
            dailyDutyStaff={dailyDutyStaff}
            notes={printNotes}
            notesEnabled={printNotesEnabled}
            staffList={staffList}
          />
        </div>
      )}

      {/* Off-screen Container: Standart Liste (A4 Dikey / Portrait) */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '210mm' }}>
        <CoverPrintTemplate
          ref={printStandardRef}
          date={dateStr}
          covers={displayCovers.filter(c => !c.isCancelled)}
          absences={absences}
          schoolName={schoolName}
          classDisplayMap={classDisplayMap}
          printNotes={printNotes}
          printNotesEnabled={printNotesEnabled}
          onlyAssigned={onlyAssigned}
          showMerged={showMergedClasses}
        />
      </div>

      {/* Off-screen Container: Saatlik Çizelge (A4 Yatay / Landscape) */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '297mm' }}>
        <CoverMatrixPrintTemplate
          ref={printMatrixRef}
          date={dateStr}
          covers={displayCovers.filter(c => !c.isCancelled)}
          absences={absences}
          dailyDutyStaff={dailyDutyStaff}
          staffList={staffList}
          schoolName={schoolName}
          onlyAssigned={onlyAssigned}
          showMerged={showMergedClasses}
          classDisplayMap={classDisplayMap}
          printNotes={printNotes}
          printNotesEnabled={printNotesEnabled}
        />
      </div>

      {/* İzin Ekleme Modal */}
      <ActionModal
        isOpen={isAbsenceModalOpen}
        onClose={() => setIsAbsenceModalOpen(false)}
        title="İzin / Devamsızlık Ekle"
      >
        <form onSubmit={handleSaveAbsence} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Personel *</label>
            <SearchableSelect
              options={staffList.map((s: any) => ({ value: s.id, label: s.name }))}
              value={absenceForm.staffId}
              onChange={val => setAbsenceForm({ ...absenceForm, staffId: val })}
              placeholder="Personel ara ve seç..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç *</label>
              <input
                type="date"
                required
                value={absenceForm.startDate}
                onChange={e => setAbsenceForm({ ...absenceForm, startDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş *</label>
              <input
                type="date"
                required
                value={absenceForm.endDate}
                min={absenceForm.startDate}
                onChange={e => setAbsenceForm({ ...absenceForm, endDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">İzin Türü *</label>
              <select
                required
                value={absenceForm.reason}
                onChange={e => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
              >
                <option value="Raporlu">Raporlu</option>
                <option value="Sevkli">Sevkli</option>
                <option value="Görevli İzinli">Görevli İzinli</option>
                <option value="İdari İzinli">İdari İzinli</option>
                <option value="Mazeret İzni">Mazeret İzni</option>
                <option value="Ücretsiz İzin">Ücretsiz İzin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">İzin Zamanı *</label>
              <select
                required
                value={absenceForm.absenceTime}
                onChange={e => setAbsenceForm({ ...absenceForm, absenceTime: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
              >
                <option value="TAM_GUN">Tam Gün</option>
                <option value="SABAH">Sabah (1-5. Ders)</option>
                <option value="OGLEDEN_SONRA">Öğleden Sonra (6+ Ders)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsAbsenceModalOpen(false)}>İptal</Button>
            <Button type="submit">Ekle</Button>
          </div>
        </form>
      </ActionModal>

      {/* Derslik - Nöbet Yeri Eşleştirme Modalı */}
      <RoomStationMappingModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        academicYear={academicYear}
        onSaved={() => {
          toast.success('Derslik eşleştirmeleri güncellendi');
        }}
      />

      {/* Öğretmen Günlük Ders Programı Modalı */}
      {scheduleModalAbs && (
        <ActionModal
          isOpen={true}
          onClose={() => setScheduleModalAbs(null)}
          title={`${scheduleModalAbs.abs.staff?.name} — Günlük Dersleri`}
        >
          <div className="space-y-4">
            <div className="text-xs text-slate-500">
              {scheduleModalAbs.abs.staff?.name} adlı öğretmenin bu tarihteki ({dateStr}) ders programı:
            </div>
            {scheduleModalAbs.staffClasses.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Bu güne ait ders programı kaydı bulunamadı.</p>
            ) : (
              <div className="space-y-2">
                {scheduleModalAbs.staffClasses.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs"
                  >
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {c.period}
                    </span>
                    <span className="font-bold text-slate-800">
                      {parseAndStandardizeClass(c.className, classDisplayMap).displayName}
                    </span>
                    <span className="text-slate-500">{c.subject || 'Ders'}</span>
                    {c.room && <span className="ml-auto text-slate-400">{c.room}</span>}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t">
              <Button
                variant="danger"
                onClick={() => {
                  setScheduleModalAbs(null);
                  handleDeleteAbsence(scheduleModalAbs.abs.id, scheduleModalAbs.abs.staff?.name);
                }}
                className="gap-1.5 text-xs py-1.5"
              >
                <Trash2 size={13} /> İzni Sil
              </Button>
              <Button variant="outline" onClick={() => setScheduleModalAbs(null)}>Kapat</Button>
            </div>
          </div>
        </ActionModal>
      )}
    </div>
  );
}
