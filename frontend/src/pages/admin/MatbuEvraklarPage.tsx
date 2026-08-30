import { useState, useEffect } from 'react';
import { FileText, Printer, Download, Search, FileSymlink, Settings, Plus, Trash2, X } from 'lucide-react';
import api from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { AlanTercihFormuPrint } from '../../components/print/AlanTercihFormuPrint';
import { SecmeliDersDilekcesiPrint } from '../../components/print/SecmeliDersDilekcesiPrint';
import { OgleArasiDilekcesiPrint } from '../../components/print/OgleArasiDilekcesiPrint';
import { VeliOkulSozlesmesiPrint } from '../../components/print/VeliOkulSozlesmesiPrint';
import { downloadElementAsPDF } from '../../utils/pdfExport';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';

const DOCUMENTS = [
  {
    id: 1,
    title: 'Alan Tercih Formu',
    description: 'Öğrencilerin alan seçimleri için doldurması gereken standart form.',
    file: '/docs/alan-tercih-formu.pdf',
    component: AlanTercihFormuPrint
  },
  {
    id: 2,
    title: 'Seçmeli Ders Dilekçesi',
    description: 'Öğrencilerin seçmeli ders tercihlerini bildirdiği dilekçe örneği.',
    file: '/docs/secmeli-ders-dilekcesi.pdf',
    component: SecmeliDersDilekcesiPrint,
    hasSettings: true
  },
  {
    id: 3,
    title: 'Öğle Arası Dilekçesi',
    description: 'Öğle arasında okul dışına çıkmak isteyen öğrenciler için veli izin dilekçesi.',
    file: '/docs/ogle-arasi-dilekcesi.pdf',
    component: OgleArasiDilekcesiPrint
  },
  {
    id: 4,
    title: 'Öğrenci Veli Okul Sözleşmesi',
    description: 'Kayıt sırasında veya dönem başında veli ile imzalanan standart sözleşme.',
    file: '/docs/ogrenci-veli-okul-sozlesmesi.pdf',
    component: VeliOkulSozlesmesiPrint
  }
];

