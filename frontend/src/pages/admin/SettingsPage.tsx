import React, { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { Settings, Save, Edit, ShieldAlert, School, KeyRound, MessageCircle, AlertTriangle, CheckCircle2, X, Info, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';

export default function SettingsPage() {
  const { user, clearMustChangePassword } = useAuth();
  const { refreshSettings } = useSettings();
  const { confirm, confirmModal } = useConfirm();

  const emptyLessonPeriods = () => Array.from({ length: 10 }, () => '');
  const parseLessonPeriodsJson = (value?: string) => {
    const periods = emptyLessonPeriods();
    if (!value) return periods;

    try {
      const parsed = JSON.parse(value) as Record<string, string>;
      for (let index = 0; index < periods.length; index++) {
        periods[index] = parsed[String(index + 1)] || '';
      }
    } catch {
      return periods;
    }

    return periods;
  };

  const stringifyLessonPeriods = (periods: string[]) => JSON.stringify(
    Object.fromEntries(
      periods
        .map((time, index) => [String(index + 1), time.trim()])
        .filter(([, time]) => Boolean(time)),
    ),
  );

  // ── Restore Backup ──
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // ── Okul bilgileri ──
  const [schoolName,    setSchoolName]    = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [academicYear,  setAcademicYear]  = useState('2025-2026');
  const [lessonPeriods, setLessonPeriods] = useState<string[]>(emptyLessonPeriods);
  const [schoolSaving,  setSchoolSaving]  = useState(false);

  // ── WhatsApp şablonları ──
  const [waTemplates,     setWaTemplates]     = useState<string[]>(['', '', '']);
  const [waTemplatesEdit, setWaTemplatesEdit] = useState<string[]>(['', '', '']);
  const [waSaving,        setWaSaving]        = useState(false);
  const [waError,         setWaError]         = useState('');
  const [waSuccess,       setWaSuccess]       = useState('');

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
      setLessonPeriods(parseLessonPeriodsJson(d.lessonPeriodsJson));
      setWaTemplates([d.waTemplate1 || '', d.waTemplate2 || '', d.waTemplate3 || '']);
      setWaTemplatesEdit([d.waTemplate1 || '', d.waTemplate2 || '', d.waTemplate3 || '']);
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
        lessonPeriodsJson: stringifyLessonPeriods(lessonPeriods),
      });
      toast.success('Kurum bilgileri güncellendi.');
      refreshSettings();
    } catch { 
      toast.error('Kayıt sırasında hata oluştu.'); 
    } finally { 
      setSchoolSaving(false); 
    }
  };

  const handleSaveWa = async (e: FormEvent) => {
    e.preventDefault();
    setWaError(''); setWaSuccess('');
    setWaSaving(true);
    try {
      await api.put('/settings', {
        waTemplate1: waTemplatesEdit[0],
        waTemplate2: waTemplatesEdit[1],
        waTemplate3: waTemplatesEdit[2],
      });
      setWaTemplates([...waTemplatesEdit]);
      setWaSuccess('WhatsApp şablonları başarıyla kaydedildi.');
    } catch { setWaError('Kayıt sırasında hata oluştu.'); }
    finally { setWaSaving(false); }
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
        <div className="flex flex-col gap-2 w-full lg:w-auto lg:items-end">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
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
              <Save size={18} /> Veritabanı Yedeği İndir
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="gap-2 border-amber-300 text-amber-50 hover:bg-amber-500/20 w-full sm:w-auto justify-center"
            >
              {isRestoring ? <span className="animate-spin text-lg">⚙️</span> : <UploadCloud size={18} />}
              Yedeği Geri Yükle
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestoreBackup}
              accept=".db,.sqlite"
              className="hidden"
            />
          </div>
          
          <Button
            variant="outline"
            className="text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 mt-2 w-full sm:w-auto justify-center"
            onClick={async () => {
              try {
                const { check } = await import('@tauri-apps/plugin-updater');
                const toastId = toast.loading('Güncellemeler kontrol ediliyor...');
                const update = await check();
                if (update) {
                  toast.success(`Yeni sürüm (${update.version}) bulundu! İndiriliyor...`, { id: toastId });
                  await update.downloadAndInstall((event) => {
                    if (event.event === 'Finished') {
                      toast.success('Güncelleme yüklendi. Uygulamayı yeniden başlatın.', { id: toastId, duration: 8000 });
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
            🔄 Güncellemeleri Kontrol Et
          </Button>
        </div>
        }
      />

      {confirmModal}

      {user?.mustChangePassword && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-amber-900 mb-1">Şifre Değişikliği Gerekli</h4>
            <p className="text-sm text-amber-800">Güvenliğiniz için ilk girişte şifrenizi değiştirmeniz gerekmektedir. Lütfen aşağıdaki "Şifre Değiştir" bölümünü doldurun.</p>
          </div>
        </div>
      )}

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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Okul Adı</label>
                  <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Atatürk Anadolu Lisesi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Müdür Adı Soyadı</label>
                  <input type="text" value={principalName} onChange={e => setPrincipalName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Ahmet Yılmaz" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Eğitim Yılı</label>
                  <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Örn: 2025-2026" />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Ders Saatleri</label>
                    <p className="text-xs text-slate-500 mt-1">Ders programı grid'inde başlık altında gösterilecek saat aralıklarını girin. Boş bırakılan saatler yalnızca numara ile gösterilir.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lessonPeriods.map((time, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="w-14 text-sm font-semibold text-slate-700">{index + 1}. Ders</span>
                      <input
                        type="text"
                        value={time}
                        onChange={(e) => setLessonPeriods((prev) => prev.map((item, itemIndex) => itemIndex === index ? e.target.value : item))}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                        placeholder="08:30-09:10"
                      />
                    </div>
                  ))}
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

      {/* WhatsApp Şablonları */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><MessageCircle size={20} /></div>
            WhatsApp Devamsızlık Mesaj Şablonları
          </h2>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800 mb-6 flex gap-3 flex-col sm:flex-row">
            <Info className="shrink-0 text-blue-500 mt-0.5" size={18}/>
            <div>
              <p className="mb-2 font-medium">Boş bırakılan şablonlar için sistemin varsayılan metni kullanılır. Mesajlarınızda aşağıdaki yer tutucuları kullanabilirsiniz:</p>
              <div className="flex flex-wrap gap-2">
                {['{{ogrenciAdi}}', '{{ozurluGun}}', '{{ozursuzGun}}', '{{toplamGun}}', '{{okulAdi}}', '{{uyariNo}}'].map(tag => (
                  <span key={tag} className="px-2 py-1 bg-white border border-blue-200 rounded font-mono text-xs font-bold text-blue-700 shadow-sm">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {waError && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center justify-between"><div className="flex gap-2 items-center"><AlertTriangle size={16}/> {waError}</div> <Button onClick={()=>setWaError('')}><X size={16}/></Button></div>}
          {waSuccess && <div className="mb-4 text-sm text-green-600 bg-green-50 p-3 rounded-lg flex items-center justify-between"><div className="flex gap-2 items-center"><CheckCircle2 size={16}/> {waSuccess}</div> <Button onClick={()=>setWaSuccess('')}><X size={16}/></Button></div>}

          <form onSubmit={handleSaveWa} className="animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n, i) => (
                  <div key={n} className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span>{n}. Uyarı Mesajı</span>
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">(boş = varsayılan)</span>
                    </label>
                    <textarea
                      rows={8}
                      value={waTemplatesEdit[i]}
                      onChange={e => {
                        const next = [...waTemplatesEdit];
                        next[i] = e.target.value;
                        setWaTemplatesEdit(next);
                      }}
                      placeholder={`Bu uyarı seviyesi için varsayılan mesaj kullanılacak...`}
                      className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 resize-y leading-relaxed"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-4 mt-6 border-t border-gray-100">
                <Button type="submit" disabled={waSaving} variant="primary">
                  {waSaving ? 'Kaydediliyor...' : 'Şablonları Kaydet'}
                </Button>
              </div>
            </form>
        </div>
      </div>

    </div>
  );
}
