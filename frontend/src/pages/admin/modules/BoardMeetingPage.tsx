import toast from 'react-hot-toast';
import { useSettings } from '../../../context/SettingsContext';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import api from '../../../services/api';
import { FileText, Plus, Trash2, Edit, AlertCircle, Loader2, Save, X, Printer, PlusCircle, Calendar } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { BoardMeetingPrintTemplate } from './print/BoardMeetingPrintTemplate';
import { Button } from '../../../components/ui/Button';
import { useConfirm } from '../../../hooks/useConfirm';

export default function BoardMeetingPage() {
  const { confirm, confirmModal } = useConfirm();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info'|'agenda'|'attendees'|'print'>('info');
  const [staffList, setStaffList] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    location: 'Öğretmenler Odası',
    status: 'PLANLANDI',
    agendaItems: [],
    attendees: []
  });

  const AGENDA_TEMPLATES = [
    {
      name: "Sene Başı Öğretmenler Kurulu",
      items: [
        { id: crypto.randomUUID(), topic: "Açılış ve yoklama.", decision: "" },
        { id: crypto.randomUUID(), topic: "Saygı duruşu ve İstiklal Marşı.", decision: "" },
        { id: crypto.randomUUID(), topic: "Bir önceki toplantıda alınan kararların değerlendirilmesi.", decision: "" },
        { id: crypto.randomUUID(), topic: "Öğrencilerin başarı, devam ve devamsızlık durumları.", decision: "" },
        { id: crypto.randomUUID(), topic: "Personel ve öğrenci kılık kıyafetiyle ilgili hususlar.", decision: "" },
        { id: crypto.randomUUID(), topic: "İstenen başarı düzeyine ulaşamayan öğrencilerin yetiştirilmesi için yapılacak çalışmalar.", decision: "" },
        { id: crypto.randomUUID(), topic: "Zümre toplantıları ve yıllık planların değerlendirilmesi.", decision: "" },
        { id: crypto.randomUUID(), topic: "Dilek ve temenniler, kapanış.", decision: "" },
      ]
    },
    {
      name: "2. Dönem Başı Öğretmenler Kurulu",
      items: [
        { id: crypto.randomUUID(), topic: "Açılış ve yoklama.", decision: "" },
        { id: crypto.randomUUID(), topic: "Saygı duruşu ve İstiklal Marşı.", decision: "" },
        { id: crypto.randomUUID(), topic: "Birinci dönemin değerlendirilmesi.", decision: "" },
        { id: crypto.randomUUID(), topic: "Öğrencilerin akademik başarıları ve sosyal etkinlik durumları.", decision: "" },
        { id: crypto.randomUUID(), topic: "İkinci dönem yapılacak çalışmaların planlanması.", decision: "" },
        { id: crypto.randomUUID(), topic: "Dilek ve temenniler, kapanış.", decision: "" },
      ]
    },
    {
      name: "Sene Sonu Öğretmenler Kurulu",
      items: [
        { id: crypto.randomUUID(), topic: "Açılış ve yoklama.", decision: "" },
        { id: crypto.randomUUID(), topic: "Eğitim-öğretim yılının genel değerlendirmesi.", decision: "" },
        { id: crypto.randomUUID(), topic: "Sınıf geçme ve kalma durumlarının görüşülmesi.", decision: "" },
        { id: crypto.randomUUID(), topic: "Ödül ve disiplin kurulu raporlarının incelenmesi.", decision: "" },
        { id: crypto.randomUUID(), topic: "Yaz tatili mesleki çalışma programının planlanması.", decision: "" },
        { id: crypto.randomUUID(), topic: "Dilek ve temenniler, kapanış.", decision: "" },
      ]
    }
  ];

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  useEffect(() => {
    fetchData();
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff');
      setStaffList(res.data.data?.staff || res.data.data || []);
    } catch (err) {
      console.error('Personel listesi alınamadı', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/board-meeting?academicYear=${academicYear}`);
      
      const parsedData = (res.data.data || []).map((item: any) => {
        let extra = { agendaItems: [], attendees: [] };
        if (item.extraData) {
          try { extra = JSON.parse(item.extraData); } catch (e) {}
        }
        return { ...item, extra };
      });
      
      setMeetings(parsedData);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.title) {
        toast.error('Toplantı Başlığı zorunludur.');
        return;
      }
      
      const payload = {
        title: formData.title,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        status: formData.status,
        academicYear,
        // Backend'deki mevcut endpoint validation'a uymak için dummy değerler
        type: formData.title,
        meetingNumber: 1, 
        extraData: JSON.stringify({
          agendaItems: formData.agendaItems,
          attendees: formData.attendees || []
        })
      };

      if (editingId) {
        await api.put(`/board-meeting/${editingId}`, payload);
      } else {
        await api.post('/board-meeting', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Toplantıyı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/board-meeting/${id}`);
      fetchData();
    } catch (err: any) {
      toast.error('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setActiveTab('info');
    setFormData({
      title: 'Öğretmenler Kurulu Toplantısı',
      date: new Date().toISOString().split('T')[0],
      time: '15:30',
      location: 'Öğretmenler Odası',
      status: 'PLANLANDI',
      agendaItems: [
        { id: crypto.randomUUID(), topic: 'Açılış ve Yoklama', decision: 'Toplantı başladı ve yoklama alındı.' }
      ],
      attendees: staffList.map(s => s.id) // Default: Select everyone
    });
    setIsModalOpen(true);
  };

  const applyTemplate = async (idx: number) => {
    if (idx === -1) return;
    if (!await confirm('Mevcut gündem maddeleri silinip şablon uygulanacak. Onaylıyor musunuz?')) return;

    const template = AGENDA_TEMPLATES[idx];
    setFormData({
      ...formData,
      title: template.name,
      agendaItems: template.items.map(item => ({ ...item, id: crypto.randomUUID() }))
    });
    toast.success(`${template.name} şablonu uygulandı.`);
  };

  const openEditModal = (meeting: any) => {
    setEditingId(meeting.id);
    setActiveTab('info');
    setFormData({
      title: meeting.title || meeting.type || '',
      date: meeting.date,
      time: meeting.time || '',
      location: meeting.location || '',
      status: meeting.status || 'PLANLANDI',
      agendaItems: meeting.extra?.agendaItems || [],
      attendees: meeting.extra?.attendees || []
    });
    setIsModalOpen(true);
  };

  const addAgendaItem = () => {
    setFormData({
      ...formData,
      agendaItems: [...formData.agendaItems, { id: crypto.randomUUID(), topic: '', decision: '' }]
    });
  };

  const updateAgendaItem = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      agendaItems: formData.agendaItems.map((item: any) => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const removeAgendaItem = (id: string) => {
    setFormData({
      ...formData,
      agendaItems: formData.agendaItems.filter((item: any) => item.id !== id)
    });
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Toplanti_Tutanagi'
  });

  const columns: Column<any>[] = [
    { header: 'Toplantı Adı', accessor: 'title', render: (row: any) => <span className="font-semibold">{row.title || row.type}</span> },
    { header: 'Tarih', accessor: 'date' },
    { header: 'Saat', accessor: 'time' },
    { header: 'Durum', accessor: 'status', render: (row: any) => (
      <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800 font-medium">
        {row.status}
      </span>
    )},
    { header: 'Gündem', accessor: 'counts', render: (row: any) => <span className="text-slate-500 text-sm">{row.extra?.agendaItems?.length || 0} Madde</span> },
    { 
      header: 'İşlemler',
      align: 'right',
      render: (row: any) => (
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="Düzenle">
            <Edit className="w-5 h-5" />
          </Button>
          <Button variant="ghost" onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Sil">
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      )
    }
  ];

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6 relative">
      <PageHeader 
        title="Kurul Toplantıları" 
        description="Öğretmenler kurulu, zümre ve şube öğretmenler kurulu toplantı tutanakları" 
        icon={<FileText size={24} />}
        actions={
          <>
                    <Button
                      onClick={openAddModal}
                      variant="primary"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Yeni Toplantı</span>
                    </Button>
          </>
        }
      />

      

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={meetings} emptyMessage="Kayıtlı toplantı bulunamadı." />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 transition-opacity p-4 sm:p-6">
          <div className="bg-slate-50 w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? 'Toplantı Düzenle' : 'Yeni Toplantı'}
                </h2>
              </div>
              <Button variant="ghost"  onClick={() => setIsModalOpen(false)}  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 space-x-8">
              {[
                { id: 'info', label: 'Toplantı Bilgileri' },
                { id: 'agenda', label: 'Gündem ve Kararlar' },
                { id: 'attendees', label: 'Katılımcılar (İmza Sirküsü)' },
                { id: 'print', label: 'Yazdır / Çıktı' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
                    activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Toplantı Türü / Adı</label>
                        <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Sene Başı Öğretmenler Kurulu" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hazır Şablon Uygula</label>
                        <select onChange={(e) => applyTemplate(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-indigo-50 text-indigo-800 font-medium cursor-pointer" defaultValue="-1">
                          <option value="-1" disabled>MEB Şablonu Seçin...</option>
                          {AGENDA_TEMPLATES.map((tpl, idx) => (
                            <option key={idx} value={idx}>{tpl.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tarih</label>
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Saat</label>
                        <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Yer / Salon</label>
                        <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                          <option value="PLANLANDI">Planlandı</option>
                          <option value="TAMAMLANDI">Tamamlandı (İmzaya Açık)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'agenda' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                     <Button onClick={addAgendaItem} className="flex items-center space-x-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium">
                        <PlusCircle className="w-4 h-4" />
                        <span>Yeni Gündem Maddesi Ekle</span>
                     </Button>
                  </div>
                  {formData.agendaItems.map((item: any, idx: number) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col space-y-3 relative group">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-slate-800">Madde {idx + 1}</h4>
                        <Button onClick={() => removeAgendaItem(item.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Gündem Konusu</label>
                        <input type="text" value={item.topic} onChange={(e) => updateAgendaItem(item.id, 'topic', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Örn: Açılış ve yoklama" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Alınan Karar / Görüşülenler</label>
                        <textarea value={item.decision} onChange={(e) => updateAgendaItem(item.id, 'decision', e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Görüşülen hususlar veya alınan karar..." />
                      </div>
                    </div>
                  ))}
                  {formData.agendaItems.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
                      Henüz gündem maddesi eklenmedi.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'attendees' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div>
                      <h4 className="font-bold text-indigo-900">Katılımcı Personel</h4>
                      <p className="text-xs text-indigo-700 mt-1">
                        Toplantıya katılacak personeli seçin. Seçilen personel imza sirküsünde yer alacaktır.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setFormData({...formData, attendees: staffList.map(s => s.id)})} className="bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-100 text-xs py-1.5 px-3">Tümünü Seç</Button>
                      <Button onClick={() => setFormData({...formData, attendees: []})} className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 text-xs py-1.5 px-3">Temizle</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {staffList.map((staff: any) => {
                      const isSelected = formData.attendees.includes(staff.id);
                      return (
                        <label key={staff.id} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newAttendees = e.target.checked 
                                ? [...formData.attendees, staff.id]
                                : formData.attendees.filter((id: string) => id !== staff.id);
                              setFormData({ ...formData, attendees: newAttendees });
                            }}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-slate-800">{staff.name}</div>
                            <div className="text-xs text-slate-500">{staff.title || 'Öğretmen'}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'print' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-4 hover:border-indigo-300">
                     <Printer className="w-12 h-12 text-indigo-500 mx-auto" />
                     <div>
                       <h3 className="font-bold text-slate-800">Kurul Toplantı Tutanağı</h3>
                       <p className="text-sm text-slate-500 mt-1">Gündem maddeleri ve kararları içeren resmi formatta belge.</p>
                     </div>
                      <Button variant="primary" onClick={handlePrint} className="w-full justify-center">
                        <Printer className="w-4 h-4" />
                        <span>Yazdır</span>
                      </Button>
                  </div>
                </div>
              )}

            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 shrink-0">
              <Button variant="ghost"  onClick={() => setIsModalOpen(false)} >
                İptal Et
              </Button>
              {editingId && (
                <Button variant="outline" onClick={handlePrint} className="text-slate-700">
                  <Printer className="w-5 h-5" />
                  <span>Yazdır</span>
                </Button>
              )}
              <Button onClick={handleSave} variant="primary">
                <Save className="w-5 h-5" />
                <span>Kaydet</span>
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      <div className="hidden">
         <BoardMeetingPrintTemplate ref={printRef} meeting={formData} staffList={staffList} />
      </div>

    
      {confirmModal}
    </div>
  );
}