export default function MatbuEvraklarPage() {
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
    // Default
    setElectiveGroups([
      { name: 'İNSAN, TOPLUM VE BİLİM', courses: ['ASTRONOMİ VE UZAY BİLİMLERİ', 'SOSYAL BİLİM ÇALIŞMALARI', 'BİLİŞİM TEKNOLOJİLERİ VE YAZILIM', 'PROJE TASARIMI VE UYGULAMALARI', 'DÜŞÜNME EĞİTİMİ', 'DEMOKRASİ VE İNSAN HAKLARI', 'METİN TAHLİLLERİ', 'SEÇMELİ İKİNCİ YABANCI DİL'] },
      { name: 'DİN, AHLÂK VE DEĞER', courses: ['KUR’AN-I KERİM', 'PEYGAMBERİMİZİN HAYATI', 'TEMEL DİNÎ BİLGİLER'] },
      { name: 'KÜLTÜR, SANAT VE SPOR', courses: ['TÜRK SOSYAL HAYATINDA AİLE', 'İSLAM BİLİM TARİHİ', 'SPOR EĞİTİMİ', 'SANAT EĞİTİMİ'] }
    ]);
  };

  const handleSaveElectiveSettings = () => {
    localStorage.setItem('okuldesk_elective_courses_v1', JSON.stringify(electiveGroups));
    toast.success('Seçmeli ders ayarları kaydedildi.');
    setIsElectiveSettingsOpen(false);
  };

  useEffect(() => {
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

    // Öğrenci listesini çek (Tümünü veya max 500)
    api.get('/students?limit=1000').then((res: any) => {
      const fetchedStudents = res.data?.data?.students || [];
      // Sınıf adına göre mantıksal sıralama (9. sınıflar 10. sınıflardan önce gelsin)
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
    // Component'in render olması için kısa bir süre bekleyip yazdır
    setTimeout(() => {
      window.print();
      // Yazdırma penceresi kapandıktan sonra aktif dökümanı sıfırlayabiliriz (isteğe bağlı)
      setTimeout(() => setActiveDocId(null), 1000);
    }, 100);
  };

  const handleDownload = async (docId: number, docTitle: string) => {
    setActiveDocId(docId);
    const loadingToast = toast.loading('PDF hazırlanıyor, lütfen bekleyin...');
    
    // DOM'un güncellenmesi ve render edilmesi için biraz bekliyoruz
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
    }, 500); // html2canvas'ın resmi tam olarak alabilmesi için timeout süresini uzattık
  };

  const selectedStudent = Array.isArray(students) ? students.find(s => s.id === selectedStudentId) || null : null;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Kayıt Evrakları"
          description="Standart okul formlarını yazdırın veya indirin"
          icon={<FileSymlink size={28} className="text-gray-700" />}
        />
      </div>

      {/* Öğrenci Seçim Kartı */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 print:hidden">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Search size={24} />
          </div>
          <div className="flex-1 relative">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Öğrenci Seçin (Otomatik Doldurma İçin)
            </label>
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                placeholder="Öğrenci numarası veya adıyla arayın..."
                value={selectedStudent ? `${selectedStudent.className ? selectedStudent.className + ' - ' : ''}${selectedStudent.schoolNumber} - ${selectedStudent.fullName}` : searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedStudentId('');
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div 
                    className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedStudentId('');
                      setSearchQuery('');
                      setIsDropdownOpen(false);
                    }}
                  >
                    -- Öğrenci Seçimini Temizle --
                  </div>
                  {Array.isArray(students) && students
                    .filter(s => `${s.className || ''} ${s.schoolNumber || ''} ${s.fullName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(s => (
                    <div 
                      key={s.id} 
                      className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer text-gray-700"
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                    >
                      {s.className ? `${s.className} - ` : ''} {s.schoolNumber} - {s.fullName}
                    </div>
                  ))}
                  {Array.isArray(students) && students.filter(s => `${s.className || ''} ${s.schoolNumber || ''} ${s.fullName || ''}`.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-500 italic">
                      Öğrenci bulunamadı.
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Listeden bir öğrenci seçtiğinizde formdaki bilgiler (ad, soyad, sınıf vb.) otomatik doldurulur.
            </p>
          </div>
        </div>
      </div>

      {/* Evrak Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
        {DOCUMENTS.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                <FileText size={22} />
              </div>
              <h3 className="m-0 text-base font-bold text-gray-900 leading-tight">
                {doc.title}
              </h3>
            </div>
            
            <p className="text-gray-500 text-sm mb-6 flex-1">
              {doc.description}
            </p>

            <div className="flex gap-2">
              <Button
                onClick={() => handlePrint(doc.id)}
                variant="primary"
                className="flex-1"
                leftIcon={<Printer size={16} />}
              >
                Yazdır
              </Button>
              
              <Button
                onClick={() => handleDownload(doc.id, doc.title)}
                variant="secondary"
                className="px-3"
                title="İndir (PDF)"
              >
                <Download size={18} />
              </Button>

              {doc.hasSettings && (
                <Button
                  onClick={() => {
                    loadElectiveCourses();
                    setIsElectiveSettingsOpen(true);
                  }}
                  variant="outline"
                  className="px-3 text-gray-600 hover:text-indigo-600 border-gray-300 hover:border-indigo-600"
                  title="Dersleri Ayarla"
                >
                  <Settings size={18} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Yazdırma Modülü - Ekranda gizli, CSS ile @media print'te görünür olacak */}
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

      {/* Seçmeli Ders Ayar Modalı */}
      {isElectiveSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="fixed inset-0 bg-gray-900/60 transition-opacity" onClick={() => setIsElectiveSettingsOpen(false)}></div>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] z-10 relative">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-indigo-600" />
                Seçmeli Ders Ayarları
              </h2>
              <button onClick={() => setIsElectiveSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-gray-50/50">
              {electiveGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => {
                        const newGroups = [...electiveGroups];
                        newGroups[groupIdx].name = e.target.value;
                        setElectiveGroups(newGroups);
                      }}
                      className="flex-1 font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:ring-0 px-0 py-1 transition-colors outline-none"
                      placeholder="Grup Adı (Örn: İNSAN, TOPLUM VE BİLİM)"
                    />
                    <button
                      onClick={() => {
                        if(confirm('Bu grubu ve içindeki tüm dersleri silmek istediğinize emin misiniz?')) {
                          setElectiveGroups(electiveGroups.filter((_, i) => i !== groupIdx));
                        }
                      }}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Grubu Sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {group.courses.map((course, courseIdx) => (
                      <div key={courseIdx} className="flex items-center gap-2 pl-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0"></div>
                        <input
                          type="text"
                          value={course}
                          onChange={(e) => {
                            const newGroups = [...electiveGroups];
                            newGroups[groupIdx].courses[courseIdx] = e.target.value;
                            setElectiveGroups(newGroups);
                          }}
                          className="flex-1 text-sm border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:ring-0 px-0 py-1 transition-colors outline-none text-gray-700"
                          placeholder="Ders Adı"
                        />
                        <button
                          onClick={() => {
                            const newGroups = [...electiveGroups];
                            newGroups[groupIdx].courses.splice(courseIdx, 1);
                            setElectiveGroups(newGroups);
                          }}
                          className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    
                    <div className="pl-4 pt-2">
                      <button
                        onClick={() => {
                          const newGroups = [...electiveGroups];
                          newGroups[groupIdx].courses.push('');
                          setElectiveGroups(newGroups);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={14} /> Yeni Ders Ekle
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => {
                  setElectiveGroups([...electiveGroups, { name: 'YENİ GRUP', courses: [''] }]);
                }}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 bg-white"
              >
                <Plus size={20} /> Yeni Grup Ekle
              </button>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
              <Button variant="ghost" onClick={() => setIsElectiveSettingsOpen(false)}>
                İptal
              </Button>
              <Button variant="primary" onClick={handleSaveElectiveSettings}>
                Değişiklikleri Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
