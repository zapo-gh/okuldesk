import React, { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { Settings, Save, Edit, ShieldAlert, School, KeyRound, AlertTriangle, CheckCircle2, X, Info, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';

export default function SettingsPage() {
  const { user, clearMustChangePassword } = useAuth();
  const { refreshSettings } = useSettings();
  const { confirm, confirmModal } = useConfirm();

  // ── Restore Backup ──
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // ── Okul bilgileri ──
  const [schoolName,         setSchoolName]         = useState('');
  const [principalName,      setPrincipalName]      = useState('');
  const [academicYear,       setAcademicYear]       = useState('2025-2026');
  const [schoolDistrictCity, setSchoolDistrictCity] = useState('');
  const [schoolAddress,      setSchoolAddress]      = useState('');
  const [schoolEmail,        setSchoolEmail]        = useState('');
  const [schoolPhone,        setSchoolPhone]        = useState('');
  const [schoolSaving,       setSchoolSaving]       = useState(false);

  // ── Şifre değiştir ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading,       setPwLoading]       = useState(false);
  const [pwError,         setPwError]         = useState('');
  const [pwSuccess,       setPwSuccess]       = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      const d = res.data.data;
      setSchoolName(d.schoolName || '');
      setPrincipalName(d.principalName || '');
      setAcademicYear(d.academicYear || '2025-2026');
      setSchoolDistrictCity(d.schoolDistrictCity || '');
      setSchoolAddress(d.schoolAddress || '');
      setSchoolEmail(d.schoolEmail || '');
      setSchoolPhone(d.schoolPhone || '');
    } catch {
      toast.error('Ayarlar yüklenemedi. Sayfayı yenileyin.');
    }
  };

  const handleSaveSchool = async (e: FormEvent) => {
    e.preventDefault();
    setSchoolSaving(true);
    try {
      await api.put('/settings', {
        schoolName,
        principalName,
        academicYear,
        schoolDistrictCity,
        schoolAddress,
        schoolEmail,
        schoolPhone,
      });
      toast.success('Kurum bilgileri güncellendi.');
      refreshSettings();
    } catch { 
      toast.error('Kayıt sırasında hata oluştu.'); 
    } finally { 
      setSchoolSaving(false); 
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (newPassword !== confirmPassword) { setPwError('Yeni şifreler eşleşmiyor.'); return; }
    if (newPassword.length < 6) { setPwError('Yeni şifre en az 6 karakter olmalıdır.'); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setPwSuccess('Şifreniz başarıyla güncellendi.');
      clearMustChangePassword();
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) { setPwError(err.response?.data?.message || 'Şifre güncellenemedi.'); }
    finally { setPwLoading(false); }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Uzantı kontrolü (.db, .sqlite)
    if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite')) {
      toast.error('Lütfen sadece .db veya .sqlite uzantılı geçerli bir yedek dosyası seçin.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const ok = await confirm('DİKKAT: Veritabanı geri yüklendiğinde mevcut tüm verileriniz silinecek ve yedekteki veriler geçerli olacaktır. İşleme devam etmek istediğinize emin misiniz?');
    if (!ok) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    const toastId = toast.loading('Yedek yükleniyor...');

    try {
      const formData = new FormData();
      formData.append('dbfile', file);

      const res = await api.post('/settings/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Geri yükleme başarılı.', { id: toastId, duration: 5000 });
        // Başarı durumunda çıkış yaptırıp uygulamayı yeniden başlatmaya teşvik edebiliriz
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Geri yükleme işlemi sırasında bir hata oluştu.', { id: toastId });
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistem Ayarları"
        description="Okul bilgileri, mesaj şablonları ve hesap güvenliğini yönetin."
        icon={<Settings size={28} />}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button 
              variant="outline"
              onClick={async () => {
                try {
                  const res = await api.get('/settings/backup', { responseType: 'blob' });
                  const date = new Date().toISOString().slice(0, 10);
                  const url = URL.createObjectURL(res.data as Blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `okuldesk-yedek-${date}.db`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Veritabanı yedeği indirildi.');
                } catch {
                  toast.error('Yedek alınamadı. Lütfen tekrar deneyin.');
                }
              }}
            >
              <Save size={16} /> Veritabanı Yedeği İndir
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="gap-2 border-amber-300 text-amber-800 bg-amber-50/80 hover:bg-amber-100 font-medium"
            >
              {isRestoring ? <span className="animate-spin text-sm">⚙️</span> : <UploadCloud size={16} />}
              Yedeği Geri Yükle
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestoreBackup}
              accept=".db,.sqlite"
              className="hidden"
            />
            <Button
              variant="outline"
              className="text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
              onClick={async () => {
                try {
                  const { check } = await import('@tauri-apps/plugin-updater');
                  const toastId = toast.loading('Güncellemeler kontrol ediliyor...');
                  const update = await check();
                  if (update) {
                    toast.success(`Yeni sürüm (${update.version}) bulundu! İndiriliyor...`, { id: toastId });
                    await update.downloadAndInstall((event) => {
                      if (event.event === 'Finished') {
                        toast.success('Güncelleme indirildi. Kurulum başlatılıyor...', { id: toastId, duration: 8000 });
                      }
                    });
                  } else {
                    toast.success('Sisteminiz güncel. En son sürümü kullanıyorsunuz.', { id: toastId });
                  }
                } catch (error: any) {
                  toast.error('Güncelleme kontrolü başarısız: ' + error.toString());
                }
              }}
            >
              🔄 Güncellemeleri Denetle
            </Button>
          </div>
        }
      />

      {confirmModal}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Okul Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><School size={20} /></div>
              Okul Bilgileri
            </h2>
          </div>

          <div className="p-6">
            <form onSubmit={handleSaveSchool} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Okul Adı</label>
                  <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Atatürk Mesleki ve Teknik Anadolu Lisesi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Müdür Adı Soyadı</label>
                  <input type="text" value={principalName} onChange={e => setPrincipalName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Ahmet Yılmaz" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Eğitim Yılı</label>
                  <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Örn: 2025-2026" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">İlçe / İl</label>
                  <input type="text" value={schoolDistrictCity} onChange={e => setSchoolDistrictCity(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Osmangazi / BURSA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kurumsal Telefon Numarası</label>
                  <input type="text" value={schoolPhone} onChange={e => setSchoolPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Örn: 0224 123 45 67" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kurumsal E-Posta Adresi</label>
                  <input type="email" value={schoolEmail} onChange={e => setSchoolEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Örn: 123456@meb.k12.tr" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Okul Açık Adresi</label>
                  <textarea rows={2} value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Örn: Santral Garaj Mah. Kıbrıs Şehitleri Cad. No: 4 Osmangazi / BURSA" />
                  <p className="text-xs text-slate-500 mt-1">
                    ℹ️ Bu bilgiler, veli KVKK bilgilendirme metinlerinde, matbu PDF formlarında ve web onay portalında veri sorumlusu olarak kullanılır.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={schoolSaving} variant="primary">
                  {schoolSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Şifre Değiştir */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><KeyRound size={20} /></div>
              Şifre Değiştir
            </h2>
          </div>
          
          <div className="p-6">
            {pwError && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center justify-between"><div className="flex gap-2 items-center"><AlertTriangle size={16}/> {pwError}</div> <Button onClick={()=>setPwError('')}><X size={16}/></Button></div>}
            {pwSuccess && <div className="mb-4 text-sm text-green-600 bg-green-50 p-3 rounded-lg flex items-center justify-between"><div className="flex gap-2 items-center"><CheckCircle2 size={16}/> {pwSuccess}</div> <Button onClick={()=>setPwSuccess('')}><X size={16}/></Button></div>}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {[
                { label: 'Mevcut Şifre',       value: currentPassword, setter: setCurrentPassword, placeholder: 'Mevcut şifrenizi girin' },
                { label: 'Yeni Şifre',          value: newPassword,     setter: setNewPassword,     placeholder: 'En az 6 karakter' },
                { label: 'Yeni Şifre (Tekrar)', value: confirmPassword, setter: setConfirmPassword, placeholder: 'Yeni şifreyi tekrar girin' },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                  <input
                    type="password"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    placeholder={placeholder}
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <div className="pt-2">
                <Button type="submit" disabled={pwLoading} className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition disabled:opacity-50">
                  {pwLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}
