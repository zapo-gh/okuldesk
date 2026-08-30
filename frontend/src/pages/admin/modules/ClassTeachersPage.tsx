import toast from 'react-hot-toast';
import React, { useEffect, useState, useRef } from 'react';
import api from '../../../services/api';
import { useConfirm } from '../../../hooks/useConfirm';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ActionModal } from '../../../components/ui/ActionModal';
import { UsersRound, Plus, Trash2, Search, Printer, FileText } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { GuidanceReportPrintTemplate } from './print/GuidanceReportPrintTemplate';
import { useSettings } from '../../../context/SettingsContext';
import { Button } from '../../../components/ui/Button';

export type StaffRole = 'KURUM_PERSONELI' | 'MUDUR_YARDIMCISI' | 'REHBER_OGRETMEN' | 'SINIF_REHBER_OGRETMEN';

interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  className?: string | null;
  unvan?: string | null;
  brans?: string | null;
}

export default function ClassTeachersPage() {
  const { confirm, confirmModal } = useConfirm();
  const { settings } = useSettings();
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  
  const [showModal, setShowModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [className, setClassName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [reportData, setReportData] = useState<any>({ month: 'Eylül', activities: '' });
  const [reportStaff, setReportStaff] = useState<StaffMember | null>(null);
  const [printMode, setPrintMode] = useState<'none'|'single'|'all'>('none');

  const handlePrintAll = () => {
    setPrintMode('all');
    setTimeout(() => window.print(), 100);
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Sinif_Rehberlik_Raporu'
  });

  const openPrintModal = (staff: StaffMember) => {
    setReportStaff(staff);
    setReportData({ 
      className: staff.className,
      staffName: staff.name,
      month: 'Eylül', 
      activities: '',
      academicYear: settings?.academicYear || ''
    });
    setPrintModalOpen(true);
  };

  const triggerPrint = () => {
    setPrintMode('single');
    setPrintModalOpen(false);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  // Arama / Filtre
  const [searchClass, setSearchClass] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff');
      setAllStaff(res.data.data.staff || []);
    } catch {
      toast.error('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/students?limit=1000');
      const students = res.data?.data?.students || [];
      const classes = Array.from(new Set(students.map((s: any) => s.className).filter(Boolean))) as string[];
      const sortedClasses = classes.sort((a, b) => {
        const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999', 10);
        const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999', 10);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });
      setAvailableClasses(sortedClasses);
    } catch (e) {
      // sessiz hata
    }
  };

  useEffect(() => {
    fetchData();
    fetchClasses();
  }, []);

  const classTeachers = allStaff
    .filter(s => s.role === 'SINIF_REHBER_OGRETMEN' || s.className)
    .filter(s => searchClass ? s.className?.toLowerCase().includes(searchClass.toLowerCase()) : true)
    .sort((a, b) => (a.className ?? '').localeCompare(b.className ?? '', 'tr', { numeric: true }));

  const openAdd = () => {
    setClassName('');
    setSelectedStaffId('');
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!className.trim()) {
      setFormError('Sınıf adı boş olamaz.');
      return;
    }
    if (!selectedStaffId) {
      setFormError('Lütfen listeden bir öğretmen seçin.');
      return;
    }

    // Seçilen öğretmenin başka sınıfı var mı kontrol et
    const existing = allStaff.find(s => s.id === selectedStaffId && s.className && s.className !== className);
    if (existing) {
      setFormError(`Bu öğretmen zaten "${existing.className}" sınıfının rehber öğretmeni.`);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/staff/${selectedStaffId}`, {
        role: 'SINIF_REHBER_OGRETMEN',
        className: className.trim().toUpperCase()
      });
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (staff: StaffMember) => {
    if (!await confirm(`${staff.name} isimli öğretmenin Sınıf Rehberliği görevini iptal etmek istediğinize emin misiniz? (Kişi personel havuzunda kalmaya devam edecek)`)) return;
    try {
      await api.put(`/staff/${staff.id}`, {
        role: 'KURUM_PERSONELI',
        className: ''
      });
      fetchData();
    } catch (err: any) {
      toast.error('Görev iptal edilemedi.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sınıf Rehber Öğretmenleri"
        description="Sınıflara rehber öğretmen atamalarını Merkezi Personel Havuzundan yapın."
        icon={<UsersRound size={28} className="text-indigo-600" />}
        actions={
          <div className="flex gap-2">
            <Button onClick={handlePrintAll} variant="outline" className="text-slate-700">
              <Printer className="w-5 h-5 mr-2" />
              <span>Dağılım Çizelgesi Yazdır</span>
            </Button>
            <Button onClick={() => setShowModal(true)} variant="primary">
              <Plus className="w-5 h-5 mr-2" />
              <span>Görevlendir</span>
            </Button>
          </div>
        }
      />

      

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-semibold text-gray-800">Atanmış Sınıflar ve Öğretmenler</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Sınıf Ara (Örn: 9-A)"
              value={searchClass}
              onChange={e => setSearchClass(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {classTeachers.length === 0 ? (
            <div className="col-span-full p-8 text-center text-gray-500">
              Kayıtlı sınıf rehber öğretmeni bulunamadı. Lütfen "Öğretmen Ata" butonunu kullanarak Merkezi Personel Havuzundan seçim yapın.
            </div>
          ) : (
            classTeachers.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group border border-gray-200 rounded-lg bg-white shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-sm font-bold min-w-[3.5rem] text-center shrink-0">
                    {s.className}
                  </span>
                  <div className="truncate">
                    <span className="text-sm font-bold text-gray-800 block truncate" title={s.name}>{s.name}</span>
                    <span className="text-xs text-gray-500 truncate">{s.brans || s.unvan || 'Branş Belirtilmemiş'}</span>
                  </div>
                </div>
                <div className="flex space-x-1 shrink-0 ml-2">
                  <Button variant="ghost" onClick={() => openPrintModal(s)} className="text-indigo-600 hover:bg-indigo-50 px-2 py-1 transition-colors" title="Aylık Rehberlik Raporu Yazdır">
                    <Printer size={18} />
                  </Button>
                  <Button variant="ghost" onClick={() => handleRemoveRole(s)} className="text-red-600 hover:bg-red-50 px-2 py-1 transition-colors" title="Görevi İptal Et (Havuza Geri Döner)">
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ActionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Sınıf Rehber Öğretmeni Ata"
        onSubmit={handleSave}
        submitDisabled={saving}
        submitText="Atamayı Kaydet"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sınıf Adı</label>
            <input
              type="text"
              list="class-names"
              value={className}
              onChange={(e) => setClassName(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
              placeholder="Örn: 9-A (Yazın veya listeden seçin)"
              autoFocus
            />
            <datalist id="class-names">
              {availableClasses
                .filter(c => !allStaff.some(s => s.className === c))
                .map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rehber Öğretmen Seçin</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Personel Havuzundan Seçiniz --</option>
              {allStaff
                .filter(s => s.role !== 'SINIF_REHBER_OGRETMEN' && !s.className) 
                .map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.brans ? `(${s.brans})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Sadece kurum havuzundaki müsait personeller (sınıfı olmayanlar) listelenir.</p>
          </div>
        </div>
    </ActionModal>

      <ActionModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Aylık Rehberlik Raporu"
        onSubmit={(e) => { e.preventDefault(); triggerPrint(); }}
        submitText="Yazdır"
      >
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 text-indigo-700 rounded-lg flex items-center space-x-3">
            <FileText className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{reportStaff?.className} Sınıfı</p>
              <p className="text-sm">Rehber Öğretmeni: {reportStaff?.name}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ait Olduğu Ay</label>
            <select
              value={reportData.month}
              onChange={(e) => setReportData({ ...reportData, month: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {['Eylül','Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yapılan Çalışmalar / Faaliyet Özeti</label>
            <textarea
              value={reportData.activities}
              onChange={(e) => setReportData({ ...reportData, activities: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[150px]"
              placeholder="Öğrencilerle yapılan görüşmeler, sınıf etkinlikleri vb."
            />
          </div>
        </div>
      </ActionModal>

      <div className="hidden">
        <GuidanceReportPrintTemplate ref={printRef} data={reportStaff ? reportData : null} />
      </div>

      {/* YAZDIRMA (PRINT) ALANI - TOPLU SINIF REHBER ÖĞRETMENLERİ DAĞILIM ÇİZELGESİ */}
      {printMode === 'all' && (
        <div className="hidden print:block font-serif bg-white text-black" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; line-height: 1.4; font-size: 13px; }
            }
            .class-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .class-table th, .class-table td { border: 1px solid #000; padding: 8px; vertical-align: middle; text-align: left; }
            .class-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
          `}</style>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{settings?.academicYear || '2024-2025'} EĞİTİM ÖĞRETİM YILI</h3>
            <h2 style={{ fontWeight: 'bold', fontSize: '16px' }}>{settings?.schoolName || '... LİSESİ'}<br/>SINIF/ŞUBE REHBER ÖĞRETMENLERİ DAĞILIM ÇİZELGESİ</h2>
          </div>

          <table className="class-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>SIRA</th>
                <th style={{ width: '25%' }}>SINIF / ŞUBE ADI</th>
                <th style={{ width: '40%' }}>SINIF REHBER ÖĞRETMENİ</th>
                <th style={{ width: '25%' }}>BRANŞI</th>
              </tr>
            </thead>
            <tbody>
              {allStaff.filter(s => s.role === 'SINIF_REHBER_OGRETMEN' || s.className).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Kayıtlı sınıf rehber öğretmeni bulunmamaktadır.</td>
                </tr>
              ) : (
                allStaff
                  .filter(s => s.role === 'SINIF_REHBER_OGRETMEN' || s.className)
                  .sort((a, b) => {
                    const numA = parseInt(a.className?.match(/^(\d+)/)?.[1] || '999', 10);
                    const numB = parseInt(b.className?.match(/^(\d+)/)?.[1] || '999', 10);
                    if (numA !== numB) return numA - numB;
                    return (a.className || '').localeCompare(b.className || '');
                  })
                  .map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.className}</td>
                    <td>{s.name}</td>
                    <td>{s.brans || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '50px', paddingRight: '50px' }}>
             <div style={{ textAlign: 'center' }}>
                <p>UYGUNDUR</p>
                <p>.../.../20...</p>
                <p className="font-bold">{settings?.principalName || 'Okul Müdürü'}</p>
             </div>
          </div>
        </div>
      )}
    
      {confirmModal}
    </div>
  );
}


