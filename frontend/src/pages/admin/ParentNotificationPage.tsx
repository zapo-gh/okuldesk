import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { printPdfBlob } from '../../utils/printPdf';
import { PageHeader } from '../../components/ui/PageHeader';
import { FileText, Users, User, Calendar, CheckSquare, Square, Download, AlertTriangle, UserCheck, Loader2, Info, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface Student {
  id: string;
  fullName: string;
  className: string;
  schoolNumber: string;
  status: string;
}

interface Parent {
  id: string;
  fullName: string;
  phone: string;
}

interface StaffMember {
  id: string;
  name: string;
  title: string;
}

export default function ParentNotificationPage() {
  const [students,        setStudents]        = useState<Student[]>([]);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [absenceDay,      setAbsenceDay]      = useState<5 | 15 | 25>(5);
  const [meetingDate,     setMeetingDate]      = useState(new Date().toISOString().slice(0, 10));
  const [excusedDays,     setExcusedDays]     = useState('');
  const [unexcusedDays,   setUnexcusedDays]   = useState('');
  const [includeParent,   setIncludeParent]   = useState(false);
  const [selectedParentId,setSelectedParentId]= useState('');
  const [customParentName,setCustomParentName]= useState('');
  const [studentParents,  setStudentParents]  = useState<Parent[]>([]);

  const [counselors,      setCounselors]      = useState<StaffMember[]>([]);
  const [viceDirectors,   setViceDirectors]   = useState<StaffMember[]>([]);
  const [selectedCounselorName, setSelectedCounselorName] = useState('');
  const [selectedViceDirectorName, setSelectedViceDirectorName] = useState('');

  const [loading,         setLoading]         = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  
  const [success,         setSuccess]         = useState('');

  useEffect(() => {
    // Öğrencileri yükle
    api.get<{ success: boolean; data: { students: Student[] } }>('/students?limit=1000&status=ACTIVE')
      .then(res => {
        const list = res.data.data?.students || [];
        setStudents(list);
      })
      .catch(() => toast.error('Öğrenci listesi alınamadı.'))
      .finally(() => setLoadingStudents(false));

    // Personelleri yükle
    api.get<{ success: boolean; data: { staff: StaffMember[] } }>('/staff?role=REHBER_OGRETMEN')
      .then(res => {
        const list = res.data.data?.staff || [];
        setCounselors(list);
        if (list.length > 0) setSelectedCounselorName(list[0].name);
      })
      .catch(console.error);

    api.get<{ success: boolean; data: { staff: StaffMember[] } }>('/staff?role=MUDUR_YARDIMCISI')
      .then(res => {
        const list = res.data.data?.staff || [];
        setViceDirectors(list);
        if (list.length > 0) setSelectedViceDirectorName(list[0].name);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setStudentParents([]);
    setSelectedParentId('');
    setCustomParentName('');
    if (!selectedStudent) return;
    api.get<{ success: boolean; data: Student & { parents: Parent[] } }>(`/students/${selectedStudent.id}`)
      .then(res => {
        const parents = res.data.data?.parents || [];
        setStudentParents(parents);
        if (parents.length > 0) setSelectedParentId(parents[0].id);
      })
      .catch(() => {});
  }, [selectedStudent]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);


  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.schoolNumber.includes(q) || s.className.toLowerCase().includes(q);
  }).slice(0, 100);

  const totalDays = (parseInt(excusedDays) || 0) + (parseInt(unexcusedDays) || 0);

  const selectStudent = (s: Student) => {
    setSelectedStudent(s);
    void 0;
    setSuccess('');
  };

  const handleGenerate = async () => {
    if (!selectedStudent) { toast.error('Lütfen bir öğrenci seçin.'); return; }
    if (excusedDays === '') { toast.error('Özürlü devamsızlık günü zorunludur.'); return; }
    if (unexcusedDays === '') { toast.error('Özürsüz devamsızlık günü zorunludur.'); return; }
    if (includeParent && studentParents.length === 0 && !customParentName.trim()) {
      toast.error('Lütfen veli adını girin.'); return;
    }
    if (includeParent && selectedParentId === '__other__' && !customParentName.trim()) {
      toast.error('Lütfen veli adını girin.'); return;
    }

    void 0; setSuccess(''); setLoading(true);

    const parentName = includeParent
      ? (studentParents.length === 0 || selectedParentId === '__other__'
          ? customParentName.trim()
          : (studentParents.find(p => p.id === selectedParentId)?.fullName ?? ''))
      : '';

    try {
      const res = await api.post('/parent-notification/generate-pdf', {
        studentId: selectedStudent.id,
        absenceDay,
        meetingDate,
        parentName,
        counselorName: selectedCounselorName || undefined,
        viceDirectorName: selectedViceDirectorName || undefined,
        absenceData: { excusedDays, unexcusedDays, totalDays: String(totalDays) },
      }, { responseType: 'blob' });

      printPdfBlob(res.data);
      setSuccess(`${selectedStudent.fullName} için ${absenceDay}. gün Veli Bildirim Tutanağı yazdırılıyor...`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const absenceDayOptions: { value: 5 | 15 | 25; label: string; desc: string }[] = [
    { value: 5,  label: '5. Gün',  desc: '1. tebligat' },
    { value: 15, label: '15. Gün', desc: '2. tebligat + Komisyon' },
    { value: 25, label: '25. Gün', desc: '3. tebligat + Komisyon' },
  ];

  const canGenerate = !!selectedStudent && excusedDays !== '' && unexcusedDays !== '';

  return (
    <div className="space-y-4">
      <PageHeader
        title="ÖMYK Veli Devamsızlık Bildirimi"
        description="Öğrenci arayın, devamsızlık bilgilerini girin ve veli bildirim tutanağını PDF olarak oluşturun."
        icon={<FileText size={24} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* SOL KOLON: FORM GİRİŞİ */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users size={16} className="text-indigo-600" />
              <span>Tutanak Parametreleri & Bilgi Girişi</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">MEB Ortaöğretim Md. 36</span>
          </div>

          {/* 1. Öğrenci Seçimi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Öğrenci Seçimi
            </label>
            {!selectedStudent ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  {loadingStudents ? <Loader2 size={15} className="animate-spin text-indigo-500" /> : <Search size={15} />}
                </div>
                <input
                  type="text"
                  placeholder="Öğrenci adı, numarası veya sınıfı ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loadingStudents}
                  className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder:text-slate-400 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    title="Temizle"
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Dropdown Arama Sonuçları */}
                {searchQuery.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto scrollbar-thin">
                    {filteredStudents.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500 italic">Sonuç bulunamadı</div>
                    ) : (
                      <div className="p-1 space-y-0.5">
                        {filteredStudents.map(s => (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => { selectStudent(s); setSearchQuery(''); }}
                            className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition hover:bg-indigo-50 cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold bg-indigo-100 text-indigo-700">
                              {s.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-slate-800 truncate">{s.fullName}</div>
                              <div className="text-[10px] text-slate-500">Sınıf: {s.className} · No: {s.schoolNumber}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {selectedStudent.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-indigo-950 truncate">{selectedStudent.fullName}</p>
                    <p className="text-[11px] text-indigo-700 font-medium">{selectedStudent.className} · No: {selectedStudent.schoolNumber}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedStudent(null); setSearchQuery(''); }}
                  className="h-7 px-2.5 text-xs text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50"
                >
                  Değiştir
                </Button>
              </div>
            )}
          </div>

          {/* 2. Tebligat Kademesi (Kompakt 3'lü Segment Kontrolü) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              2. Tebligat Aşaması
            </label>
            <div className="grid grid-cols-3 gap-2">
              {absenceDayOptions.map(opt => {
                const active = absenceDay === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAbsenceDay(opt.value)}
                    className={`py-2 px-2 rounded-lg border text-center transition-all ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className={`text-[10px] truncate mt-0.5 ${active ? 'text-indigo-100 font-medium' : 'text-slate-400'}`}>
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Tarih & Devamsızlık Sayıları */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tutanak Tarihi
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 text-center">
                Özürlü Gün
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={excusedDays}
                onChange={e => setExcusedDays(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 text-center">
                Özürsüz Gün
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={unexcusedDays}
                onChange={e => setUnexcusedDays(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 text-center">
                Toplam
              </label>
              <div
                className={`h-[33px] flex items-center justify-center rounded-lg border text-xs font-black transition-colors ${
                  totalDays > 0
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {totalDays > 0 ? `${totalDays} gün` : '—'}
              </div>
            </div>
          </div>

          {/* 4. Komisyon Yetkilileri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Rehber Öğretmen
              </label>
              <select
                value={selectedCounselorName}
                onChange={e => setSelectedCounselorName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
              >
                <option value="">(Otomatik / Boş Bırak)</option>
                {counselors.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Müdür Yardımcısı
              </label>
              <select
                value={selectedViceDirectorName}
                onChange={e => setSelectedViceDirectorName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
              >
                <option value="">(Otomatik / Boş Bırak)</option>
                {viceDirectors.map(v => (
                  <option key={v.id} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Veli Bilgisi (İsteğe Bağlı) */}
          <div className="pt-2 border-t border-slate-100">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={includeParent}
                onChange={e => setIncludeParent(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>Veli bilgisini tutanağa ekle (İsteğe Bağlı)</span>
            </label>

            {includeParent && (
              <div className="mt-2 animate-in fade-in duration-150">
                {selectedStudent && studentParents.length > 0 ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedParentId}
                      onChange={e => { setSelectedParentId(e.target.value); setCustomParentName(''); }}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {studentParents.map(p => (
                        <option key={p.id} value={p.id}>{p.fullName} (Sistemdeki Veli)</option>
                      ))}
                      <option value="__other__">Diğer (Manuel Giriş)</option>
                    </select>
                    {selectedParentId === '__other__' && (
                      <input
                        type="text"
                        placeholder="Veli adı soyadı girin"
                        value={customParentName}
                        onChange={e => setCustomParentName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder={selectedStudent ? 'Kayıtlı veli yok — veli adını manuel girin' : 'Öğrenci seçince otomatik dolar'}
                    value={customParentName}
                    onChange={e => setCustomParentName(e.target.value)}
                    disabled={!selectedStudent}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* SAĞ KOLON: CANLI ÖZET & AKSİYON KARTI */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Tutanak Özeti & İşlem</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {absenceDay}. Gün
            </span>
          </div>

          {/* Öğrenci & Tutanak Bilgi Kartı */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Öğrenci:</span>
              <span className="font-bold text-slate-900 truncate max-w-[200px]">
                {selectedStudent ? selectedStudent.fullName : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Sınıf & No:</span>
              <span className="font-semibold text-slate-800">
                {selectedStudent ? `${selectedStudent.className} · No: ${selectedStudent.schoolNumber}` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Tutanak Tarihi:</span>
              <span className="font-semibold text-slate-800">
                {meetingDate ? new Date(meetingDate).toLocaleDateString('tr-TR') : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Tebligat Kademesi:</span>
              <span className="font-bold text-indigo-700">
                {absenceDay}. Gün ({absenceDay === 5 ? '1. Tebligat' : absenceDay === 15 ? '2. Tebligat + Komisyon' : '3. Tebligat + Komisyon'})
              </span>
            </div>

            {/* Devamsızlık Özeti Kutucuğu */}
            <div className="pt-1.5">
              <div className="text-[11px] font-bold text-slate-600 mb-1">Bildirilen Devamsızlık:</div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1.5 bg-white rounded border border-slate-200/70">
                  <div className="text-[10px] text-slate-400 font-medium">Özürlü</div>
                  <div className="text-xs font-bold text-slate-700">{excusedDays !== '' ? `${excusedDays}g` : '—'}</div>
                </div>
                <div className="p-1.5 bg-white rounded border border-slate-200/70">
                  <div className="text-[10px] text-slate-400 font-medium">Özürsüz</div>
                  <div className="text-xs font-bold text-slate-700">{unexcusedDays !== '' ? `${unexcusedDays}g` : '—'}</div>
                </div>
                <div className="p-1.5 bg-indigo-50/70 rounded border border-indigo-200/80">
                  <div className="text-[10px] text-indigo-600 font-medium">Toplam</div>
                  <div className="text-xs font-extrabold text-indigo-700">{totalDays > 0 ? `${totalDays}g` : '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mevzuat Bilgi Notu */}
          <div className="p-2.5 bg-amber-50/80 border border-amber-200/70 rounded-lg text-[11px] text-amber-800 leading-snug">
            <div className="flex items-start gap-1.5">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>MEB OÖKY Md. 36/5:</strong> Özürsüz 5, 15 ve 25. gün devamsızlıklarında veliye bildirim yapılarak ÖMYK komisyon tutanağı düzenlenir.
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
            disabled={loading || loadingStudents || !canGenerate}
            className="w-full h-10 justify-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Hazırlanıyor...</>
            ) : (
              <><Download size={16} /> Tutanak Oluştur ve Yazdır</>
            )}
          </Button>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Sınıf rehber öğretmeni otomatik eklenir</span>
            <span>KVKK Uyumlu</span>
          </div>
        </div>
      </div>
    </div>
  );
}
