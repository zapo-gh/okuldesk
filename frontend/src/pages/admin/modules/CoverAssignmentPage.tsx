import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import api from '../../../services/api';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import {
  UserCheck, Calendar, UserX, Save, Printer, AlertTriangle,
  ExternalLink, RefreshCw, Trash2, Zap, CheckCircle, Info, ChevronDown
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ActionModal } from '../../../components/ui/ActionModal';

// ─── Yazdırma Şablonu ───────────────────────────────────────────────────────
const CoverPrintTemplate = React.forwardRef<
  HTMLDivElement,
  { date: string; covers: any[]; absences: any[]; schoolName: string }
>(({ date, covers, absences, schoolName }, ref) => (
  <div ref={ref} className="p-8 bg-white font-sans text-sm print:text-xs">
    <div className="text-center mb-6 border-b pb-4">
      <h1 className="text-lg font-bold">{schoolName}</h1>
      <h2 className="text-base font-semibold mt-1">Günlük Boş Ders Görevlendirme Listesi</h2>
      <p className="text-slate-500 text-sm">
        {new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
    {absences.length > 0 && (
      <div className="mb-4">
        <p className="font-semibold text-sm mb-1">İzinli Öğretmenler:</p>
        <p className="text-slate-600 text-xs">{absences.map(a => a.staff?.name).join(', ')}</p>
      </div>
    )}
    <table className="w-full border-collapse border border-slate-300 text-xs">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-300 p-2 text-left">Gelmeyen Öğretmen</th>
          <th className="border border-slate-300 p-2 text-center">Saat</th>
          <th className="border border-slate-300 p-2 text-center">Ders</th>
          <th className="border border-slate-300 p-2 text-center">Sınıf</th>
          <th className="border border-slate-300 p-2 text-left">Görevlendirilen Nöbetçi</th>
          <th className="border border-slate-300 p-2 text-center">İmza</th>
        </tr>
      </thead>
      <tbody>
        {covers.map((c, i) => (
          <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
            <td className="border border-slate-300 p-2">{c.absentStaff?.name}</td>
            <td className="border border-slate-300 p-2 text-center">{c.period}. Ders</td>
            <td className="border border-slate-300 p-2 text-center">{c.subject || '—'}</td>
            <td className="border border-slate-300 p-2 text-center">{c.className}</td>
            <td className="border border-slate-300 p-2">{c.substituteStaff?.name || c.suggestedSubstitute?.staff?.name || '—'}</td>
            <td className="border border-slate-300 p-2 text-center w-16"></td>
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-6 text-xs text-slate-400 text-right">Yazdırma: {new Date().toLocaleString('tr-TR')}</p>
  </div>
));
CoverPrintTemplate.displayName = 'CoverPrintTemplate';

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function CoverAssignmentPage() {
  const { settings } = useSettings();
  const { confirm, confirmModal } = useConfirm();
  const academicYear = settings?.academicYear || '2025-2026';
  const schoolName = settings?.schoolName || 'Okul Adı';
  const printRef = useRef<HTMLDivElement>(null);

  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Veriler
  const [absences, setAbsences] = useState<any[]>([]);
  const [savedCovers, setSavedCovers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [hasTimetable, setHasTimetable] = useState<boolean | null>(null);
  const [suggestStatus, setSuggestStatus] = useState<{ status: string; message?: string } | null>(null);

  // Modal
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({ staffId: '', startDate: dateStr, endDate: dateStr, reason: '' });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `BosDesDoldurma_${dateStr}`
  });

  // ─── Veri Yükleme ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setSuggestions([]);
    setSuggestStatus(null);
    try {
      const [absRes, coversRes, staffRes, timetableRes] = await Promise.all([
        api.get(`/duty-schedule/absences?date=${dateStr}&academicYear=${academicYear}`),
        api.get(`/duty-schedule/covers?date=${dateStr}&academicYear=${academicYear}`),
        api.get('/staff'),
        api.get(`/timetable/active?academicYear=${academicYear}`).catch(() => ({ data: { data: null } }))
      ]);
      setAbsences(absRes.data.data || []);
      setSavedCovers(coversRes.data.data || []);
      setStaffList(staffRes.data.data?.staff || staffRes.data.data || []);
      setHasTimetable(!!timetableRes.data.data);
    } catch {
      toast.error('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [dateStr, academicYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Öneri Oluştur (Ayrı Buton) ─────────────────────────────────────────
  const handleSuggest = async () => {
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      const res = await api.get(`/duty-schedule/covers/suggest?date=${dateStr}&academicYear=${academicYear}`);
      const { status, message, suggestions: sugs } = res.data.data;
      setSuggestions(sugs || []);
      setSuggestStatus({ status, message });
      if (status !== 'success') toast(message || 'Öneri oluşturulamadı.', { icon: '⚠️' });
    } catch {
      toast.error('Öneri oluşturulamadı.');
    } finally {
      setSuggestLoading(false);
    }
  };

  // ─── State Safe Update ───────────────────────────────────────────────────
  const updateSuggestion = (index: number, substituteStaffId: string) => {
    setSuggestions(prev =>
      prev.map((s, i) => i === index ? { ...s, substituteStaffId } : s)
    );
  };

  // ─── İzin Ekle ──────────────────────────────────────────────────────────
  const handleSaveAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/duty-schedule/absences', { ...absenceForm, academicYear });
      toast.success('İzin/Devamsızlık kaydedildi.');
      setIsAbsenceModalOpen(false);
      setAbsenceForm({ staffId: '', startDate: dateStr, endDate: dateStr, reason: '' });
      fetchData();
    } catch {
      toast.error('Kaydedilemedi.');
    }
  };

  // ─── İzin Sil ───────────────────────────────────────────────────────────
  const handleDeleteAbsence = async (id: string, name: string) => {
    const ok = await confirm(`"${name}" için devamsızlık kaydını silmek istiyor musunuz?`);
    if (!ok) return;
    try {
      await api.delete(`/duty-schedule/absences/${id}`);
      toast.success('Devamsızlık kaydı silindi.');
      fetchData();
    } catch {
      toast.error('Silinemedi.');
    }
  };

  // ─── Atama Kaydet ────────────────────────────────────────────────────────
  const handleSaveCovers = async () => {
    const toSave = suggestions.filter(s => s.substituteStaffId);
    if (toSave.length === 0) return toast.error('Kaydedilecek atama yok. En az bir satır için nöbetçi seçin.');
    try {
      await api.post('/duty-schedule/covers', {
        date: dateStr,
        academicYear,
        covers: toSave.map(s => ({
          absenceId: s.absenceId,
          absentStaffId: s.absentStaff?.id,
          substituteStaffId: s.substituteStaffId,
          period: s.period,
          className: s.className,
          subject: s.subject
        }))
      });
      toast.success(`${toSave.length} atama kaydedildi.`);
      setSuggestions([]);
      fetchData();
    } catch {
      toast.error('Atamalar kaydedilemedi.');
    }
  };

  // ─── Kaydedilmiş Atama Sil ───────────────────────────────────────────────
  const handleDeleteCover = async (id: string) => {
    const ok = await confirm('Bu görevlendirme kaydını silmek istediğinize emin misiniz?');
    if (!ok) return;
    try {
      await api.delete(`/duty-schedule/covers/${id}`);
      toast.success('Görevlendirme silindi.');
      fetchData();
    } catch {
      toast.error('Silinemedi.');
    }
  };

  // Görevlendirme tablosu için birleşik veri (öneri veya kayıtlı)
  const displayCovers = savedCovers.length > 0 ? savedCovers : suggestions;
  const isShowingSaved = savedCovers.length > 0 && suggestions.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boş Ders Doldurma"
        description="İzinli öğretmenlerin derslerine nöbetçi öğretmen atayın. Atamalar veritabanına kaydedilir."
        icon={<UserCheck size={24} />}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={() => handlePrint()} className="gap-2" disabled={displayCovers.length === 0}>
              <Printer size={16} /> Yazdır
            </Button>
            <Button
              onClick={() => { setAbsenceForm({ staffId: '', startDate: dateStr, endDate: dateStr, reason: '' }); setIsAbsenceModalOpen(true); }}
              className="gap-2"
              disabled={!hasTimetable}
              title={!hasTimetable ? 'Önce ders programı yükleyin' : undefined}
            >
              <UserX size={16} /> İzinli Öğretmen Ekle
            </Button>
          </div>
        }
      />

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
            <p className="text-amber-600 text-xs mt-1 font-medium">
              Lütfen önce "Ders Programı" modülünden Yabil Excel çıktısını yükleyin.
            </p>
          </div>
          <Link to="/admin/timetable">
            <Button variant="outline" className="gap-1.5 shrink-0 text-amber-800 border-amber-300 hover:bg-amber-100">
              <ExternalLink size={14} /> Ders Programı
            </Button>
          </Link>
        </div>
      )}

      {/* Tarih Seçici + Öneri Butonu */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4 print:hidden">
        <label className="font-semibold text-slate-700 flex items-center gap-2">
          <Calendar size={18} /> Tarih:
        </label>
        <input
          type="date"
          value={dateStr}
          onChange={e => setDateStr(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
        <Button variant="ghost" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Yükleniyor' : 'Yenile'}
        </Button>
        <div className="ml-auto flex gap-2">
          <Button
            onClick={handleSuggest}
            disabled={suggestLoading || !hasTimetable || absences.length === 0}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {suggestLoading
              ? <RefreshCw size={16} className="animate-spin" />
              : <Zap size={16} />
            }
            Öneri Oluştur
          </Button>
          {suggestions.length > 0 && (
            <Button onClick={handleSaveCovers} className="gap-2 bg-green-600 hover:bg-green-700">
              <Save size={16} /> Atamaları Kaydet
            </Button>
          )}
        </div>
      </div>

      {/* Ana Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sol — İzinli Öğretmenler */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-rose-50 border-b border-rose-100 px-4 py-3">
              <h3 className="font-bold text-rose-800 flex items-center gap-2 text-sm">
                <UserX size={16} /> İzinli / Devamsız
                <span className="ml-auto bg-rose-200 text-rose-800 text-xs font-bold px-2 py-0.5 rounded-full">
                  {absences.length}
                </span>
              </h3>
            </div>
            <div className="p-3">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-3 border-rose-400 border-t-transparent" />
                </div>
              ) : absences.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">
                  Bu tarihte kayıtlı devamsız öğretmen yok.
                </p>
              ) : (
                <ul className="space-y-2">
                  {absences.map(abs => (
                    <li key={abs.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-slate-800 text-sm block truncate">{abs.staff?.name}</span>
                        {abs.reason && <span className="text-xs text-slate-500 truncate block">{abs.reason}</span>}
                        <span className="text-xs text-slate-400">
                          {new Date(abs.startDate).toLocaleDateString('tr-TR')}
                          {abs.startDate !== abs.endDate && ` – ${new Date(abs.endDate).toLocaleDateString('tr-TR')}`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteAbsence(abs.id, abs.staff?.name)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                        title="İzni Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Sağ — Görevlendirme Tablosu */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Calendar size={16} />
                {isShowingSaved ? (
                  <span className="flex items-center gap-2">
                    Kaydedilmiş Atamalar
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={11} /> {savedCovers.length} kayıt
                    </span>
                  </span>
                ) : suggestions.length > 0 ? (
                  <span className="flex items-center gap-2">
                    Öneri Tablosu
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      Kaydedilmedi
                    </span>
                  </span>
                ) : 'Ders Bazlı Görevlendirme'}
              </h3>
              {isShowingSaved && (
                <button onClick={handleSuggest} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <Zap size={12} /> Yeni Öneri Oluştur
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
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
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        {absences.length === 0
                          ? 'Bu tarihte izinli öğretmen yok. Önce sol taraftan ekleyin.'
                          : !hasTimetable
                          ? 'Aktif ders programı gereklidir.'
                          : (
                            <div className="flex flex-col items-center gap-3">
                              <Zap size={24} className="text-slate-300" />
                              <span>Görevlendirme önerisi oluşturmak için "Öneri Oluştur" butonuna basın.</span>
                            </div>
                          )
                        }
                      </td>
                    </tr>
                  ) : isShowingSaved ? (
                    // Kaydedilmiş atamalar — salt okunur
                    savedCovers.map((c, i) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800 text-sm">{c.absentStaff?.name}</td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-600">{c.period}. Ders</td>
                        <td className="px-4 py-3 text-center">
                          {c.subject
                            ? <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2 py-0.5 rounded">{c.subject}</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold">{c.className}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-emerald-700">{c.substituteStaff?.name}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteCover(c.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                            title="Atamayı Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Öneri tablosu — düzenlenebilir
                    suggestions.map((sug, i) => (
                      <tr key={i} className={`hover:bg-slate-50 transition-colors ${sug.suggestedSubstitute?.isConflict ? 'bg-orange-50/40' : ''}`}>
                        <td className="px-4 py-3 font-medium text-slate-800 text-sm">{sug.absentStaff?.name}</td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-600">{sug.period}. Ders</td>
                        <td className="px-4 py-3 text-center">
                          {sug.subject
                            ? <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2 py-0.5 rounded">{sug.subject}</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold">{sug.className}</span>
                        </td>
                        <td className="px-4 py-3 min-w-[220px]">
                          <div className="relative">
                            <select
                              className={`w-full border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8 ${
                                !sug.substituteStaffId
                                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                                  : sug.suggestedSubstitute?.isConflict
                                  ? 'border-orange-300 bg-orange-50'
                                  : 'border-slate-300'
                              }`}
                              value={sug.substituteStaffId || ''}
                              onChange={e => updateSuggestion(i, e.target.value)}
                            >
                              <option value="">— Seçin —</option>
                              <optgroup label="✓ Nöbetçi (Boşta)">
                                {sug.availableDutyStaff?.filter((s: any) => s.isFree).map((st: any) => (
                                  <option key={st.id} value={st.id}>{st.name}</option>
                                ))}
                              </optgroup>
                              <optgroup label="⚠ Nöbetçi (Dersli)">
                                {sug.availableDutyStaff?.filter((s: any) => !s.isFree).map((st: any) => (
                                  <option key={st.id} value={st.id}>{st.name}</option>
                                ))}
                              </optgroup>
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                          {sug.suggestedSubstitute?.isConflict && sug.substituteStaffId && (
                            <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                              <Info size={11} /> Bu saatte dersi var — en az görevli nöbetçi seçildi
                            </p>
                          )}
                          {!sug.substituteStaffId && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                              <Info size={11} /> Atanmadı — listeden manuel seçin
                            </p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Öneri durum mesajı */}
          {suggestStatus && suggestStatus.status !== 'success' && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-2 text-amber-800 text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{suggestStatus.message}</span>
            </div>
          )}
        </div>
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
            <select
              required
              value={absenceForm.staffId}
              onChange={e => setAbsenceForm({ ...absenceForm, staffId: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
            >
              <option value="">Seçiniz...</option>
              {staffList.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
            <input
              type="text"
              placeholder="Örn: 3 Günlük Sağlık Raporu"
              value={absenceForm.reason}
              onChange={e => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAbsenceModalOpen(false)}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </ActionModal>

      {confirmModal}

      {/* Gizli yazdırma şablonu */}
      <div className="hidden print:block">
        <CoverPrintTemplate
          ref={printRef}
          date={dateStr}
          covers={displayCovers}
          absences={absences}
          schoolName={schoolName}
        />
      </div>
    </div>
  );
}
