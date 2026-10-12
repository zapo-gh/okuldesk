import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useSettings } from '../../../context/SettingsContext';
import { useReactToPrint } from 'react-to-print';
import MesemNakilPrintTemplate, { MesemNakilData } from './print/MesemNakilPrintTemplate';
import KayitDondurmaPrintTemplate, { KayitDondurmaData } from './print/KayitDondurmaPrintTemplate';
import { FileBox, Search, Printer, X } from 'lucide-react';
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

  // Recent petitions history
  const [recentPetitions, setRecentPetitions] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('okuldesk_recent_petitions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentPetition = (item: any) => {
    try {
      const updated = [item, ...recentPetitions.filter(p => p.id !== item.id)].slice(0, 5);
      setRecentPetitions(updated);
      localStorage.setItem('okuldesk_recent_petitions', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handlePrintRecent = (item: any) => {
    setSelectedStudent(item.student);
    setPetitionType(item.type);
    setStudentTcNo(item.studentTcNo || '');
    setParentName(item.parentName || '');
    setParentTcNo(item.parentTcNo || '');
    setParentPhone(item.parentPhone || '');
    setParentRelation(item.parentRelation || 'Velisi');
    setParentAddress(item.parentAddress || '');
    setMesemName(item.mesemName || '');
    setFreezeReason(item.freezeReason || '');
    setDocumentDate(item.date || new Date().toISOString().slice(0, 10));

    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const clearRecentPetitions = () => {
    setRecentPetitions([]);
    localStorage.removeItem('okuldesk_recent_petitions');
    toast.success('Geçmiş temizlendi');
  };

  const schoolName = settings?.schoolName || 'ALİYA İZZETBEGOVİÇ MESLEKİ VE TEKNİK ANADOLU LİSESİ';

  const onPrintTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return toast.error('Lütfen bir öğrenci seçin');
    if (!petitionType) return toast.error('Lütfen bir dilekçe türü seçin');
    
    if (petitionType === 'MESEM_NAKIL' && !mesemName) {
      return toast.error('Lütfen geçiş yapılacak kurumu girin.');
    }
    if (petitionType === 'KAYIT_DONDURMA' && !freezeReason) {
      return toast.error('Lütfen kayıt dondurma gerekçesini girin.');
    }

    const historyItem = {
      id: 'pet-' + Date.now(),
      type: petitionType,
      typeLabel: petitionType === 'MESEM_NAKIL' ? 'MESEM Nakil Dilekçesi' : 'Kayıt Dondurma Dilekçesi',
      student: selectedStudent,
      studentTcNo,
      parentName,
      parentTcNo,
      parentPhone,
      parentRelation,
      parentAddress,
      mesemName,
      freezeReason,
      date: documentDate,
      createdAt: new Date().toISOString()
    };
    saveRecentPetition(historyItem);

    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veli Dilekçeleri"
        description="MESEM geçişi, kayıt dondurma ve diğer mazeretler için veli dilekçelerini hızlıca oluşturun."
        icon={<FileBox size={28} />}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* SOL KOLON: ADIM ADIM FORM */}
        <div className="xl:col-span-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
            <FileBox className="text-indigo-600" size={20} /> Dilekçe Hazırlama Formu
          </h2>
          
          <form onSubmit={onPrintTrigger} className="space-y-6">
            {/* Adım 1: Öğrenci Seçimi */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <label className="text-sm font-semibold text-slate-700">Öğrenci Seçimi</label>
              </div>

              {selectedStudent ? (
                <div className="flex justify-between items-center px-3 py-2.5 border border-indigo-200 bg-indigo-50/70 rounded-xl text-sm">
                  <div>
                    <span className="font-bold text-indigo-950">{selectedStudent.fullName}</span>
                    <span className="text-xs text-indigo-700 ml-2">No: {selectedStudent.schoolNumber} • {selectedStudent.className}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedStudent(null)} className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs">
                    Değiştir
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Öğrenci adı, okul numarası veya sınıf ara..."
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
                            onClick={() => handleStudentSelect(s)} 
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

            {/* Adım 2: Dilekçe Türü */}
            {selectedStudent && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <label className="text-sm font-semibold text-slate-700">Dilekçe Türü</label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPetitionType('MESEM_NAKIL')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      petitionType === 'MESEM_NAKIL'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-400/40 text-indigo-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wider text-indigo-600 mb-0.5">Nakil / Geçiş</div>
                    <div className="text-sm font-semibold">MESEM Nakil Dilekçesi</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPetitionType('KAYIT_DONDURMA')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      petitionType === 'KAYIT_DONDURMA'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-400/40 text-indigo-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wider text-indigo-600 mb-0.5">Kayıt İşlemleri</div>
                    <div className="text-sm font-semibold">Kayıt Dondurma Dilekçesi</div>
                  </button>
                </div>
              </div>
            )}

            {/* Adım 3: Belge Detayları */}
            {selectedStudent && petitionType && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="font-semibold text-slate-800 text-sm">Belge Detayları ve Veli Bilgileri</h3>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Dilekçe Tarihi</label>
                      <input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Öğrenci T.C. No</label>
                      <input type="text" value={studentTcNo} onChange={(e) => setStudentTcNo(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white font-mono" placeholder="11 Haneli TC" maxLength={11} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Veli Adı Soyadı</label>
                      <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Veli T.C. No</label>
                      <input type="text" value={parentTcNo} onChange={(e) => setParentTcNo(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white font-mono" placeholder="11 Haneli TC" maxLength={11} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Veli Telefon</label>
                      <input type="text" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white font-mono" placeholder="05XX XXX XX XX" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Yakınlık Derecesi</label>
                      <input type="text" value={parentRelation} onChange={(e) => setParentRelation(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white" placeholder="Annesi / Babası / Velisi" />
                    </div>
                  </div>

                  {petitionType === 'MESEM_NAKIL' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Geçiş Yapılacak Mesleki Eğitim Merkezi</label>
                      <input type="text" value={mesemName} onChange={(e) => setMesemName(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white" placeholder="Örn: Akhisar Mesleki Eğitim Merkezi" />
                    </div>
                  )}

                  {petitionType === 'KAYIT_DONDURMA' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Kayıt Dondurma Gerekçesi</label>
                        <textarea value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white resize-none" rows={2} placeholder="Örn: Kur'an Kursu'nda Hafızlık Eğitimi vb." />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Veli İkametgah Adresi</label>
                        <textarea value={parentAddress} onChange={(e) => setParentAddress(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white resize-none" rows={2} placeholder="Mahalle, Cadde/Sokak, Kapı No, İlçe/İl" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button type="submit" disabled={!selectedStudent || !petitionType} className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                <Printer size={18} /> Önizle ve Yazdır
              </Button>
            </div>
          </form>
        </div>

        {/* SAĞ KOLON: CANLI A4 DİLEKÇE ÖNİZLEMESİ */}
        <div className="xl:col-span-6 space-y-4">
          <div className="bg-slate-100/90 rounded-xl border border-slate-200/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Canlı Belge Önizlemesi (A4 Dikey)
              </span>
              <span className="text-xs text-slate-500">Resmi Dilekçe Formatı</span>
            </div>

            {/* Minyatür A4 Kağıt */}
            <div className="bg-white rounded-lg shadow-md border border-slate-300/80 p-6 text-slate-800 font-serif text-[11.5px] leading-relaxed transition-all min-h-[420px] flex flex-col justify-between">
              <div>
                <div className="text-center font-bold text-xs uppercase mb-6 text-slate-900 border-b pb-2 border-slate-100">
                  {schoolName} MÜDÜRLÜĞÜNE
                </div>

                {petitionType === 'MESEM_NAKIL' ? (
                  <div className="space-y-4">
                    <p className="text-justify indent-6 leading-relaxed">
                      Velisi olduğum okulunuz öğrencisi{' '}
                      <strong className="text-indigo-900 bg-indigo-50 px-1 rounded">
                        {selectedStudent ? selectedStudent.fullName : '...........................................'}
                      </strong>
                      'ın (T.C. No: <span className="font-mono">{studentTcNo || '...........................'}</span>) kaydını{' '}
                      <strong className="text-indigo-900 bg-indigo-50 px-1 rounded">
                        {mesemName || '...........................................'}
                      </strong>
                      'ne aldırmak istiyorum. Öğrencimin öğrenim durum belgesi ve öğrenim belgesinin tarafıma verilerek e-okul sisteminde Mesleki Eğitim Merkezine "nakil gidebilir" olarak işaretlenmesini talep ediyorum.
                    </p>
                    <p className="indent-6">Gereğini arz ederim.</p>
                  </div>
                ) : petitionType === 'KAYIT_DONDURMA' ? (
                  <div className="space-y-4">
                    <p className="text-justify indent-6 leading-relaxed">
                      Velisi bulunduğum okulunuz{' '}
                      <strong className="text-indigo-900 bg-indigo-50 px-1 rounded">
                        {selectedStudent ? selectedStudent.className : '......'}
                      </strong>{' '}
                      sınıfı,{' '}
                      <strong className="text-indigo-900 bg-indigo-50 px-1 rounded">
                        {selectedStudent ? selectedStudent.schoolNumber : '......'}
                      </strong>{' '}
                      nolu öğrencisi{' '}
                      <strong className="text-indigo-900 bg-indigo-50 px-1 rounded">
                        {selectedStudent ? selectedStudent.fullName : '...........................................'}
                      </strong>
                      'ın (T.C. No: <span className="font-mono">{studentTcNo || '...........................'}</span>){' '}
                      {academicYear || '2025-2026'} eğitim-öğretim yılı için{' '}
                      <strong className="text-indigo-900 bg-indigo-50 px-1 rounded">
                        {freezeReason || '....................................................................'}
                      </strong>{' '}
                      nedeniyle Millî Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliği hükümleri doğrultusunda kaydının dondurulmasını talep ediyorum.
                    </p>
                    <p className="indent-6">Gereğini bilgilerinize arz ederim.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 font-sans text-center">
                    <FileBox size={36} className="mb-2 text-slate-300" />
                    <p className="text-xs font-medium">Sol taraftan bir öğrenci ve dilekçe türü seçiniz.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Dilekçe metni ve alanlar burada gerçek zamanlı önizlenecektir.</p>
                  </div>
                )}
              </div>

              {petitionType && (
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <div className="flex justify-between items-end text-[10.5px]">
                    <div className="space-y-0.5 text-slate-600">
                      <div className="font-bold text-slate-700">İletişim & Kimlik Bilgileri:</div>
                      <div>T.C. No: <span className="font-mono font-medium">{parentTcNo || '................................'}</span></div>
                      <div>Telefon: <span className="font-mono font-medium">{parentPhone || '................................'}</span></div>
                      {petitionType === 'KAYIT_DONDURMA' && (
                        <div>Adres: <span className="font-medium">{parentAddress || '................................'}</span></div>
                      )}
                    </div>
                    <div className="text-center min-w-[130px]">
                      <div className="text-slate-500 mb-1">{documentDate ? new Date(documentDate).toLocaleDateString('tr-TR') : '.../.../20...'}</div>
                      <div className="font-bold text-slate-800">{parentName || '...................................'}</div>
                      <div className="text-slate-500 text-[10px]">({parentRelation || 'Velisi'})</div>
                      <div className="text-slate-400 mt-3">İmza</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* HIZLI GEÇMİŞ (SON DİLEKÇELER) */}
          {recentPetitions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">Son Oluşturulan Dilekçeler ({recentPetitions.length})</span>
                <button
                  type="button"
                  onClick={clearRecentPetitions}
                  className="text-[11px] text-slate-400 hover:text-red-600 transition"
                >
                  Geçmişi Temizle
                </button>
              </div>
              <div className="space-y-2">
                {recentPetitions.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 text-xs transition">
                    <div>
                      <div className="font-bold text-slate-800">
                        {p.student.fullName} ({p.student.schoolNumber} - {p.student.className})
                      </div>
                      <div className="text-[10px] text-indigo-600 font-medium">
                        {p.typeLabel} • {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintRecent(p)}
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
          {petitionType === 'MESEM_NAKIL' && <MesemNakilPrintTemplate data={getMesemData()} settings={settings} />}
          {petitionType === 'KAYIT_DONDURMA' && <KayitDondurmaPrintTemplate data={getKayitDondurmaData()} settings={settings} />}
        </div>
      </div>
    </div>
  );
}
