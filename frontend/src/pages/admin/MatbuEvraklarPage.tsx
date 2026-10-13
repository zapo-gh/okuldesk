import { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Search, 
  FileSymlink, 
  Settings, 
  Plus, 
  Trash2, 
  X, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  FileSignature, 
  RotateCcw, 
  Check, 
  Users, 
  CheckCircle2, 
  Sparkles,
  Info
} from 'lucide-react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { AlanTercihFormuPrint } from '../../components/print/AlanTercihFormuPrint';
import { SecmeliDersDilekcesiPrint } from '../../components/print/SecmeliDersDilekcesiPrint';
import { OgleArasiDilekcesiPrint } from '../../components/print/OgleArasiDilekcesiPrint';
import { VeliOkulSozlesmesiPrint } from '../../components/print/VeliOkulSozlesmesiPrint';
import { downloadElementAsPDF } from '../../utils/pdfExport';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';

const DEFAULT_ELECTIVE_GROUPS = [
  { 
    name: 'İNSAN, TOPLUM VE BİLİM', 
    courses: [
      'ASTRONOMİ VE UZAY BİLİMLERİ', 
      'SOSYAL BİLİM ÇALIŞMALARI', 
      'BİLİŞİM TEKNOLOJİLERİ VE YAZILIM', 
      'PROJE TASARIMI VE UYGULAMALARI', 
      'DÜŞÜNME EĞİTİMİ', 
      'DEMOKRASİ VE İNSAN HAKLARI', 
      'METİN TAHLİLLERİ', 
      'SEÇMELİ İKİNCİ YABANCI DİL'
    ] 
  },
  { 
    name: 'DİN, AHLÂK VE DEĞER', 
    courses: [
      'KUR’AN-I KERİM', 
      'PEYGAMBERİMİZİN HAYATI', 
      'TEMEL DİNÎ BİLGİLER'
    ] 
  },
  { 
    name: 'KÜLTÜR, SANAT VE SPOR', 
    courses: [
      'TÜRK SOSYAL HAYATINDA AİLE', 
      'İSLAM BİLİM TARİHİ', 
      'SPOR EĞİTİMİ', 
      'SANAT EĞİTİMİ'
    ] 
  }
];

const DOCUMENTS = [
  {
    id: 1,
    title: 'Alan Tercih Formu',
    category: 'Alan Seçimi',
    description: '10. ve 11. sınıfa geçen öğrencilerin mesleki alan tercihleri için veli bildirim formu.',
    file: '/docs/alan-tercih-formu.pdf',
    component: AlanTercihFormuPrint,
    icon: GraduationCap,
  },
  {
    id: 2,
    title: 'Seçmeli Ders Dilekçesi',
    category: 'Ders Tercihi',
    description: 'MEB güncel müfredatına uygun seçmeli ders tercihlerinin belirlendiği veli talep dilekçesi.',
    file: '/docs/secmeli-ders-dilekcesi.pdf',
    component: SecmeliDersDilekcesiPrint,
    hasSettings: true,
    icon: BookOpen,
  },
  {
    id: 3,
    title: 'Öğle Arası İzin Dilekçesi',
    category: 'İzin Formu',
    description: 'Öğle arasında okul dışına çıkmak isteyen öğrenciler için veli taahhüt ve izin dilekçesi.',
    file: '/docs/ogle-arasi-dilekcesi.pdf',
    component: OgleArasiDilekcesiPrint,
    icon: Clock,
  },
  {
    id: 4,
    title: 'Öğrenci Veli Okul Sözleşmesi',
    category: 'Kayıt Sözleşmesi',
    description: 'Öğrenci kaydı veya dönem başında okul kuralları konusunda veli ile imzalanan standart sözleşme.',
    file: '/docs/ogrenci-veli-okul-sozlesmesi.pdf',
    component: VeliOkulSozlesmesiPrint,
    icon: FileSignature,
  }
];

