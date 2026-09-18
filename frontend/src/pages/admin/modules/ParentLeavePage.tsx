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
      const exists = dateRanges.some(r => r.isHalfDay && r.startDate === tempStartDate);
      if (exists) return toast.error('Bu tarih daha önce eklenmiş.');
      setDateRanges([...dateRanges, { startDate: tempStartDate, isHalfDay: true }]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return toast.error('Lütfen bir öğrenci seçin');
    if (dateRanges.length === 0) return toast.error('Lütfen en az bir izin tarihi ekleyin');
    
    const newLeave: StudentLeave = {
      id: 'temp-' + Date.now(),
      studentId: selectedStudent.id,
      student: selectedStudent,
      dateRanges: JSON.stringify(dateRanges),
      reason,
      academicYear: settings?.academicYear || '2025-2026',
      createdAt: new Date().toISOString()
    };
    
    setPrintData(newLeave);
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
    setTempStartDate(new Date().toISOString().slice(0, 10));
    setTempEndDate(new Date().toISOString().slice(0, 10));
    setReason('');
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.schoolNumber.includes(searchQuery) ||
    s.className.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veli İzin Dilekçesi"
        description="Öğrenciler için veli izin belgesi oluşturun ve doğrudan yazdırın."
        icon={<FileSignature size={28} />}
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 w-full max-w-6xl mx-auto">
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
                  <button type="button" onClick={() => setSelectedStudent(null)} className="text-indigo-500 hover:text-indigo-700">Değiştir</button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Öğrenci adı, no veya sınıf ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map(s => (
                          <div key={s.id} onClick={() => { setSelectedStudent(s); setSearchQuery(''); }} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0">
                            <span className="font-bold text-slate-700">{s.schoolNumber}</span> - {s.fullName} <span className="text-xs text-slate-500 ml-2">({s.className})</span>
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
                    const typeLabel = range.isHalfDay ? '(Yarım Gün)' : '(Tam Gün)';
                    return (
                      <div key={idx} className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                        {label} <span className="text-xs text-slate-500">{typeLabel}</span>
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
            <Button type="submit" className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
              <Printer size={18} /> Yazdır
            </Button>
          </div>
        </form>
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
