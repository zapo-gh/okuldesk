import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import { useReactToPrint } from 'react-to-print';
import {
  CalendarDays, UploadCloud, AlertTriangle, CheckCircle,
  Search, Trash2, History, Printer, RefreshCw, BookOpen, Users
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ActionModal } from '../../../components/ui/ActionModal';

const DAYS = [
  { val: 1, label: 'Pazartesi' },
  { val: 2, label: 'Salı' },
  { val: 3, label: 'Çarşamba' },
  { val: 4, label: 'Perşembe' },
  { val: 5, label: 'Cuma' },
];

const SUBJECT_COLORS: Record<string, string> = {
  'MATEMATİK': 'bg-blue-100 text-blue-800 border-blue-200',
  'TÜRKÇE': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'FEN': 'bg-green-100 text-green-800 border-green-200',
  'SOSYAl': 'bg-amber-100 text-amber-800 border-amber-200',
  'İNGİLİZCE': 'bg-violet-100 text-violet-800 border-violet-200',
  'BEDEN': 'bg-orange-100 text-orange-800 border-orange-200',
  'MÜZİK': 'bg-pink-100 text-pink-800 border-pink-200',
  'GÖRSEL': 'bg-rose-100 text-rose-800 border-rose-200',
  'DİN': 'bg-teal-100 text-teal-800 border-teal-200',
  'TARİH': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'COĞRAFYA': 'bg-lime-100 text-lime-800 border-lime-200',
  'FİZİK': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'KİMYA': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'BİYOLOJİ': 'bg-sky-100 text-sky-800 border-sky-200',
};

function getSubjectColor(subject?: string): string {
  if (!subject) return 'bg-slate-100 text-slate-700 border-slate-200';
  const key = Object.keys(SUBJECT_COLORS).find(k => subject.toUpperCase().includes(k));
  return key ? SUBJECT_COLORS[key] : 'bg-slate-100 text-slate-700 border-slate-200';
}

// ─────────── Baskı Şablonu ───────────
const TimetablePrintTemplate = React.forwardRef<
  HTMLDivElement,
  { entries: any[]; title: string; subtitle: string; schoolName: string }