export default function MatbuEvraklarPage() {
  const { confirm, confirmModal } = useConfirm();
  const [schoolName, setSchoolName] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [assistantPrincipalName, setAssistantPrincipalName] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Seçmeli Ders Ayarları
  const [isElectiveSettingsOpen, setIsElectiveSettingsOpen] = useState(false);
  const [electiveGroups, setElectiveGroups] = useState<{name: string, courses: string[]}[]>([]);

  const loadElectiveCourses = () => {
    const saved = localStorage.getItem('okuldesk_elective_courses_v1');
    if (saved) {
      try {
        setElectiveGroups(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    setElectiveGroups(DEFAULT_ELECTIVE_GROUPS);
  };

  const handleSaveElectiveSettings = () => {
    localStorage.setItem('okuldesk_elective_courses_v1', JSON.stringify(electiveGroups));
    toast.success('Seçmeli ders ayarları başarıyla kaydedildi.');
    setIsElectiveSettingsOpen(false);
  };

  const handleResetToDefaultElectives = async () => {
    if (!await confirm('Seçmeli ders gruplarını MEB varsayılan listesine sıfırlamak istediğinize emin misiniz?')) return;
    setElectiveGroups(DEFAULT_ELECTIVE_GROUPS);
    localStorage.setItem('okuldesk_elective_courses_v1', JSON.stringify(DEFAULT_ELECTIVE_GROUPS));
    toast.success('Varsayılan seçmeli ders grupları yüklendi.');
  };

  useEffect(() => {
    loadElectiveCourses();

    // Okul adını ve müdür adını ayarlardan çek
    api.get('/settings').then((res: any) => {
      const d = res.data?.data || res.data;
      if (d?.schoolName) setSchoolName(d.schoolName);
      if (d?.principalName) setPrincipalName(d.principalName);
    }).catch(() => {});

    // Müdür yardımcısını personelden çek
    api.get('/staff').then((res: any) => {
      const allStaff = res.data?.data?.staff || [];
      const asstPrincipal = allStaff.find((s: any) => s.role === 'MUDUR_YARDIMCISI');
      if (asstPrincipal) setAssistantPrincipalName(asstPrincipal.name);
    }).catch(() => {});

    // Öğrenci listesini çek
    api.get('/students?limit=1000').then((res: any) => {
      const fetchedStudents = res.data?.data?.students || [];
      const sortedStudents = fetchedStudents.sort((a: any, b: any) => {
        const classA = a.className || '';
        const classB = b.className || '';
        const numA = parseInt(classA.match(/^(\d+)/)?.[1] || '999', 10);
        const numB = parseInt(classB.match(/^(\d+)/)?.[1] || '999', 10);
        if (numA !== numB) return numA - numB;
        return classA.localeCompare(classB);
      });
      setStudents(sortedStudents);
    }).catch(() => {
      setStudents([]);
    });
  }, []);

  const handlePrint = (docId: number) => {
    setActiveDocId(docId);
    setTimeout(() => {
      window.print();
      setTimeout(() => setActiveDocId(null), 1000);
    }, 100);
  };

  const handleDownload = async (docId: number, docTitle: string) => {
    setActiveDocId(docId);
    const loadingToast = toast.loading('PDF hazırlanıyor, lütfen bekleyin...');
    
    setTimeout(async () => {
      try {
        const studentName = selectedStudent ? selectedStudent.fullName : 'Bos_Form';
        const fileName = `${studentName} - ${docTitle}.pdf`;
        const success = await downloadElementAsPDF('print-root', fileName);
        
        if (success) {
          toast.success('PDF başarıyla indirildi.', { id: loadingToast });
        } else {
          toast.error('PDF oluşturulurken bir hata oluştu.', { id: loadingToast });
        }
      } catch (err) {
        toast.error('Beklenmeyen bir hata oluştu.', { id: loadingToast });
      } finally {
        setActiveDocId(null);
      }
    }, 500);
  };

  const selectedStudent = Array.isArray(students) ? students.find(s => s.id === selectedStudentId) || null : null;

  const filteredStudents = Array.isArray(students)
    ? students.filter(s =>
        `${s.className || ''} ${s.schoolNumber || ''} ${s.fullName || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ).slice(0, 30)
    : [];

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <div className="print:hidden">
        <PageHeader
          title="Kayıt Evrakları"
          description="Standart okul matbu evraklarını (Alan Tercih, Seçmeli Ders, Öğle Arası İzin, Öğrenci-Veli Sözleşmesi) öğrenci bilgileriyle otomatik doldurun, yazdırın veya PDF olarak indirin."
          icon={<FileSymlink size={24} />}
        />
      </div>

      {/* 2. Öğrenci Seçim Kartı (Kompakt & Modern) */}
      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Users size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Öğrenci Bilgileriyle Otomatik Doldurma (Opsiyonel)
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Öğrenci seçildiğinde form alanları (ad, numara, sınıf vb.) doldurulur; seçilmezse boş şablon basılır.
              </p>
            </div>
          </div>

          <div>
            {selectedStudent ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={12} className="text-emerald-600" />
                Öğrenci Seçildi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Boş Şablon Modu
              </span>
            )}
          </div>
        </div>

        {selectedStudent ? (
          <div className="p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {selectedStudent.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-indigo-950 truncate">{selectedStudent.fullName}</p>
                <p className="text-[11px] text-indigo-700 font-medium">
                  {selectedStudent.className || 'Sınıf Belirtilmedi'} · No: {selectedStudent.schoolNumber || '—'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedStudentId('');
                setSearchQuery('');
              }}
              className="h-7 px-2.5 text-xs text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50"
            >
              Seçimi Kaldır (Boş Form)
            </Button>
          </div>
        ) : (
          <div className="relative max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Öğrenci adı, okul numarası veya sınıfı ile arayın..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder:text-slate-400 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsDropdownOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="Temizle"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {isDropdownOpen && searchQuery.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                <div 
                  className="px-3.5 py-2 text-[11px] font-semibold text-slate-400 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedStudentId('');
                    setSearchQuery('');
                    setIsDropdownOpen(false);
                  }}
                >
                  ✕ Seçimi Temizle (Boş Şablon Olarak Bas)
                </div>
                {filteredStudents.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-500 italic text-center">
                    Eşleşen öğrenci bulunamadı.
                  </div>
                ) : (
                  <div className="p-1 space-y-0.5">
                    {filteredStudents.map(s => (
                      <div 
                        key={s.id} 
                        className="px-3 py-2 text-xs hover:bg-indigo-50 rounded-lg cursor-pointer text-slate-700 transition flex items-center justify-between"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setSearchQuery('');
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900">{s.fullName}</span>
                          <span className="ml-2 text-[11px] text-slate-500">{s.className} · No: {s.schoolNumber}</span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          Seç
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Evrak Kartları (Modern & Kompakt Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {DOCUMENTS.map((doc) => {
          const Icon = doc.icon;
          return (
            <div 
              key={doc.id} 
              className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all p-4 flex flex-col justify-between overflow-hidden group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-100 transition-all shadow-2xs">
                    <Icon size={18} />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {doc.category}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1.5">
                  {doc.title}
                </h3>
                
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {doc.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => handlePrint(doc.id)}
                    variant="primary"
                    size="sm"
                    className="flex-1 h-8 text-xs font-semibold"
                    leftIcon={<Printer size={14} />}
                  >
                    Yazdır
                  </Button>
                  
                  <Button
                    onClick={() => handleDownload(doc.id, doc.title)}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
                    title="PDF İndir"
                  >
                    <Download size={14} />
                  </Button>

                  {doc.hasSettings && (
                    <Button
                      onClick={() => {
                        loadElectiveCourses();
                        setIsElectiveSettingsOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-indigo-600 bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100"
                      title="Seçmeli Ders Gruplarını Ayarla"
                    >
                      <Settings size={14} />
                    </Button>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 font-medium truncate text-center">
                  {selectedStudent ? `✓ ${selectedStudent.fullName} ile doldurulur` : '• Boş şablon basılacaktır'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Yazdırma / PDF Üretim Modülü (Ekranda gizli, CSS @media print'te görünür) */}
      <div id="print-root">
        {activeDocId && (() => {
          const ActiveComponent = DOCUMENTS.find(d => d.id === activeDocId)?.component as React.ElementType;
          return ActiveComponent ? (
            <ActiveComponent 
              schoolName={schoolName} 
              student={selectedStudent} 
              principalName={principalName}
              assistantPrincipalName={assistantPrincipalName}
            />
          ) : null;
        })()}
      </div>

      {/* 5. Seçmeli Ders Ayar Modalı (Düzeltilmiş, Sınırlandırılmış, Kaydırılabilir) */}
      {isElectiveSettingsOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:hidden"
          onClick={() => setIsElectiveSettingsOpen(false)}
        >
          <div 
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Sabit) */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Seçmeli Ders Dilekçesi Ayarları
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Dilekçedeki ders gruplarını ve ders listelerini okulunuza göre güncelleyin.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsElectiveSettingsOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Düzgün Kaydırma Alanı) */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/60">
              {electiveGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs space-y-3">
                  {/* Grup Başlığı ve Silme Butonu */}
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      {groupIdx + 1}. GRUP
                    </span>
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => {
                        const newGroups = [...electiveGroups];
                        newGroups[groupIdx].name = e.target.value;
                        setElectiveGroups(newGroups);
                      }}
                      className="flex-1 font-bold text-xs sm:text-sm text-slate-900 bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 transition outline-none"
                      placeholder="Grup Adı (Örn: İNSAN, TOPLUM VE BİLİM)"
                    />
                    <span className="text-[11px] font-medium text-slate-400 shrink-0 hidden sm:inline">
                      {group.courses.length} Ders
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (await confirm(`"${group.name || 'Bu grup'}" grubunu ve içindeki tüm dersleri silmek istediğinize emin misiniz?`)) {
                          setElectiveGroups(electiveGroups.filter((_, i) => i !== groupIdx));
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition shrink-0 cursor-pointer"
                      title="Grubu Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {/* Gruptaki Dersler */}
                  <div className="space-y-1.5 pl-1 sm:pl-2">
                    {group.courses.map((course, courseIdx) => (
                      <div key={courseIdx} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                        <input
                          type="text"
                          value={course}
                          onChange={(e) => {
                            const newGroups = [...electiveGroups];
                            newGroups[groupIdx].courses[courseIdx] = e.target.value;
                            setElectiveGroups(newGroups);
                          }}
                          className="flex-1 text-xs text-slate-800 bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 transition outline-none"
                          placeholder="Ders Adı"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newGroups = [...electiveGroups];
                            newGroups[groupIdx].courses.splice(courseIdx, 1);
                            setElectiveGroups(newGroups);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                          title="Dersi Sil"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                    
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const newGroups = [...electiveGroups];
                          newGroups[groupIdx].courses.push('');
                          setElectiveGroups(newGroups);
                        }}
                        className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/60 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        <Plus size={13} /> Yeni Ders Ekle
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Yeni Grup Ekle Butonu */}
              <button
                type="button"
                onClick={() => {
                  setElectiveGroups([...electiveGroups, { name: 'YENİ GRUP', courses: [''] }]);
                }}
                className="w-full py-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={16} /> Yeni Grup Ekle
              </button>
            </div>

            {/* Modal Footer (Sabit) */}
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-white border-t border-slate-200 shrink-0">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleResetToDefaultElectives}
                leftIcon={<RotateCcw size={14} />}
                className="text-xs text-slate-600 border-slate-300 hover:bg-slate-50"
              >
                Varsayılanlara Sıfırla
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsElectiveSettingsOpen(false)}
                  className="text-xs"
                >
                  İptal
                </Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  size="sm"
                  onClick={handleSaveElectiveSettings}
                  leftIcon={<Check size={14} />}
                  className="text-xs font-semibold"
                >
                  Değişiklikleri Kaydet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  );
}
