import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { ActionModal } from '../../components/ui/ActionModal';
import { useConfirm } from '../../hooks/useConfirm';
import { useAuth } from '../../context/AuthContext';
import { usersService, UserItem, PermissionCategory, RolePreset } from '../../services/users.service';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  Copy,
  Check,
  Zap,
  Info,
  Laptop,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { confirm, confirmModal } = useConfirm();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [presets, setPresets] = useState<RolePreset[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');

  // Ekleme / Düzenleme Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'USER',
    permissions: [] as string[],
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  // Şifre Sıfırlama Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserItem | null>(null);
  const [customNewPassword, setCustomNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ username: string; plainPassword: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Yeni oluşturulan kullanıcının ilk şifresini gösterme modalı
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; plainPassword: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, meta] = await Promise.all([
        usersService.list(),
        usersService.getMeta(),
      ]);
      setUsers(uList);
      setCategories(meta.categories);
      setPresets(meta.presets);
    } catch {
      toast.error('Kullanıcı listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'ADMIN' && u.role === 'ADMIN') ||
        (roleFilter === 'USER' && u.role !== 'ADMIN');
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Modal Açılışları
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      fullName: '',
      password: '',
      role: 'USER',
      permissions: presets.find((p) => p.id === 'STUDENT_AFFAIRS')?.permissions || [],
      isActive: true,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (u: UserItem) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      fullName: u.fullName,
      password: '',
      role: u.role,
      permissions: u.permissions || [],
      isActive: u.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      toast.error('Kullanıcı adı boş bırakılamaz.');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        // Güncelleme
        const updated = await usersService.update(editingUser.id, {
          fullName: formData.fullName,
          role: formData.role,
          permissions: formData.role === 'ADMIN' ? ['*'] : formData.permissions,
          isActive: formData.isActive,
        });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        toast.success(`'${updated.username}' kullanıcısı güncellendi.`);
        setIsEditModalOpen(false);
      } else {
        // Yeni Ekleme
        const res = await usersService.create({
          username: formData.username,
          fullName: formData.fullName,
          password: formData.password,
          role: formData.role,
          permissions: formData.role === 'ADMIN' ? ['*'] : formData.permissions,
          isActive: formData.isActive,
        });
        setUsers((prev) => [...prev, res.user]);
        setIsEditModalOpen(false);

        // İlk oluşturulan giriş bilgilerini göster
        if (res.plainPassword) {
          setCreatedCredentials({
            username: res.user.username,
            plainPassword: res.plainPassword,
          });
        } else {
          toast.success('Yeni kullanıcı oluşturuldu.');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İşlem sırasında bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // Yetki kutucukları toggle
  const togglePermission = (key: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(key);
      const next = exists ? prev.permissions.filter((p) => p !== key) : [...prev.permissions, key];
      return { ...prev, permissions: next };
    });
  };

  const applyPreset = (preset: RolePreset) => {
    setFormData((prev) => ({
      ...prev,
      role: preset.id === 'ADMIN' ? 'ADMIN' : 'USER',
      permissions: [...preset.permissions],
    }));
    toast.success(`'${preset.name}' şablonu uygulandı.`);
  };

  const handleOpenResetPassword = (u: UserItem) => {
    setResetTargetUser(u);
    setCustomNewPassword('');
    setResetResult(null);
    setCopiedPass(false);
    setIsResetModalOpen(true);
  };

  const handleExecuteResetPassword = async () => {
    if (!resetTargetUser) return;
    setResetting(true);
    try {
      const res = await usersService.resetPassword(resetTargetUser.id, customNewPassword);
      setResetResult({
        username: res.username,
        plainPassword: res.plainPassword,
      });
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Şifre sıfırlanamadı.');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (u: UserItem) => {
    const ok = await confirm(
      `'${u.username}' (${u.fullName}) kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
    );
    if (!ok) return;

    try {
      await usersService.delete(u.id);
      setUsers((prev) => prev.filter((item) => item.id !== u.id));
      toast.success(`'${u.username}' kullanıcısı silindi.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanıcı silinemedi.');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    toast.success('Panoya kopyalandı.');
    setTimeout(() => setCopiedPass(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kullanıcı ve Yetki Yönetimi"
        description="Okul idarecileri ve personel için hesap tanımlama, şifre sıfırlama ve modül bazlı yetkilendirme."
        icon={<Users size={28} />}
        actions={
          <Button variant="primary" onClick={handleOpenAddModal} className="gap-2">
            <UserPlus size={16} />
            Yeni Kullanıcı Ekle
          </Button>
        }
      />

      {confirmModal}

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Toplam Kullanıcı
            </span>
            <span className="text-2xl font-bold text-slate-900">{users.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Aktif Kullanıcı
            </span>
            <span className="text-2xl font-bold text-emerald-700">
              {users.filter((u) => u.isActive).length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Shield size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Yönetici (Admin)
            </span>
            <span className="text-2xl font-bold text-amber-700">
              {users.filter((u) => u.role === 'ADMIN').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filtre ve Arama Alanı */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Kullanıcı adı veya ad soyad ile ara..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">Tüm Roller</option>
            <option value="ADMIN">Yöneticiler (Admin)</option>
            <option value="USER">Özel Yetkili Kullanıcılar</option>
          </select>
        </div>
      </div>

      {/* Kullanıcı Listesi Tablosu */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Kullanıcı Bilgisi</th>
                <th className="py-3 px-4">Rol & Yetki Kapsamı</th>
                <th className="py-3 px-4">Modül Sayısı</th>
                <th className="py-3 px-4">Durum</th>
                <th className="py-3 px-4">Kayıt Tarihi</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto mb-2" />
                    Kullanıcılar yükleniyor...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    Kayıtlı kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Kullanıcı Bilgisi */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                              isAdmin
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {(u.fullName || u.username).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {u.fullName || u.username}
                              {isCurrent && (
                                <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                                  Siz
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Shield size={12} className="text-amber-600" />
                            Tam Yetkili Yönetici
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                            <Laptop size={12} className="text-sky-600" />
                            Özel Yetkili İdareci
                          </span>
                        )}
                      </td>

                      {/* Yetki Sayısı */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ⭐ Tüm Modüllere Erişim
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {u.permissions?.length || 0} Modül Yetkisi
                          </span>
                        )}
                      </td>

                      {/* Durum */}
                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Askıya Alındı
                          </span>
                        )}
                      </td>

                      {/* Kayıt Tarihi */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                      </td>

                      {/* İşlemler */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenResetPassword(u)}
                            title="Şifre Sıfırla"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <KeyRound size={16} />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(u)}
                            title="Düzenle ve Yetkileri Yönet"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Edit2 size={16} />
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Kullanıcıyı Sil"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Kullanıcı Ekleme / Düzenleme Modalı ── */}
      <ActionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingUser ? `Kullanıcı Düzenle: ${editingUser.username}` : 'Yeni Kullanıcı Tanımla'}
        width="xl"
        onSubmit={handleSaveUser}
        submitText={saving ? 'Kaydediliyor...' : editingUser ? 'Değişiklikleri Kaydet' : 'Kullanıcıyı Oluştur'}
        submitDisabled={saving}
      >
        <div className="space-y-5">
          {/* Temel Bilgiler Formu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kullanıcı Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={Boolean(editingUser)} // Kullanıcı adı sonradan değiştirilemez
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })
                }
                placeholder="Örn: kemal.kaya"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Giriş yaparken kullanılacak tekil kullanıcı adı
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Adı Soyadı & Unvanı
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Örn: Kemal Kaya (Müdür Yrd.)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Sistemde ve audit loglarında görüntülenecek isim
              </span>
            </div>

            {!editingUser && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  İlk Şifre (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Boş bırakılırsa otomatik üretilir"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  En az 6 karakter. Boş bırakırsanız sistem güvenli bir şifre üretecektir.
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hesap Rolü</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const r = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    role: r,
                    permissions: r === 'ADMIN' ? ['*'] : prev.permissions,
                  }));
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-semibold"
              >
                <option value="USER">Özel Yetkili İdareci / Kullanıcı</option>
                <option value="ADMIN">🌟 Tam Yetkili Yönetici (Admin)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                <span className="ml-2.5 text-xs font-bold text-slate-700">
                  {formData.isActive ? 'Hesap Aktif' : 'Hesap Askıya Alınmış (Giriş Yapamaz)'}
                </span>
              </label>
            </div>
          </div>

          {/* Yetki Seçim Bölümü */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Lock size={16} className="text-indigo-600" />
                  Erişebileceği Modüller & Sayfalar
                </h4>
                <p className="text-xs text-slate-500">
                  {formData.role === 'ADMIN'
                    ? 'Yönetici rolündeki hesaplar tüm modüllere otomatik olarak tam erişim yetkisine sahiptir.'
                    : 'Kullanıcının yalnızca işaretlenen modülleri görmesini ve kullanmasını sağlayabilirsiniz.'}
                </p>
              </div>

              {/* Hızlı Şablon Butonları */}
              {formData.role !== 'ADMIN' && (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition"
                    >
                      {preset.name.split(' (')[0]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, permissions: [] })}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg"
                  >
                    Temizle
                  </button>
                </div>
              )}
            </div>

            {formData.role === 'ADMIN' ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5 font-medium">
                <Shield size={18} className="text-amber-600 shrink-0" />
                Bu kullanıcı Tam Yetkili Yönetici (ADMIN) olduğu için tüm mevcut ve gelecekte eklenecek modüllere doğrudan yetkilidir.
              </div>
            ) : (
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div key={cat.name} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                        {cat.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const catKeys = cat.permissions.map((p) => p.key);
                          const allSelected = catKeys.every((k) => formData.permissions.includes(k));
                          if (allSelected) {
                            setFormData((prev) => ({
                              ...prev,
                              permissions: prev.permissions.filter((k) => !catKeys.includes(k)),
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              permissions: Array.from(new Set([...prev.permissions, ...catKeys])),
                            }));
                          }
                        }}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold"
                      >
                        {cat.permissions.every((p) => formData.permissions.includes(p.key))
                          ? 'Kategori Seçimini Kaldır'
                          : 'Tümünü Seç'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cat.permissions.map((perm) => {
                        const isChecked = formData.permissions.includes(perm.key);
                        return (
                          <label
                            key={perm.key}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                              isChecked
                                ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950'
                                : 'bg-slate-50/40 border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.key)}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="min-w-0">
                              <span className="block text-xs font-bold">{perm.label}</span>
                              <span className="block text-[11px] text-slate-500 leading-tight">
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ActionModal>

      {/* ── Şifre Sıfırlama Modalı ── */}
      <ActionModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Kullanıcı Şifresini Sıfırla"
        width="md"
        hideFooter={Boolean(resetResult)}
        onSubmit={(e) => {
          e.preventDefault();
          handleExecuteResetPassword();
        }}
        submitText={resetting ? 'Sıfırlanıyor...' : 'Yeni Şifreyi Belirle'}
        submitDisabled={resetting}
      >
        {resetResult ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Şifre Başarıyla Sıfırlandı!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Aşağıdaki geçici şifreyi personele iletebilirsiniz. Kullanıcı sisteme ilk girişinde bu şifreyi kendi belirleyeceği şifre ile değiştirecektir.
              </p>
            </div>

            <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between font-mono text-base font-bold text-indigo-800">
              <span>{resetResult.plainPassword}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(resetResult.plainPassword)}
                className="gap-1.5 text-xs h-8 bg-white"
              >
                {copiedPass ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                Kopyala
              </Button>
            </div>

            <Button
              variant="primary"
              className="w-full mt-2"
              onClick={() => setIsResetModalOpen(false)}
            >
              Tamam
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>@{resetTargetUser?.username}</strong> kullanıcısının şifresi sıfırlanacaktır.
                Yeni bir şifre yazabilir veya boş bırakarak sistemin otomatik şifre üretmesini sağlayabilirsiniz.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Yeni Geçici Şifre (İsteğe Bağlı)
              </label>
              <input
                type="text"
                value={customNewPassword}
                onChange={(e) => setCustomNewPassword(e.target.value)}
                placeholder="Boş bırakılırsa örn: okul4892 olarak otomatik üretilir"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Manuel girmek isterseniz en az 6 karakter giriniz.
              </span>
            </div>
          </div>
        )}
      </ActionModal>

      {/* ── Yeni Kullanıcı Giriş Bilgileri Kartı Modalı ── */}
      {createdCredentials && (
        <ActionModal
          isOpen={Boolean(createdCredentials)}
          onClose={() => setCreatedCredentials(null)}
          title="Kullanıcı Oluşturuldu!"
          width="md"
          hideFooter
        >
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">Giriş Bilgileri Hazır</h4>
              <p className="text-xs text-slate-500 mt-1">
                Kullanıcı bu bilgiler ile oturum açabilir. İlk girişte şifre değiştirmesi zorunludur.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Kullanıcı Adı:</span>
                <span className="font-bold text-slate-900">{createdCredentials.username}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500">İlk Şifre:</span>
                <span className="font-bold text-indigo-700 text-sm">{createdCredentials.plainPassword}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 text-xs"
                onClick={() =>
                  handleCopy(
                    `OkulDesk Giriş Bilgileri\nKullanıcı Adı: ${createdCredentials.username}\nŞifre: ${createdCredentials.plainPassword}`
                  )
                }
              >
                {copiedPass ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                Bilgileri Kopyala
              </Button>
              <Button
                variant="primary"
                className="flex-1 text-xs"
                onClick={() => setCreatedCredentials(null)}
              >
                Kapat
              </Button>
            </div>
          </div>
        </ActionModal>
      )}
    </div>
  );
}
