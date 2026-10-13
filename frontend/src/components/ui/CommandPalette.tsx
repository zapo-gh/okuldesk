import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, UserRound, LayoutGrid, ChevronRight } from 'lucide-react';
import api from '../../services/api';

interface PaletteModule {
  title: string;
  path: string;
  category: string;
}

const MODULES: PaletteModule[] = [
  // Genel
  { title: 'Gösterge Paneli', path: '/admin', category: 'Genel' },
  { title: 'Öğrenci Listesi', path: '/admin/students', category: 'Genel' },

  // Öğrenci İşlemleri
  { title: 'Veli İzin Dilekçesi', path: '/admin/parent-leave', category: 'Öğrenci İşlemleri' },
  { title: 'Veli Dilekçeleri', path: '/admin/petitions', category: 'Öğrenci İşlemleri' },
  { title: 'Devamsızlık Mektubu', path: '/admin/absenteeism', category: 'Öğrenci İşlemleri' },
  { title: 'Yazılı Uyarılar', path: '/admin/warnings', category: 'Öğrenci İşlemleri' },
  { title: 'İhlal Takibi', path: '/admin/violations', category: 'Öğrenci İşlemleri' },
  { title: 'Başarısızlık Riski Bildirimi', path: '/admin/grade-reports', category: 'Öğrenci İşlemleri' },
  { title: 'ÖMYK Devamsızlık Bildirimi', path: '/admin/parent-notification', category: 'Öğrenci İşlemleri' },
  { title: 'Kayıt Evrakları', path: '/admin/matbu-evraklar', category: 'Öğrenci İşlemleri' },
  { title: 'Veli Toplantısı İmza Sirküsü', path: '/admin/parent-meeting', category: 'Öğrenci İşlemleri' },

  // Eğitim & Öğretim
  { title: 'Nöbet Çizelgesi', path: '/admin/duty-schedule', category: 'Eğitim & Öğretim' },
  { title: 'Ders Programı', path: '/admin/timetable', category: 'Eğitim & Öğretim' },
  { title: 'Boş Ders Doldurma', path: '/admin/cover-assignments', category: 'Eğitim & Öğretim' },
  { title: 'Öğrenci Kulüpleri', path: '/admin/student-club', category: 'Eğitim & Öğretim' },
  { title: 'Sınıf Rehber Öğretmenleri', path: '/admin/class-teachers', category: 'Eğitim & Öğretim' },
  { title: 'Klasör Sırtlığı', path: '/admin/folder-spines', category: 'Eğitim & Öğretim' },

  // Personel & İnsan Kaynakları
  { title: 'Personel Havuzu', path: '/admin/staff', category: 'Personel & İK' },
  { title: 'Personel İmza Çizelgesi', path: '/admin/attendance-sheet', category: 'Personel & İK' },
  { title: 'Tebliğ – Tebellüğ Belgesi', path: '/admin/teblig', category: 'Personel & İK' },

  // Kurullar & Planlama
  { title: 'Kurul ve Komisyonlar', path: '/admin/commission', category: 'Kurullar & Planlama' },
  { title: 'Belirli Gün ve Haftalar', path: '/admin/commemorative-days', category: 'Kurullar & Planlama' },
  { title: 'Resmi Tatiller', path: '/admin/holidays', category: 'Kurullar & Planlama' },

  // Satın Alma & Mali İşler
  { title: 'Fatura & Ödenek Takip', path: '/admin/invoice-tracking', category: 'Mali İşler' },

  // Sistem
  { title: 'WhatsApp Bağlantısı', path: '/admin/whatsapp', category: 'Sistem' },
  { title: 'Ayarlar', path: '/admin/settings', category: 'Sistem' },
  { title: 'Sistem İzlenebilirliği (Audit)', path: '/admin/audit-logs', category: 'Sistem' },

  // [GELECEKTE GELİŞTİRİLECEK / ASKIYA ALINAN MODÜLLER - GELECEKTE_GELISTIRILECEK_MODULLER.md]
  // { title: 'Öğretmenler Kurulu', path: '/admin/board-meeting' },
  // { title: 'Sosyal Etkinlik Planı', path: '/admin/social-activity' },
  // { title: 'Personel Nakil Bildirimi', path: '/admin/staff-transfer' },
  // { title: 'Okul Gezi Planı', path: '/admin/field-trip' },
  // { title: 'Doğrudan Temin (22/d)', path: '/admin/procurement' },
  // { title: 'Firma Rehberi', path: '/admin/supplier' },
  // { title: 'Yıllık Çalışma Planı', path: '/admin/annual-plan' },
  // { title: 'Okul Aile Birliği', path: '/admin/parent-association' },
  // { title: 'Ders Dışı Egzersiz Planı', path: '/admin/extracurricular' },
  // { title: 'Yolluk Hesaplama', path: '/admin/travel-allowance' },
];

