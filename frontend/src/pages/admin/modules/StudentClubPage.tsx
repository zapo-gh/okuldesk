import toast from 'react-hot-toast';
import { useSettings } from '../../../context/SettingsContext';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import api from '../../../services/api';
import { Users, Plus, Trash2, Edit, AlertCircle, Loader2, Save, X, Printer, PlusCircle, Calendar, UserPlus } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { StudentClubPrintTemplate } from './print/StudentClubPrintTemplate';
import { Button } from '../../../components/ui/Button';
import { useConfirm } from '../../../hooks/useConfirm';

export default function StudentClubPage() {
  const { confirm, confirmModal } = useConfirm();
  const [clubs, setClubs] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info'|'activities'|'members'|'print'>('info');
  const [printMode, setPrintMode] = useState<'none'|'single'|'all'>('none');

  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    assignedStaffId: '',
    assignedStaffName: '',
    meetingDay: '',
    meetingTime: '',
    maxMembers: '30',
    activities: []
  });

  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  const DEFAULT_MEB_CLUBS = [
    { name: 'Kültür ve Edebiyat Kulübü', desc: 'Şiir, kompozisyon, okuma faaliyetleri vb.' },
    { name: 'Kütüphanecilik Kulübü', desc: 'Okul kütüphanesinin düzenlenmesi ve okuma alışkanlığı' },
    { name: 'Sivil Savunma Kulübü', desc: 'Afet bilinci ve tahliye tatbikatları' },
    { name: 'Gezi, Tanıtma ve Turizm Kulübü', desc: 'Okul gezilerinin organizasyonu ve rehberlik' },
    { name: 'Çevre Koruma Kulübü', desc: 'Doğa bilinci, geri dönüşüm ve temizlik kampanyaları' },
    { name: 'Bilinçli Tüketici Kulübü', desc: 'Yerli malı ve tasarruf bilincinin geliştirilmesi' },
    { name: 'Spor Kulübü', desc: 'Sınıflar arası turnuvalar ve sportif faaliyetler' },
    { name: 'Kızılay Kulübü', desc: 'Yardımlaşma, kan bağışı bilinci ve sosyal sorumluluk' },
    { name: 'Bilim ve Fen Kulübü', desc: 'Bilimsel projeler, deneyler ve TÜBİTAK çalışmaları' },
    { name: 'Sağlık, Temizlik ve Beslenme Kulübü', desc: 'Sağlıklı yaşam ve hijyen kuralları bilgilendirmeleri' },
    { name: 'Müzik Kulübü', desc: 'Okul korosu ve belirli gün/hafta törenlerinde görev' },
    { name: 'Görsel Sanatlar Kulübü', desc: 'Pano düzenlemeleri ve resim sergileri' },
    { name: 'Bilişim ve İnternet Kulübü', desc: 'Teknoloji okuryazarlığı ve güvenli internet kullanımı' },
    { name: 'Değerler Eğitimi Kulübü', desc: 'Milli, manevi ve evrensel değerlerin kazandırılması' }
  ];

  const loadDefaults = async () => {
    if (!await confirm('Klasik MEB Öğrenci Kulüpleri (14 Adet) sisteme otomatik eklenecektir. Onaylıyor musunuz?')) return;
    
    setLoading(true);
    try {
      for (const club of DEFAULT_MEB_CLUBS) {
        await api.post('/student-club', {
          name: club.name,
          description: club.desc,
          academicYear,
          meetingDay: 'Cuma',
          meetingTime: '15:00',
          maxMembers: 30,
          extraData: JSON.stringify({ activities: [] })
        });
      }
      toast.success('Şablon kulüpler başarıyla eklendi.');
      await fetchData();
    } catch (e) {
      toast.error('Eklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAll = () => {
    setPrintMode('all');
    setTimeout(() => window.print(), 100);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clubRes, staffRes, studentRes] = await Promise.all([
        api.get(`/student-club?academicYear=${academicYear}`),
        api.get('/staff'),
        api.get('/students?limit=1000')
      ]);
      
      const parsedData = (clubRes.data.data || []).map((item: any) => {
        let extra = { activities: [] };
        if (item.extraData) {
          try { extra = JSON.parse(item.extraData); } catch (e) {}
        }
        return { ...item, extra };
      });
      
      setClubs(parsedData);
      setStaff(staffRes.data.data?.staff || staffRes.data.data || []);
      setAllStudents(studentRes.data.data?.students || studentRes.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name) {
        toast.error('Kulüp adı zorunludur.');
        return;
      }
      
      const payload = {
        name: formData.name,
        description: formData.description,
        assignedStaffId: formData.assignedStaffId,
        assignedStaffName: formData.assignedStaffName,
        meetingDay: formData.meetingDay,
        meetingTime: formData.meetingTime,
        maxMembers: parseInt(formData.maxMembers) || 30,
        academicYear,
        extraData: JSON.stringify({
          activities: formData.activities
        })
      };

      if (editingId) {
        await api.put(`/student-club/${editingId}`, payload);
      } else {
        await api.post('/student-club', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Kulübü silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/student-club/${id}`);
      fetchData();
    } catch (err: any) {
      toast.error('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setActiveTab('info');
    setFormData({
      name: 'Kızılay ve Kan Bağışı Kulübü',
      description: 'Yardımlaşma ve dayanışma faaliyetleri',
      assignedStaffId: '',
      assignedStaffName: '',
      meetingDay: 'Cuma',
      meetingTime: '15:30',
      maxMembers: '30',
      activities: [
        { id: crypto.randomUUID(), month: 'Ekim', description: 'Kulüp genel kurulunun toplanması ve görev dağılımı' },
        { id: crypto.randomUUID(), month: 'Kasım', description: 'Kızılay Haftası panosu hazırlanması' }
      ]
    });
    setClubMembers([]);
    setIsModalOpen(true);
  };

  const openEditModal = async (club: any) => {
    setEditingId(club.id);
    setActiveTab('info');
    setFormData({
      name: club.name || '',
      description: club.description || '',
      assignedStaffId: club.assignedStaffId || '',
      assignedStaffName: club.assignedStaffName || '',
      meetingDay: club.meetingDay || '',
      meetingTime: club.meetingTime || '',
      maxMembers: club.maxMembers?.toString() || '30',
      activities: club.extra?.activities || []
    });
    
    // Üyeleri çek
    try {
      const res = await api.get(`/student-club/${club.id}/members`);
      setClubMembers(res.data.data || []);
    } catch (e) {
      console.error('Üyeler çekilemedi:', e);
      setClubMembers([]);
    }
    
    setIsModalOpen(true);
  };

  const addActivity = () => {
    setFormData({
      ...formData,
      activities: [...formData.activities, { id: crypto.randomUUID(), month: '', description: '' }]
    });
  };

  const updateActivity = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      activities: formData.activities.map((item: any) => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const removeActivity = (id: string) => {
    setFormData({
      ...formData,
      activities: formData.activities.filter((item: any) => item.id !== id)
    });
  };

  const handleAddMember = async () => {
    if (!selectedStudentId || !editingId) {
      toast("Lütfen bir öğrenci seçin ve kulübün kaydedilmiş olduğundan emin olun (Önce kaydedip sonra üye ekleyin).");
      return;
    }
    try {
      await api.post('/student-club/members', {
        clubId: editingId,
        studentId: selectedStudentId
      });
      // Yenile
      const res = await api.get(`/student-club/${editingId}/members`);
      setClubMembers(res.data.data || []);
      setSelectedStudentId('');
      setStudentSearch('');
      fetchData(); // Arka planda listeyi güncelle
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Öğrenci eklenemedi.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!await confirm('Öğrenciyi kulüpten çıkarmak istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/student-club/members/${memberId}`);
      if (editingId) {
        const res = await api.get(`/student-club/${editingId}/members`);
        setClubMembers(res.data.data || []);
        fetchData();
      }
    } catch (e) {
      toast.error('Silinemedi.');
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const _handleReactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Kulup_Faaliyet_Raporu'
  });

  const handlePrintSingleWrapper = () => {
    setPrintMode('single');
    setTimeout(() => {
      _handleReactToPrint();
    }, 100);
  };

  const columns: Column<any>[] = [
    { header: 'Kulüp Adı', accessor: 'name', render: (row: any) => <span className="font-semibold">{row.name}</span> },
    { header: 'Danışman Öğretmen', accessor: 'assignedStaffName', render: (row: any) => row.assignedStaffName || '-' },
    { header: 'Toplantı Günü', accessor: 'meetingDay', render: (row: any) => row.meetingDay || '-' },
    { header: 'Üye Sayısı', accessor: 'memberCount', render: (row: any) => <span className="font-medium text-emerald-700">{row.memberCount || 0} / {row.maxMembers}</span> },
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
        title="Öğrenci Kulüpleri" 
        description="Eğitici kulüp faaliyetleri, kulüp öğrencileri ve toplantı günleri" 
        icon={<Users size={24} />}
        actions={
          <div className="flex gap-2">
            <Button onClick={loadDefaults} variant="outline" className="text-emerald-700 hover:text-emerald-800 border-emerald-200 bg-emerald-50">
              <span>MEB Listesi Yükle</span>
            </Button>
            <Button onClick={handlePrintAll} variant="outline" className="text-slate-700">
              <Printer className="w-5 h-5 mr-2" />
              <span>Kulüp Dağılım Çizelgesi</span>
            </Button>
            <Button onClick={openAddModal} variant="primary">
              <Plus className="w-5 h-5 mr-2" />
              <span>Yeni Kulüp</span>
            </Button>
          </div>
        }
      />

      

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={clubs} emptyMessage="Kayıtlı kulüp bulunamadı." />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 transition-opacity p-4 sm:p-6">
          <div className="bg-slate-50 w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId ? 'Kulüp Düzenle' : 'Yeni Öğrenci Kulübü'}
                </h2>
              </div>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 space-x-8">
              {[
                { id: 'info', label: 'Genel Bilgiler' },
                { id: 'activities', label: 'Faaliyet Planı' },
                { id: 'members', label: 'Üye Öğrenciler' },
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
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Kulüp Adı</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Kulüp Amacı / Açıklama</label>
                      <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Danışman Öğretmen</label>
                        <select 
                          value={formData.assignedStaffId} 
                          onChange={(e) => {
                            const staffId = e.target.value;
                            const staffObj = staff.find(s => s.id === staffId);
                            setFormData({...formData, assignedStaffId: staffId, assignedStaffName: staffObj ? staffObj.name : ''});
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Danışman Öğretmen Seçiniz --</option>
                          {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.title || s.role})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Toplantı Günü</label>
                        <input type="text" value={formData.meetingDay} onChange={e => setFormData({...formData, meetingDay: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Cuma" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Toplantı Saati</label>
                        <input type="time" value={formData.meetingTime} onChange={e => setFormData({...formData, meetingTime: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Maksimum Üye Sayısı</label>
                        <input type="number" value={formData.maxMembers} onChange={e => setFormData({...formData, maxMembers: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activities' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                     <Button onClick={addActivity} className="flex items-center space-x-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium">
                        <PlusCircle className="w-4 h-4" />
                        <span>Yeni Faaliyet Ekle</span>
                     </Button>
                  </div>
                  {formData.activities.map((item: any, idx: number) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4 relative group">
                      <div className="w-1/4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Aylar / Dönem</label>
                        <input type="text" value={item.month} onChange={(e) => updateActivity(item.id, 'month', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Örn: Ekim Ayı" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Faaliyet Konusu</label>
                        <input type="text" value={item.description} onChange={(e) => updateActivity(item.id, 'description', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Yapılacak faaliyet..." />
                      </div>
                      <Button onClick={() => removeActivity(item.id)} className="mt-5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                  {formData.activities.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
                      Faaliyet planı henüz eklenmedi.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'members' && (
                <div className="space-y-6">
                  {!editingId ? (
                     <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                        Öğrenci ekleyebilmek için önce kulübü kaydetmelisiniz. (Aşağıdan Kaydet butonuna basınız)
                     </div>
                  ) : (
                    <>
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex space-x-4 items-end">
                        <div className="flex-1 relative">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Öğrenci Seç / Ara</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Öğrenci adı veya numarası ile ara..."
                              value={studentSearch}
                              onChange={(e) => {
                                setStudentSearch(e.target.value);
                                setIsStudentDropdownOpen(true);
                                setSelectedStudentId('');
                              }}
                              onFocus={() => setIsStudentDropdownOpen(true)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white relative z-20"
                            />
                            {isStudentDropdownOpen && studentSearch.trim().length > 0 && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setIsStudentDropdownOpen(false)} 
                                ></div>
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                  {allStudents
                                    .filter(s => 
                                      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || 
                                      s.schoolNumber.includes(studentSearch)
                                    )
                                    .slice(0, 50)
                                    .map(s => (
                                      <div
                                        key={s.id}
                                        onClick={() => {
                                          setSelectedStudentId(s.id);
                                          setStudentSearch(`${s.schoolNumber} - ${s.fullName} (${s.className})`);
                                          setIsStudentDropdownOpen(false);
                                        }}
                                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0"
                                      >
                                        <div className="font-medium text-gray-900 text-sm">{s.fullName}</div>
                                        <div className="text-xs text-gray-500">{s.schoolNumber} - Sınıf: {s.className}</div>
                                      </div>
                                  ))}
                                  {allStudents.filter(s => s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || s.schoolNumber.includes(studentSearch)).length === 0 && (
                                    <div className="px-4 py-4 text-sm text-gray-500 text-center">Sonuç bulunamadı.</div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <Button 
                          onClick={handleAddMember}
                          variant="primary"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Ekle</span>
                        </Button>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto shadow-sm">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="px-4 py-3 border-b border-slate-200">Öğrenci No</th>
                              <th className="px-4 py-3 border-b border-slate-200">Adı Soyadı</th>
                              <th className="px-4 py-3 border-b border-slate-200">Sınıfı</th>
                              <th className="px-4 py-3 border-b border-slate-200">Görevi</th>
                              <th className="px-4 py-3 border-b border-slate-200 w-24"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {clubMembers.map((member: any) => (
                              <tr key={member.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">{member.student?.schoolNumber}</td>
                                <td className="px-4 py-3">{member.student?.fullName}</td>
                                <td className="px-4 py-3">{member.student?.className}</td>
                                <td className="px-4 py-3">{member.role}</td>
                                <td className="px-4 py-3 text-right">
                                  <Button onClick={() => handleRemoveMember(member.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                            {clubMembers.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Bu kulübe henüz öğrenci kaydedilmemiş.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'print' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-4 hover:border-indigo-300">
                     <Printer className="w-12 h-12 text-indigo-500 mx-auto" />
                     <div>
                       <h3 className="font-bold text-slate-800">Kulüp Faaliyet Raporu</h3>
                       <p className="text-sm text-slate-500 mt-1">Kulüp bilgileri, faaliyet planı ve üye öğrenci listesini içeren resmi belge.</p>
                     </div>
                      <Button variant="primary" onClick={handlePrintSingleWrapper} className="w-full justify-center">
                       <Printer className="w-4 h-4" />
                       <span>Yazdır</span>
                     </Button>
                  </div>
                </div>
              )}

            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 shrink-0">
              <Button variant="ghost"  onClick={() => setIsModalOpen(false)} >
                Kapat
              </Button>
              <Button onClick={handleSave} variant="primary">
                <Save className="w-5 h-5" />
                <span>Kaydet</span>
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      {editingId && (
        <div className="hidden">
           <StudentClubPrintTemplate ref={printRef} formData={formData} clubMembers={clubMembers} />
        </div>
      )}

      {/* YAZDIRMA (PRINT) ALANI - TOPLU KULÜP DAĞILIM ÇİZELGESİ */}
      {printMode === 'all' && (
        <div className="hidden print:block font-serif bg-white text-black" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; line-height: 1.4; font-size: 13px; }
            }
            .club-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .club-table th, .club-table td { border: 1px solid #000; padding: 8px; vertical-align: middle; text-align: left; }
            .club-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
          `}</style>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{academicYear} EĞİTİM ÖĞRETİM YILI</h3>
            <h2 style={{ fontWeight: 'bold', fontSize: '16px' }}>ÖĞRENCİ KULÜPLERİ VE DANIŞMAN ÖĞRETMEN DAĞILIM ÇİZELGESİ</h2>
          </div>

          <table className="club-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>SIRA</th>
                <th style={{ width: '35%' }}>ÖĞRENCİ KULÜBÜNÜN ADI</th>
                <th style={{ width: '30%' }}>DANIŞMAN ÖĞRETMEN</th>
                <th style={{ width: '30%' }}>TOPLANTI GÜN VE SAATİ</th>
              </tr>
            </thead>
            <tbody>
              {clubs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Kayıtlı öğrenci kulübü bulunmamaktadır.</td>
                </tr>
              ) : (
                clubs.map((c, idx) => (
                  <tr key={c.id}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>{c.name}</td>
                    <td>{c.assignedStaffName || 'Görevlendirme Yapılmadı'}</td>
                    <td style={{ textAlign: 'center' }}>{c.meetingDay} {c.meetingTime}</td>
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