>(({ entries, title, subtitle, schoolName }, ref) => {
  const maxPeriod = entries.length > 0 ? Math.max(...entries.map(e => e.period)) : 8;
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const getCell = (day: number, period: number) =>
    entries.find(e => e.dayOfWeek === day && e.period === period);

  return (
    <div ref={ref} className="p-8 bg-white font-sans text-sm print:text-xs">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">{schoolName}</h1>
        <h2 className="text-lg font-semibold mt-1">{title}</h2>
        <p className="text-slate-500 text-sm">{subtitle}</p>
      </div>
      <table className="w-full border-collapse border border-slate-300 text-xs">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 p-2 w-16">Saat</th>
            {DAYS.map(d => (
              <th key={d.val} className="border border-slate-300 p-2 font-semibold">{d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map(period => (
            <tr key={period} className={period % 2 === 0 ? 'bg-slate-50' : ''}>
              <td className="border border-slate-300 p-2 text-center font-bold text-slate-600">
                {period}. Ders
              </td>
              {DAYS.map(day => {
                const cell = getCell(day.val, period);
                return (
                  <td key={day.val} className="border border-slate-300 p-2 text-center min-h-[40px]">
                    {cell ? (
                      <div>
                        {cell.subject && <div className="font-semibold">{cell.subject}</div>}
                        <div className="text-slate-500">{cell.className}</div>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-slate-400 text-right">
        Yazdırma tarihi: {new Date().toLocaleDateString('tr-TR')}
      </p>
    </div>
  );
});
TimetablePrintTemplate.displayName = 'TimetablePrintTemplate';

// ─────────── Ana Bileşen ───────────
export default function TimetablePage() {
  const { settings } = useSettings();
  const { confirm, confirmModal } = useConfirm();
  const academicYear = settings?.academicYear || '2025-2026';
  const schoolName = settings?.schoolName || 'Okul Adı';

  const [activeTimetable, setActiveTimetable] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Görüntüleme
  const [viewMode, setViewMode] = useState<'teacher' | 'class'>('teacher');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [viewEntries, setViewEntries] = useState<any[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewTitle, setViewTitle] = useState('');

  // Upload
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Yazdırma
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: viewTitle || 'Ders_Programi' });

  const fetchBase = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, histRes, staffRes] = await Promise.all([
        api.get(`/timetable/active?academicYear=${academicYear}`),
        api.get(`/timetable/history?academicYear=${academicYear}`),
        api.get('/staff'),
      ]);
      const active = activeRes.data.data;
      setActiveTimetable(active);
      setHistory(histRes.data.data || []);

      const allStaff = staffRes.data.data?.staff || staffRes.data.data || [];
      const teachers = allStaff.filter((s: any) => {
        const g = (s.gorev || '').toLowerCase();
        return g.includes('öğretmen');
      });
      setStaffList(teachers);

      // Aktif programdaki sınıf kodlarını benzersiz olarak çıkar
      if (active?.entries) {
        const uniq = [...new Set<string>(
          active.entries.map((e: any) => e.className).filter(Boolean)
        )].sort();
        setClassNames(uniq);
      }
    } catch {
      toast.error('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { fetchBase(); }, [fetchBase]);

  const handleView = async () => {
    if (viewMode === 'teacher' && !selectedStaffId) return toast.error('Lütfen bir öğretmen seçin.');
    if (viewMode === 'class' && !selectedClass) return toast.error('Lütfen bir sınıf seçin.');

    setViewLoading(true);
    try {
      if (viewMode === 'teacher') {
        const res = await api.get(`/timetable/teacher/${selectedStaffId}`);
        setViewEntries(res.data.data || []);
        const staff = staffList.find(s => s.id === selectedStaffId);
        setViewTitle(`${staff?.name || ''} — Haftalık Ders Programı`);
      } else {
        const encoded = encodeURIComponent(selectedClass);
        const res = await api.get(`/timetable/class/${encoded}`);
        setViewEntries(res.data.data || []);
        setViewTitle(`${selectedClass} Sınıfı — Haftalık Ders Programı`);
      }
    } catch {
      toast.error('Ders programı yüklenemedi.');
    } finally {
      setViewLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return toast.error('Lütfen bir Excel dosyası seçin.');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('academicYear', academicYear);
    formData.append('name', `${academicYear} Ders Programı`);
    try {
      const res = await api.post('/timetable/upload', formData);
      setUploadResult(res.data.data);
      toast.success('Ders programı başarıyla yüklendi!');
      fetchBase();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Yükleme başarısız oldu.');
    } finally {
      setUploading(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setUploadResult(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm('Bu ders programını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.');
    if (!ok) return;
    try {
      await api.delete(`/timetable/${id}`);
      toast.success('Program silindi.');
      fetchBase();
    } catch {
      toast.error('Silinemedi.');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.put(`/timetable/${id}/activate`, { academicYear });
      toast.success('Program aktif olarak ayarlandı.');
      fetchBase();
    } catch {
      toast.error('Aktif ayarlanamadı.');
    }
  };

  // Tablo verisi
  const maxPeriod = viewEntries.length > 0 ? Math.max(...viewEntries.map(e => e.period)) : 8;
  const periods = Array.from({ length: Math.max(maxPeriod, 8) }, (_, i) => i + 1);
  const getCell = (day: number, period: number) =>
    viewEntries.find(e => e.dayOfWeek === day && e.period === period);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ders Programı Yönetimi"
        description="Öğretmen ve sınıf ders programlarını görüntüleyin, yazdırın ve yönetin."
        icon={<CalendarDays size={24} />}
        actions={
          <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2">
            <UploadCloud size={18} /> Yeni Program Yükle (Excel)
          </Button>
        }
      />

      {/* Durum Kartı */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : !activeTimetable ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4 items-start">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-bold text-amber-800">Aktif Ders Programı Bulunamadı</h3>
            <p className="text-amber-700 text-sm mt-1">
              {academicYear} dönemi için henüz program yüklenmemiş. Boş Ders Doldurma modülü de bu programa ihtiyaç duymaktadır.
            </p>
            <Button onClick={() => setIsUploadModalOpen(true)} className="mt-3 gap-2">
              <UploadCloud size={16} /> Şimdi Yükle
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <CheckCircle size={20} /> Aktif Program: <span className="text-slate-800">{activeTimetable.name}</span>
          </div>
          <div className="text-slate-500 text-sm">{activeTimetable.entries?.length || 0} ders ataması</div>
          <div className="text-slate-400 text-xs">
            Yüklenme: {new Date(activeTimetable.createdAt).toLocaleDateString('tr-TR')}
          </div>
        </div>
      )}

      {/* Arama Çubuğu */}
      {activeTimetable && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Mod Seçimi */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setViewMode('teacher')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
                  viewMode === 'teacher' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users size={16} /> Öğretmen
              </button>
              <button
                onClick={() => setViewMode('class')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
                  viewMode === 'class' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen size={16} /> Sınıf
              </button>
            </div>

            {/* Seçim Kutusu */}
            {viewMode === 'teacher' ? (
              <select
                value={selectedStaffId}
                onChange={e => setSelectedStaffId(e.target.value)}
                className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Öğretmen seçin...</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Sınıf seçin...</option>
                {classNames.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            <Button onClick={handleView} disabled={viewLoading} className="gap-2">
              {viewLoading
                ? <RefreshCw size={16} className="animate-spin" />
                : <Search size={16} />
              }
              Görüntüle
            </Button>

            {viewEntries.length > 0 && (
              <Button variant="outline" onClick={() => handlePrint()} className="gap-2">
                <Printer size={16} /> Yazdır
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Ders Programı Tablosu */}
      {viewEntries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">{viewTitle}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-20">Saat</th>
                  {DAYS.map(d => (
                    <th key={d.val} className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map(period => (
                  <tr key={period} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-slate-500 text-xs">{period}. Ders</td>
                    {DAYS.map(day => {
                      const cell = getCell(day.val, period);
                      return (
                        <td key={day.val} className="px-2 py-2 text-center">
                          {cell ? (
                            <div className={`inline-flex flex-col items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium ${getSubjectColor(cell.subject)}`}>
                              {cell.subject && <span className="font-bold leading-tight">{cell.subject}</span>}
                              <span className={cell.subject ? 'text-xs opacity-70 leading-tight' : 'leading-tight'}>{cell.className}</span>
                            </div>
                          ) : (
                            <span className="text-slate-200 text-lg">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Program Geçmişi */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <History size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800">Program Geçmişi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Program Adı</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Ders Sayısı</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Yükleme Tarihi</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Durum</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{h.name}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{h._count?.entries ?? 0}</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-xs">
                      {new Date(h.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {h.isActive ? (
                        <span className="bg-green-100 text-green-700 border border-green-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                          ✓ Aktif
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 text-xs font-medium px-2 py-0.5 rounded-full">
                          Pasif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!h.isActive && (
                          <button
                            onClick={() => handleActivate(h.id)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition"
                          >
                            Aktif Yap
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <ActionModal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        title="Yeni Ders Programı Yükle"
      >
        <div className="space-y-4">
          {!uploadResult ? (
            <>
              <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center relative hover:bg-slate-100 transition cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="mx-auto text-indigo-400 mb-2" size={36} />
                <p className="text-slate-700 font-medium">Excel Dosyasını Seçin veya Sürükleyin</p>
                <p className="text-slate-400 text-sm mt-1">Yabil çıktı formatı (.xlsx, .xls) — Maks. 10 MB</p>
                {selectedFile && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm border border-indigo-100">
                    <CheckCircle size={16} /> {selectedFile.name}
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-amber-800 text-sm">
                <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={16} />
                <p>Yeni yükleme mevcut aktif programı pasife çekecektir. İşlem atomiktir; hata durumunda geri alınır.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeUploadModal}>İptal</Button>
                <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                  {uploading
                    ? <><RefreshCw size={16} className="animate-spin" /> Yükleniyor...</>
                    : 'Yükle ve Ayrıştır'
                  }
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Yükleme Başarılı!</h3>
                <p className="text-slate-500 mt-1">{uploadResult.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <div className="text-2xl font-bold text-slate-800">{uploadResult.totalTeachersFoundInExcel}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Bulunan Öğretmen</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <div className="text-2xl font-bold text-slate-800">{uploadResult.totalEntriesCreated}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Aktarılan Ders Saati</div>
                </div>
              </div>

              {uploadResult.warnings?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-2 text-sm">
                    <AlertTriangle size={16} className="text-amber-500" />
                    Eşleşmeyen Öğretmenler ({uploadResult.warnings.length})
                  </h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 max-h-40 overflow-y-auto text-sm text-amber-800 space-y-1">
                    {uploadResult.warnings.map((w: string, i: number) => (
                      <div key={i} className="border-b border-amber-100/50 pb-1 last:border-0 last:pb-0">{w}</div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Bu öğretmenleri Personel Havuzu'na ekleyip programı yeniden yükleyebilirsiniz.</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={closeUploadModal}>Kapat</Button>
              </div>
            </div>
          )}
        </div>
      </ActionModal>

      {confirmModal}

      {/* Gizli yazdırma şablonu */}
      <div className="hidden print:block">
        <TimetablePrintTemplate
          ref={printRef}
          entries={viewEntries}
          title={viewTitle}
          subtitle={academicYear}
          schoolName={schoolName}
        />
      </div>
    </div>
  );
}
