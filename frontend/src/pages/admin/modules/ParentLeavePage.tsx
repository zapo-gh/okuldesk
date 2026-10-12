import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useSettings } from '../../../context/SettingsContext';
import { useReactToPrint } from 'react-to-print';
import ParentLeavePrintTemplate from './print/ParentLeavePrintTemplate';
import { FileSignature, Plus, Search, Printer, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface Student {
  id: string;
  fullName: string;
  schoolNumber: string;
  className: string;
}

interface DateRange {
  startDate: string;
  endDate?: string;
  isHalfDay: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
}

interface StudentLeave {
  id: string;
  studentId: string;
  student: { fullName: string; className: string; schoolNumber: string };
  dateRanges: string; // JSON string from backend
  reason: string;
  academicYear: string;
  createdAt: string;
}

export default function ParentLeavePage() {
  const { settings } = useSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [reason, setReason] = useState('');
  
  const [dateRanges, setDateRanges] = useState<DateRange[]>([]);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'morning' | 'afternoon'>('afternoon');
  const [tempStartDate, setTempStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [tempEndDate, setTempEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Print State
  const printRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<StudentLeave | null>(null);
  const handlePrint = useReactToPrint({ 
    contentRef: printRef, 
    documentTitle: 'Veli_Izin_Dilekcesi',
    pageStyle: `
      @page { size: A5 landscape !important; margin: 0 !important; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    `
  });

  useEffect(() => {
    fetchData();
  }, [settings?.academicYear]);

  const fetchData = async () => {
    if (!settings?.academicYear) return;
    setLoading(true);
    try {
      const res = await api.get('/students?limit=1000');
      setStudents(res.data.data.students || []);
    } catch (err: any) {
      toast.error('Öğrenci verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDate = () => {
    if (isHalfDay) {
      if (!tempStartDate) return toast.error('Lütfen tarih seçin');
      const exists = dateRanges.some(r => r.isHalfDay && r.startDate === tempStartDate && r.halfDayPeriod === halfDayPeriod);
      if (exists) return toast.error('Bu tarih ve zaman dilimi daha önce eklenmiş.');
      setDateRanges([...dateRanges, { startDate: tempStartDate, isHalfDay: true, halfDayPeriod }]);
    } else {
      if (!tempStartDate || !tempEndDate) return toast.error('Lütfen tarihleri seçin');
      if (new Date(tempStartDate) > new Date(tempEndDate)) return toast.error('Başlangıç tarihi bitiş tarihinden sonra olamaz');
      const exists = dateRanges.some(r => !r.isHalfDay && r.startDate === tempStartDate && r.endDate === tempEndDate);
      if (exists) return toast.error('Bu tarih aralığı daha önce eklenmiş.');
      setDateRanges([...dateRanges, { startDate: tempStartDate, endDate: tempEndDate, isHalfDay: false }]);
    }
  };

  const handleRemoveDate = (index: number) => {
    setDateRanges(dateRanges.filter((_, i) => i !== index));
  };

  // Recent leaves history
  const [recentLeaves, setRecentLeaves] = useState<StudentLeave[]>(() => {
    try {
      const saved = localStorage.getItem('okuldesk_recent_leaves');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentLeave = (leave: StudentLeave) => {
    try {
      const updated = [leave, ...recentLeaves.filter(item => item.id !== leave.id)].slice(0, 5);
      setRecentLeaves(updated);
      localStorage.setItem('okuldesk_recent_leaves', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handlePrintRecent = (leave: StudentLeave) => {
    setPrintData(leave);
    setTimeout(() => {
      handlePrint();
    }, 50);
  };

  const clearRecentLeaves = () => {
    setRecentLeaves([]);
    localStorage.removeItem('okuldesk_recent_leaves');
    toast.success('Geçmiş temizlendi');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return toast.error('Lütfen bir öğrenci seçin');
    if (dateRanges.length === 0) return toast.error('Lütfen en az bir izin tarihi ekleyin');
    
    const newLeave: StudentLeave = {
      id: 'leave-' + Date.now(),
      studentId: selectedStudent.id,
      student: selectedStudent,
      dateRanges: JSON.stringify(dateRanges),
      reason,
      academicYear: settings?.academicYear || '2025-2026',
      createdAt: new Date().toISOString()
    };
    
    setPrintData(newLeave);
    saveRecentLeave(newLeave);
    setTimeout(() => {
      handlePrint();
      resetForm();
    }, 50);
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setSearchQuery('');
    setDateRanges([]);
    setIsHalfDay(false);
    setHalfDayPeriod('afternoon');
    setTempStartDate(new Date().toISOString().slice(0, 10));
    setTempEndDate(new Date().toISOString().slice(0, 10));
    setReason('');
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.schoolNumber.includes(searchQuery) ||
    s.className.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const schoolName = settings?.schoolName || '................................................... LİSESİ';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veli İzin Dilekçesi"
        description="Öğrenciler için veli izin belgesi oluşturun ve doğrudan yazdırın."
        icon={<FileSignature size={28} />}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* SOL KOLON: FORM */}
        <div className="xl:col-span-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
            <FileSignature className="text-indigo-600" size={20} /> İzin Belgesi Formu
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              
              {/* Öğrenci Seçimi */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Öğrenci Seçimi</label>
                {selectedStudent ? (
                  <div className="flex justify-between items-center px-3 py-2 border border-indigo-200 bg-indigo-50 rounded-lg text-sm">
                    <span className="font-semibold text-indigo-900">{selectedStudent.schoolNumber} - {selectedStudent.fullName} ({selectedStudent.className})</span>
                    <button type="button" onClick={() => setSelectedStudent(null)} className="text-indigo-600 hover:text-indigo-800 font-medium">Değiştir</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Öğrenci adı, no veya sınıf ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                        title="Temizle"
                      >
                        <X size={15} />
                      </button>
                    )}
                    {searchQuery && (
                      <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map(s => (
                            <div 
                              key={s.id} 
                              onClick={() => { setSelectedStudent(s); setSearchQuery(''); }} 
                              className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-sm transition flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-800">{s.fullName}</span>
                              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">No: {s.schoolNumber} • {s.className}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-500 text-center">Öğrenci bulunamadı</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tarih Ekleme */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-2">İzin Tarihi Ekle</label>
                
                {/* Yarım Gün Seçeneği */}
                <div className="flex items-center gap-2 mb-3">
                  <input type="checkbox" id="isHalfDay" checked={isHalfDay} onChange={(e) => setIsHalfDay(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  <label htmlFor="isHalfDay" className="text-sm font-medium text-slate-700 cursor-pointer">Bu tarih yarım gün</label>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">{isHalfDay ? 'Tarih' : 'Başlangıç Tarihi'}</label>
                    <input type="date" value={tempStartDate} onChange={(e) => { setTempStartDate(e.target.value); setTempEndDate(e.target.value); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                  {!isHalfDay && (
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">Bitiş Tarihi</label>
                      <input type="date" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                  )}
                  {isHalfDay && (
                    <div className="shrink-0">
                      <label className="block text-xs text-slate-500 mb-1">Zaman Dilimi</label>
                      <div className="flex bg-slate-200/80 p-0.5 rounded-lg h-[38px] items-center border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setHalfDayPeriod('morning')}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            halfDayPeriod === 'morning'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Öğleden Önce
                        </button>
                        <button
                          type="button"
                          onClick={() => setHalfDayPeriod('afternoon')}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            halfDayPeriod === 'afternoon'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Öğleden Sonra
                        </button>
                      </div>
                    </div>
                  )}
                  <Button type="button" onClick={handleAddDate} className="bg-slate-800 text-white hover:bg-slate-900 shrink-0">
                    <Plus size={16} className="mr-1" /> Ekle
                  </Button>
                </div>

                {/* Eklenen Tarihler */}
                {dateRanges.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {dateRanges.map((range, idx) => {
                      const s = new Date(range.startDate).toLocaleDateString('tr-TR');
                      const e = range.endDate ? new Date(range.endDate).toLocaleDateString('tr-TR') : s;
                      const label = s === e ? s : `${s} - ${e}`;
                      const typeLabel = range.isHalfDay
                        ? `(Yarım Gün - ${range.halfDayPeriod === 'morning' ? 'Öğleden Önce' : 'Öğleden Sonra'})`
                        : '(Tam Gün)';
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                          {label} <span className="text-xs text-indigo-600 font-semibold">{typeLabel}</span>
                          <button type="button" onClick={() => handleRemoveDate(idx)} className="text-slate-400 hover:text-red-500 ml-1 focus:outline-none">
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mazeret */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mazeret Nedeni (Opsiyonel)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Örn: Ailevi nedenler, hastalık vb." rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" />
              </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={resetForm}>Temizle</Button>
              <Button type="submit" disabled={!selectedStudent || dateRanges.length === 0} className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                <Printer size={18} /> Yazdır
              </Button>
            </div>
          </form>
        </div>

        {/* SAĞ KOLON: CANLI A5 ÖNİZLEME */}
        <div className="xl:col-span-6 space-y-4">
          <div className="bg-slate-100/90 rounded-xl border border-slate-200/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Canlı Belge Önizlemesi (A5 Yatay)
              </span>
              <span className="text-xs text-slate-500">MEB Yönetmelik Md. 36/7</span>
            </div>

            {/* Minyatür A5 Kağıt */}
            <div className="bg-white rounded-lg shadow-md border border-slate-300/80 p-5 text-slate-800 font-serif text-[11px] leading-relaxed transition-all">
              <div className="text-center font-bold text-xs uppercase mb-3 text-slate-900 border-b pb-2 border-slate-100">
                {schoolName} MÜDÜRLÜĞÜNE
              </div>

              <p className="text-justify indent-4 mb-3 leading-normal">
                Velisi bulunduğum okulunuz{' '}
                <strong className="text-indigo-900 bg-indigo-50 px-1 rounded">
                  {selectedStudent ? selectedStudent.className : '......'}
                </strong>{' '}
                sınıfı,{' '}
                <strong className="text-indigo-900 bg-indigo-50 px-1 rounded">
                  {selectedStudent ? selectedStudent.schoolNumber : '......'}
                </strong>{' '}
                numaralı{' '}
                <strong className="text-indigo-900 bg-indigo-50 px-1 rounded">
                  {selectedStudent ? selectedStudent.fullName : '...........................................'}
                </strong>{' '}
                isimli öğrencinin, aşağıda belirtilen tarihlerde
                {reason ? (
                  <span> <strong className="text-slate-900">{reason}</strong> mazereti nedeniyle </span>
                ) : (
                  ' geçerli mazereti nedeniyle '
                )}
                okula devam edemeyeceğini bildirir; <strong>Millî Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliği'nin 36 ncı maddesinin 7 nci fıkrası</strong> hükmü uyarınca belirtilen tarihlerde <strong>izinli sayılması</strong> ve devamsızlığının <strong>özürlü devamsızlık</strong> olarak işlenmesini arz ederim.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 my-2.5">
                <div className="font-bold text-[10px] text-slate-600 uppercase tracking-wider mb-1">İzin İstenilen Tarihler:</div>
                {dateRanges.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {dateRanges.map((r, i) => {
                      const s = new Date(r.startDate).toLocaleDateString('tr-TR');
                      const e = r.endDate ? new Date(r.endDate).toLocaleDateString('tr-TR') : s;
                      const label = s === e ? s : `${s} - ${e}`;
                      const typeLabel = r.isHalfDay
                        ? `(Yarım Gün - ${r.halfDayPeriod === 'morning' ? 'ÖÖ' : 'ÖS'})`
                        : '(Tam Gün)';
                      return (
                        <span key={i} className="bg-white border border-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                          {label} <span className="text-indigo-600 font-normal">{typeLabel}</span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-slate-400 italic text-[10px]">Henüz tarih eklenmedi (Formdan tarih ekleyin)</span>
                )}
              </div>

              <div className="flex justify-between items-end mt-4 pt-2 border-t border-slate-100 text-[10px]">
                <div>
                  <div className="font-bold text-slate-700">Veli İletişim Bilgileri:</div>
                  <div className="text-slate-500">Adres: ................................................................</div>
                  <div className="text-slate-500">Telefon: .............................................................</div>
                </div>
                <div className="text-center min-w-[120px]">
                  <div className="text-slate-500 mb-1">{new Date().toLocaleDateString('tr-TR')}</div>
                  <div className="font-bold text-slate-800">Veli Adı Soyadı / İmza</div>
                  <div className="text-slate-400 mt-2">.......................................</div>
                </div>
              </div>
            </div>
          </div>

          {/* HIZLI GEÇMİŞ (SON YAZDIRILANLAR) */}
          {recentLeaves.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">Son Oluşturulan İzin Dilekçeleri ({recentLeaves.length})</span>
                <button
                  type="button"
                  onClick={clearRecentLeaves}
                  className="text-[11px] text-slate-400 hover:text-red-600 transition"
                >
                  Geçmişi Temizle
                </button>
              </div>
              <div className="space-y-2">
                {recentLeaves.map(leave => (
                  <div key={leave.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 text-xs transition">
                    <div>
                      <div className="font-bold text-slate-800">
                        {leave.student.schoolNumber} - {leave.student.fullName} ({leave.student.className})
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(leave.createdAt).toLocaleString('tr-TR')} {leave.reason ? `• ${leave.reason}` : ''}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintRecent(leave)}
                      className="text-xs gap-1 py-1 h-7 border-slate-300"
                    >
                      <Printer size={13} /> Yeniden Yazdır
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Print Area */}
      <div className="hidden">
        <div ref={printRef}>
          {printData && <ParentLeavePrintTemplate data={printData} settings={settings} />}
        </div>
      </div>
    </div>
  );
}
