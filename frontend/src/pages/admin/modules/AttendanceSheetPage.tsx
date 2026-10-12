import React, { useEffect, useState, useRef } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Printer, FileText } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useReactToPrint } from 'react-to-print';
import { AttendanceSheetPrintTemplate } from './print/AttendanceSheetPrintTemplate';

interface Staff {
  id: string;
  name: string;
  role: string;
  unvan?: string;
  brans?: string;
  gorev?: string;
}

export default function AttendanceSheetPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnvans, setSelectedUnvans] = useState<string[]>([]);
  const [selectedPrincipal, setSelectedPrincipal] = useState('');
  const [selectedVicePrincipal, setSelectedVicePrincipal] = useState('');

  // Form State
  const [documentSubject, setDocumentSubject] = useState('');
  const [documentDateNumber, setDocumentDateNumber] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, settingsRes] = await Promise.all([
        api.get('/staff'),
        api.get('/settings')
      ]);
      const staffData = staffRes.data.data?.staff || [];
      const principalName = settingsRes.data.data?.principalName || '';
      
      setStaff(staffData);
      const unvans = Array.from(new Set(staffData.map((s: Staff) => s.unvan || 'Belirtilmemiş'))) as string[];
      const defaultSelected = unvans.filter(u => u.toLowerCase().includes('öğretmen'));
      setSelectedUnvans(defaultSelected);

      // Otomatik Müdür ve Müdür Yardımcısı bulma
      if (principalName) {
        setSelectedPrincipal(principalName);
      } else {
        const principals = staffData.filter((s: Staff) => {
          const text = (s.unvan || '') + ' ' + (s.gorev || '');
          const lower = text.toLowerCase();
          return lower.includes('müdür') && !lower.includes('yardımcı');
        });
        if (principals.length > 0) setSelectedPrincipal(principals[0].name);
      }
      
      const vicePrincipals = staffData.filter((s: Staff) => {
        const text = (s.unvan || '') + ' ' + (s.gorev || '');
        const lower = text.toLowerCase();
        return lower.includes('müdür') && lower.includes('yardımcı');
      });
      // if (vicePrincipals.length > 0) setSelectedVicePrincipal(vicePrincipals[0].name);
    } catch {
      toast.error('Kayıtlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Personel_Imza_Sirkusu'
  });

  const getManagementRank = (person: Staff) => {
    const text = ((person.unvan || '') + ' ' + (person.gorev || '') + ' ' + (person.role || '')).toLowerCase();
    if (text.includes('başyardımcı') || (text.includes('müdür') && text.includes('baş'))) return 1;
    if (text.includes('müdür') && text.includes('yardımcı')) return 2;
    return 3;
  };

  const displayStaff = staff
    .filter(person => {
      const rank = getManagementRank(person);
      if (rank < 3) return true;
      return selectedUnvans.includes(person.unvan || 'Belirtilmemiş');
    })
    .sort((a, b) => {
      const rankA = getManagementRank(a);
      const rankB = getManagementRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name, 'tr');
    })
    .map((s, index) => ({ ...s, rowIndex: index + 1 }));

  const columns: Column<Staff & { rowIndex: number }>[] = [
    {
      header: 'S.N',
      className: 'w-16 text-center',
      align: 'center',
      render: (person) => <span className="font-semibold text-slate-500">{person.rowIndex}</span>,
    },
    {
      header: 'Adı Soyadı',
      render: (person) => (
        <span className="font-semibold text-slate-900">{person.name}</span>
      ),
    },
    {
      header: 'Unvanı / Branşı',
      render: (person) => {
        const rank = getManagementRank(person);
        let unvanStr = person.brans || '-';
        if (rank === 1) {
          unvanStr = (person.brans ? person.brans + ' / ' : '') + 'Müdür Başyardımcısı';
        } else if (rank === 2) {
          unvanStr = (person.brans ? person.brans + ' / ' : '') + 'Müdür Yardımcısı';
        }
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rank < 3 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-700'}`}>
            {unvanStr}
          </span>
        );
      },
    },
    {
      header: 'İmza Alanı',
      align: 'center',
      className: 'w-48 text-center',
      render: () => (
        <div className="h-7 border border-dashed border-slate-300 rounded-md bg-slate-50/50 flex items-center justify-center text-xs text-slate-400">
          İmza
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Personel İmza Sirküsü (Okundu Belgesi)" 
        description="Resmi yazı, genelge veya kararların personele tebliğ edildiğine dair toplu imza sirküsü oluşturun."
        icon={<FileText size={24} />}
        actionText="Sirküyü Yazdır"
        actionIcon={<Printer size={18} />}
        onAction={handlePrint}
      />

      <div className="p-4 flex flex-col print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Belge Konusu / Özeti</label>
            <input 
              type="text" 
              value={documentSubject} 
              onChange={(e) => setDocumentSubject(e.target.value)}
              placeholder="Örn: 2026-2027 Eğitim Öğretim Yılı Sene Başı Öğretmenler Kurulu Toplantı Tutanağı"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
          <div className="md:w-1/3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tarih ve Sayı</label>
            <input 
              type="text" 
              value={documentDateNumber} 
              onChange={(e) => setDocumentDateNumber(e.target.value)}
              placeholder="Örn: 15.08.2026 tarih ve 12345 sayılı yazı"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
        </div>

        {/* Unvan Filtreleri */}
        {staff.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">Gösterilecek Unvanlar</label>
              <span className="text-xs text-slate-500 font-medium">Seçili: {selectedUnvans.length} unvan</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(staff.map(s => s.unvan || 'Belirtilmemiş')))
                .sort((a, b) => {
                  const aIsTeacher = a.toLowerCase().includes('öğretmen') ? 0 : 1;
                  const bIsTeacher = b.toLowerCase().includes('öğretmen') ? 0 : 1;
                  if (aIsTeacher !== bIsTeacher) return aIsTeacher - bIsTeacher;
                  return a.localeCompare(b, 'tr');
                })
                .map(unvan => {
                  const isChecked = selectedUnvans.includes(unvan);
                  return (
                    <button
                      key={unvan}
                      type="button"
                      onClick={() => {
                        if (isChecked) setSelectedUnvans(prev => prev.filter(u => u !== unvan));
                        else setSelectedUnvans(prev => [...prev, unvan]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        isChecked 
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}{unvan}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* İmza Sahipleri */}
        <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Müdür Yardımcısı</label>
            <select
              value={selectedVicePrincipal}
              onChange={(e) => setSelectedVicePrincipal(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 transition-shadow outline-none"
            >
              <option value="">— Müdür Yardımcısı Seçiniz —</option>
              {staff.filter(s => {
                const text = ((s.unvan || '') + ' ' + (s.gorev || '') + ' ' + (s.role || '')).toLowerCase();
                return text.includes('müdür') && text.includes('yardımcı');
              }).map(vp => (
                <option key={vp.id} value={vp.name}>{vp.name} ({vp.unvan || vp.gorev || 'Müdür Yrd.'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Okul Müdürü</label>
            <select
              value={selectedPrincipal}
              onChange={(e) => setSelectedPrincipal(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 transition-shadow outline-none"
            >
              <option value="">— Okul Müdürü Seçiniz —</option>
              {staff.filter(s => {
                const text = ((s.unvan || '') + ' ' + (s.gorev || '') + ' ' + (s.role || '')).toLowerCase();
                return text.includes('müdür') && !text.includes('yardımcı');
              }).map(p => (
                <option key={p.id} value={p.name}>{p.name} ({p.unvan || 'Okul Müdürü'})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">Sirkü Önizleme Tablosu</h3>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-full shadow-xs">
            Toplam {displayStaff.length} Personel
          </span>
        </div>
        <DataTable
          data={displayStaff}
          columns={columns}
          loading={loading}
          emptyMessage="Seçili unvan kriterlerine uygun personel bulunmuyor."
        />
      </div>

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      <div className="hidden">
        <AttendanceSheetPrintTemplate
          ref={printRef}
          documentSubject={documentSubject}
          documentDateNumber={documentDateNumber}
          staffList={staff}
          selectedUnvans={selectedUnvans}
          selectedVicePrincipal={selectedVicePrincipal}
          selectedPrincipal={selectedPrincipal}
        />
      </div>

    </div>
  );
}



