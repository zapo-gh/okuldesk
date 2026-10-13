import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSettings } from '../../context/SettingsContext';
import { printPdfBlob } from '../../utils/printPdf';
import { 
  FileSignature, 
  CheckSquare, 
  Users, 
  Calendar, 
  BookOpen, 
  UserCheck, 
  Search, 
  Loader2, 
  Printer, 
  X, 
  Info 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function ParentMeetingPage() {
  const { settings } = useSettings();
  const [classes,         setClasses]         = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [meetingDate,     setMeetingDate]     = useState(new Date().toISOString().slice(0, 10));
  const [schoolYear,      setSchoolYear]      = useState(settings?.academicYear || '2025-2026');
  const [term,            setTerm]            = useState('2. DÖNEM');
  const [includeParent,   setIncludeParent]   = useState(true);
  const [loading,         setLoading]         = useState(false);
  const [loadingClasses,  setLoadingClasses]  = useState(true);
  
  const [success,         setSuccess]         = useState('');
  const [searchTerm,      setSearchTerm]      = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: string[] }>('/parent-meeting/classes')
      .then(res => {
        const sorted = [...(res.data.data || [])].sort((a, b) =>
          a.localeCompare(b, 'tr', { numeric: true })
        );
        setClasses(sorted);
      })
      .catch(() => toast.error('Sınıf listesi alınamadı.'))
      .finally(() => setLoadingClasses(false));
  }, []);

  useEffect(() => {
    if (settings?.academicYear) {
      setSchoolYear(settings.academicYear);
    }
  }, [settings?.academicYear]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const filteredClasses = classes.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleClass = (c: string) =>
    setSelectedClasses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const selectAll = () => setSelectedClasses([...filteredClasses]);
  const clearAll  = () => setSelectedClasses([]);

  const handleGenerate = async () => {
    if (selectedClasses.length === 0) return;
    setLoading(true);
    setSuccess('');
    try {
      const response = await api.post('/parent-meeting/generate-pdf', {
        classNames: selectedClasses,
        meetingDate,
        schoolYear,
        term,
        includeParentName: includeParent
      }, { responseType: 'blob' });
      
      printPdfBlob(response.data);
      setSuccess(`${selectedClasses.length} sınıf için imza sirküsü yazdırılıyor...`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  // Sınıf gruplama: seviyeye göre (9, 10, 11, 12, diğer)
  const grouped: Record<string, string[]> = {};
  for (const c of filteredClasses) {
    const match = c.match(/^(\d+)/);
    const key = match ? match[1] + '. Sınıf' : 'Diğer';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  const gradeOrder = (grade: string) => {
    const match = grade.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 999;
  };

  const sortedGradeEntries = Object.entries(grouped)
    .sort(([a], [b]) => gradeOrder(a) - gradeOrder(b))
    .map(([grade, gradeClasses]) => [
      grade,
      [...gradeClasses].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }))
    ] as [string, string[]]);

  const allSelected  = selectedClasses.length === filteredClasses.length && filteredClasses.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Veli Toplantısı İmza Sirküsü"
        description="Sınıf seçin, toplantı detaylarını belirleyin ve veli imza sirkülerini PDF olarak hazırlayın."
        icon={<FileSignature size={24} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* SOL KOLON: Sınıf Seçimi */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                <span>Sınıf Seçimi</span>
                <span className="text-[11px] font-medium text-slate-400">
                  ({selectedClasses.length}/{classes.length} seçili)
                </span>
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input 
                  type="text" 
                  placeholder="Sınıf ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 pr-7 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32 sm:w-40 bg-white"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="Temizle"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={allSelected ? clearAll : selectAll} 
                disabled={loadingClasses || filteredClasses.length === 0}
                className="h-7 px-2.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                {allSelected ? 'Tümünü Bırak' : 'Tümünü Seç'}
              </Button>
            </div>
          </div>

          <div>
            {loadingClasses ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Loader2 className="animate-spin mb-2 text-indigo-500" size={24} />
                <p className="text-xs font-medium">Sınıflar yükleniyor...</p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs italic">
                {searchTerm ? 'Aramaya uygun sınıf bulunamadı.' : 'Kayıtlı sınıf bulunamadı.'}
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
                {sortedGradeEntries.map(([grade, gradeClasses]) => {
                  const allGradeSelected = gradeClasses.every(c => selectedClasses.includes(c));
                  const selectedCount = gradeClasses.filter(c => selectedClasses.includes(c)).length;

                  return (
                    <div key={grade} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{grade}</span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            ({selectedCount}/{gradeClasses.length})
                          </span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            if (allGradeSelected) {
                              setSelectedClasses(prev => prev.filter(c => !gradeClasses.includes(c)));
                            } else {
                              setSelectedClasses(prev => [...new Set([...prev, ...gradeClasses])]);
                            }
                          }}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          {allGradeSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                        {gradeClasses.map(c => {
                          const isSelected = selectedClasses.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => toggleClass(c)}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                isSelected 
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              <span>{c}</span>
                              {isSelected && <CheckSquare size={13} className="text-white shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SAĞ KOLON: Toplantı Parametreleri & Canlı Özet & Yazdır */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600" />
              <span>Toplantı Bilgileri & Yazdırma</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {schoolYear}
            </span>
          </div>

          {/* Form Alanları */}
          <div className="space-y-3">
            {/* Tarih ve Eğitim Yılı */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Toplantı Tarihi
                </label>
                <input 
                  type="date"  
                  value={meetingDate} 
                  onChange={e => setMeetingDate(e.target.value)} 
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Öğretim Yılı
                </label>
                <input 
                  type="text"  
                  value={schoolYear} 
                  onChange={e => setSchoolYear(e.target.value)} 
                  placeholder="2025-2026"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
                />
              </div>
            </div>

            {/* Dönem */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <BookOpen size={13} className="text-slate-400" />
                Dönem
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['1. DÖNEM', '2. DÖNEM'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTerm(d)}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-bold text-center transition-all ${
                      term === d 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Veli Adı Ekleme Seçeneği */}
            <div 
              onClick={() => setIncludeParent(p => !p)}
              className={`flex items-start gap-2.5 p-3 rounded-lg cursor-pointer border transition-all ${
                includeParent ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
              }`}
            >
              <div className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                includeParent ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
              }`}>
                {includeParent && <CheckSquare size={12} className="text-white fill-current" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-indigo-600" />
                  <span>Veli adını PDF sirküye ekle</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {includeParent ? 'Sistemdeki kayıtlı veli adı otomatik doldurulur.' : 'Ad sütunu boş imza alanı olarak bırakılır.'}
                </div>
              </div>
            </div>
          </div>

          {/* Canlı Özet Kartı */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Seçili Sınıf:</span>
              <span className="font-bold text-indigo-700">
                {selectedClasses.length > 0 ? `${selectedClasses.length} Sınıf` : 'Seçilmedi'}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Toplantı Dönemi:</span>
              <span className="font-semibold text-slate-800">{schoolYear} · {term}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Tarih:</span>
              <span className="font-semibold text-slate-800">
                {meetingDate ? new Date(meetingDate).toLocaleDateString('tr-TR') : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Veli İsimleri:</span>
              <span className="font-semibold text-slate-800">{includeParent ? 'Doldurulacak' : 'Boş bırakılacak'}</span>
            </div>

            {/* Seçilen Sınıflar Rozet Listesi */}
            {selectedClasses.length > 0 && (
              <div className="pt-1.5">
                <div className="text-[11px] font-bold text-slate-600 mb-1.5">Yazdırılacak Sınıflar ({selectedClasses.length}):</div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-white rounded-lg border border-slate-200/70 scrollbar-thin">
                  {selectedClasses.map(c => (
                    <span key={c} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      {c}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleClass(c); }}
                        className="text-indigo-400 hover:text-indigo-700"
                        title="Çıkar"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mevzuat Bilgi Notu */}
          <div className="p-2.5 bg-amber-50/80 border border-amber-200/70 rounded-lg text-[11px] text-amber-800 leading-snug">
            <div className="flex items-start gap-1.5">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>MEB Standartları:</strong> Her dönem en az bir veli toplantısı yapılması ve veli imza sirkülerinin sınıf rehberlik dosyasında muhafaza edilmesi esastır.
              </div>
            </div>
          </div>

          {/* Başarı Bildirimi */}
          {success && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckSquare size={16} className="text-emerald-600 shrink-0" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          {/* Aksiyon Butonu */}
          <Button 
            variant="primary"
            onClick={handleGenerate}
            disabled={loading || loadingClasses || selectedClasses.length === 0}
            className="w-full h-10 justify-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Hazırlanıyor...</>
            ) : (
              <><Printer size={16} /> İmza Sirküsü Yazdır {selectedClasses.length > 0 ? `(${selectedClasses.length} Sınıf)` : ''}</>
            )}
          </Button>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Sınıf listeleri e-Okul formatında sıralanır</span>
            <span>A4 Yatay / Dikey Uyumlu</span>
          </div>
        </div>
      </div>
    </div>
  );
}