type StudentResult = {
  id: string;
  fullName: string;
  schoolNumber: string;
  className: string;
  status: string;
  parents?: Array<{ fullName: string; phone: string }>;
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const requestId = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(open => !open);
        setQuery('');
        setStudents([]);
        setSelectedIndex(0);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const filteredModules = MODULES.filter(m =>
    m.title.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')) ||
    m.category.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))
  );

  useEffect(() => {
    setSelectedIndex(0);
    const q = query.trim();
    if (!isOpen || q.length < 2) {
      setStudents([]);
      setStudentLoading(false);
      return;
    }

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setStudentLoading(true);
      try {
        const response = await api.get('/students', {
          params: { search: q, page: 1, limit: 8, status: 'ALL' },
        });
        if (currentRequest !== requestId.current) return;
        setStudents(response.data?.data?.students ?? response.data?.students ?? []);
      } catch {
        if (currentRequest === requestId.current) setStudents([]);
      } finally {
        if (currentRequest === requestId.current) setStudentLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, isOpen]);

  const items = [
    ...students.map(student => ({
      type: 'student' as const,
      path: `/admin/students/${student.id}`,
      title: student.fullName,
      subtitle: `${student.schoolNumber} · ${student.className}`,
      student
    })),
    ...filteredModules.map(module => ({
      type: 'module' as const,
      path: module.path,
      title: module.title,
      category: module.category
    })),
  ];

  const handleSelect = (path?: string) => {
    if (!path) return;
    navigate(path);
    setIsOpen(false);
    setQuery('');
    setStudents([]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(items[selectedIndex]?.path);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-gray-900/60 transition-opacity print:hidden" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
            placeholder="Öğrenci, okul no, sınıf veya modül arayın..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="hidden sm:inline-flex px-2 py-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded mr-2">ESC</kbd>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim().length >= 2 && (
            <div className="mb-3">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <UserRound size={14} /> Öğrenciler
              </div>
              {studentLoading ? (
                <div className="px-4 py-3 text-sm text-slate-400">Öğrenciler aranıyor...</div>
              ) : students.length ? students.map((student, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={student.id}
                    ref={el => { itemRefs.current[idx] = el; }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => handleSelect(`/admin/students/${student.id}`)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span>
                      <span className="block font-medium text-sm">{student.fullName}</span>
                      <span className="block text-xs text-slate-500 mt-0.5 font-normal">
                        {student.schoolNumber} · {student.className}
                      </span>
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md transition-colors ${
                      isSelected ? 'bg-indigo-100/70 text-indigo-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      360° Profil
                    </span>
                  </button>
                );
              }) : <div className="px-4 py-3 text-sm text-slate-400">Öğrenci bulunamadı.</div>}
            </div>
          )}

          {filteredModules.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <LayoutGrid size={14} /> Modüller
              </div>
              {filteredModules.map((mod, idx) => {
                const absoluteIndex = students.length + idx;
                const isSelected = absoluteIndex === selectedIndex;
                return (
                  <button
                    key={mod.path}
                    ref={el => { itemRefs.current[absoluteIndex] = el; }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => handleSelect(mod.path)}
                    onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                  >
                    <span className="font-medium text-sm">{mod.title}</span>
                    <div className="flex items-center gap-2">
                      {mod.category && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                          isSelected
                            ? 'bg-indigo-100/70 text-indigo-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {mod.category}
                        </span>
                      )}
                      <ChevronRight size={14} className={`transition-transform ${isSelected ? 'text-indigo-500 translate-x-0.5' : 'text-slate-300'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {query.trim().length >= 2 && !studentLoading && students.length === 0 && filteredModules.length === 0 && <div className="p-8 text-center text-slate-500">Sonuç bulunamadı.</div>}
        </div>
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span><kbd className="mr-1.5 px-1.5 py-0.5 rounded border border-slate-300 bg-white shadow-sm">↑</kbd><kbd className="mr-1.5 px-1.5 py-0.5 rounded border border-slate-300 bg-white shadow-sm">↓</kbd> Gezinme · <kbd className="px-1.5 py-0.5 rounded border border-slate-300 bg-white shadow-sm">Enter</kbd> Seç</span>
          <span>Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
