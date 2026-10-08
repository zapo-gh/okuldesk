import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useSettings } from '../../../context/SettingsContext';
import { useReactToPrint } from 'react-to-print';
import MesemNakilPrintTemplate, { MesemNakilData } from './print/MesemNakilPrintTemplate';
import KayitDondurmaPrintTemplate, { KayitDondurmaData } from './print/KayitDondurmaPrintTemplate';
import { FileBox, Search, Printer } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface Student {
  id: string;
  fullName: string;
  schoolNumber: string;
  className: string;
}

export default function PetitionsPage() {
  const { settings } = useSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [petitionType, setPetitionType] = useState<'MESEM_NAKIL' | 'KAYIT_DONDURMA' | null>(null);

  // Parent & Student Extra Info (Fetched from 360)
  const [studentTcNo, setStudentTcNo] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentTcNo, setParentTcNo] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentRelation, setParentRelation] = useState('Velisi');
  
  // Specific Info
  const [mesemName, setMesemName] = useState('');
  const [freezeReason, setFreezeReason] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));

  // Print State
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({ 
    contentRef: printRef, 
    documentTitle: 'Veli_Dilekcesi',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setStudentTcNo('');
    setParentName('');
    setParentPhone('');
    setParentTcNo('');
    setParentAddress('');
    
    if (settings?.academicYear) setAcademicYear(settings.academicYear);

    try {
      const res = await api.get(`/students/360/${student.id}`);
      const data = res.data?.data;
      if (data) {
        if (data.student?.tcNo) setStudentTcNo(data.student.tcNo);
        
        if (data.parents && data.parents.length > 0) {
          const parent = data.parents[0];
          setParentName(parent.fullName || '');
          
          if (parent.contacts && parent.contacts.length > 0) {
            setParentPhone(parent.contacts[0].phone || '');
            const contactName = parent.contacts[0].name?.toLowerCase() || '';
            if (contactName.includes('anne')) setParentRelation('Annesi');
            else if (contactName.includes('baba')) setParentRelation('Babası');
            else setParentRelation('Velisi');
          }
        }
      }
    } catch (err) {
      console.log('Öğrenci detayları alınamadı', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return toast.error('Lütfen bir öğrenci seçin');
    if (!petitionType) return toast.error('Lütfen bir dilekçe türü seçin');
    
    // Validate required fields based on type
    if (petitionType === 'MESEM_NAKIL' && !mesemName) {
      return toast.error('Lütfen geçiş yapılacak kurumu girin.');
    }
    if (petitionType === 'KAYIT_DONDURMA' && !freezeReason) {
      return toast.error('Lütfen kayıt dondurma gerekçesini girin.');
    }

    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.schoolNumber.includes(searchQuery) ||
    s.className.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const getMesemData = (): MesemNakilData => ({
    student: {
      fullName: selectedStudent?.fullName || '',
      tcNo: studentTcNo,
      schoolNumber: selectedStudent?.schoolNumber || '',
      className: selectedStudent?.className || ''
    },
    parent: {
      fullName: parentName,
      tcNo: parentTcNo,
      phone: parentPhone,
      relation: parentRelation
    },
    mesemName,
    date: documentDate
  });

  const getKayitDondurmaData = (): KayitDondurmaData => ({
    student: {
      fullName: selectedStudent?.fullName || '',
      tcNo: studentTcNo,
      schoolNumber: selectedStudent?.schoolNumber || '',
      className: selectedStudent?.className || ''
    },
    parent: {
      fullName: parentName,
      tcNo: parentTcNo,
      phone: parentPhone,
      relation: parentRelation,
      address: parentAddress
    },
    reason: freezeReason,
    academicYear,
    date: documentDate
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veli Dilekçeleri"
        description="MESEM geçişi, kayıt dondurma ve diğer mazeretler için veli dilekçelerini hızlıca oluşturun."
        icon={<FileBox size={28} />}
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-4xl">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
          <FileBox className="text-indigo-600" size={20} /> Dilekçe Formu
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Öğrenci Seçimi */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Öğrenci Seçimi</label>
                {selectedStudent ? (
                  <div className="flex justify-between items-center px-3 py-2 border border-indigo-200 bg-indigo-50 rounded-lg text-sm">
                    <span className="font-semibold text-indigo-900">{selectedStudent.schoolNumber} - {selectedStudent.fullName} ({selectedStudent.className})</span>
                    <button type="button" onClick={() => setSelectedStudent(null)} className="text-indigo-500 hover:text-indigo-700 font-medium">Değiştir</button>
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
                            <div key={s.id} onClick={() => handleStudentSelect(s)} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0">
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

              {/* Dilekçe Türü */}
              {selectedStudent && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Dilekçe Türü</label>
                  <select
                    value={petitionType || ''}
                    onChange={(e) => setPetitionType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Dilekçe Türü Seçin --</option>
                    <option value="MESEM_NAKIL">MESEM Geçiş Dilekçesi</option>
                    <option value="KAYIT_DONDURMA">Kayıt Dondurma Dilekçesi</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {petitionType && selectedStudent && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h3 className="font-semibold text-slate-800 text-sm border-b pb-2">Eksik Bilgileri Tamamlayın</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tarih</label>
                      <input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Öğrenci T.C. No</label>
                      <input type="text" value={studentTcNo} onChange={(e) => setStudentTcNo(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" placeholder="11 Haneli TC" maxLength={11} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Veli Adı Soyadı</label>
                      <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Veli T.C. No</label>
                      <input type="text" value={parentTcNo} onChange={(e) => setParentTcNo(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" placeholder="11 Haneli TC" maxLength={11} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Veli Telefon</label>
                      <input type="text" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Yakınlık (Annesi/Babası vs)</label>
                      <input type="text" value={parentRelation} onChange={(e) => setParentRelation(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
                    </div>
                  </div>

                  {petitionType === 'MESEM_NAKIL' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Geçiş Yapılacak Kurum</label>
                      <input type="text" value={mesemName} onChange={(e) => setMesemName(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" placeholder="Örn: Akhisar Mesleki Eğitim Merkezi" />
                    </div>
                  )}

                  {petitionType === 'KAYIT_DONDURMA' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Kayıt Dondurma Gerekçesi</label>
                        <textarea value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm resize-none" rows={2} placeholder="Örn: Kur'an Kursu'nda Hafızlık Eğitimi" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Veli Adresi</label>
                          <textarea value={parentAddress} onChange={(e) => setParentAddress(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm resize-none" rows={2} placeholder="Mahalle, sokak, no..." />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button type="submit" disabled={!selectedStudent || !petitionType} className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
              <Printer size={18} /> Önizle ve Yazdır
            </Button>
          </div>
        </form>
      </div>

      {/* Hidden Print Area */}
      <div className="hidden">
        <div ref={printRef}>
          {petitionType === 'MESEM_NAKIL' && <MesemNakilPrintTemplate data={getMesemData()} settings={settings} />}
          {petitionType === 'KAYIT_DONDURMA' && <KayitDondurmaPrintTemplate data={getKayitDondurmaData()} settings={settings} />}
        </div>
      </div>
    </div>
  );
}
