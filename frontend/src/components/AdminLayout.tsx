import { useState, useEffect, Suspense } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Mail,
  AlertTriangle,
  ShieldAlert,
  TrendingDown,
  Bell,
  FileText,
  FileCheck,
  MessageSquare,
  Settings,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Printer,
  CalendarRange,
  UsersRound,
  Network,
  CalendarDays,
  Flag,
  PartyPopper,
  Handshake,
  Bus,
  Dumbbell,
  Calculator,
  ArrowRightLeft,
  Trophy,
  CalendarOff,
  FileSignature,
  Building2,
  FileBox,
  Receipt
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { CommandPalette } from './ui/CommandPalette';
import packageJson from '../../package.json';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  collapsed: boolean;
  end?: boolean;
}

function NavItem({ to, icon: Icon, label, onClick, collapsed, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end={end || to === '/admin'}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center rounded-lg transition-all duration-200 mb-0.5 no-underline ${collapsed ? 'justify-center py-2.5 gap-0' : 'justify-start py-2 px-3 gap-3'
        } ${isActive
          ? 'bg-blue-400/15 text-blue-300 font-semibold'
          : 'text-white/70 font-normal hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <Icon size={18} className="shrink-0 opacity-90 text-inherit" />
      {!collapsed && (
        <span className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight text-sm">
          {label}
        </span>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobil drawer için
  const [collapsed, setCollapsed] = useState(false); // Masaüstü yan menü daraltma

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    let mounted = true;
    const checkUpdates = async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update && mounted) {
          toast((t) => (
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-sm">Yeni Sürüm Mevcut ({update.version})</span>
              <span className="text-xs text-slate-500">OkulDesk'in yeni bir sürümü yayınlandı. Şimdi güncellemek ister misiniz?</span>
              <div className="flex gap-2 mt-1">
                <button 
                  onClick={async () => {
                    toast.dismiss(t.id);
                    const toastId = toast.loading('Güncelleme indiriliyor, lütfen bekleyin...');
                    try {
                      await update.downloadAndInstall((event) => {
                        if (event.event === 'Finished') {
                          toast.success('Güncelleme yüklendi. Uygulama yeniden başlatılıyor.', { id: toastId, duration: 5000 });
                          setTimeout(async () => {
                            const { relaunch } = await import('@tauri-apps/plugin-process');
                            await relaunch();
                          }, 1500);
                        }
                      });
                    } catch(err) {
                      toast.error('Güncelleme hatası: ' + String(err), { id: toastId });
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition"
                >
                  Şimdi Güncelle
                </button>
                <button 
                  onClick={() => toast.dismiss(t.id)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium transition"
                >
                  Daha Sonra
                </button>
              </div>
            </div>
          ), { duration: Infinity, position: 'bottom-right' });
        }
      } catch (err) {
        console.log('Update check failed or running in browser:', err);
      }
    };
    
    if (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) {
      setTimeout(checkUpdates, 3000);
    }
    
    return () => { mounted = false; };
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden text-slate-800 font-sans print:h-auto print:overflow-visible">
      <Toaster position="top-right" />
      <CommandPalette />
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-slate-900 text-white rounded-md shadow-md print:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Menüyü aç"
      >
        <span className="text-xl leading-none">{sidebarOpen ? '✕' : '☰'}</span>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-gray-900/60 transition-opacity z-30"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed md:relative z-40 flex flex-col h-screen bg-slate-950 border-r border-white/10 transition-all duration-300 ease-in-out print:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } ${collapsed ? 'w-[76px] min-w-[76px]' : 'w-[252px] min-w-[252px]'}`}
      >
        {/* Logo / Başlık */}
        <div
          className={`flex items-center min-h-[68px] border-b border-white/10 ${collapsed ? 'justify-center py-[18px] px-3.5' : 'justify-between py-[18px] px-4'
            }`}
        >
          <div className="flex items-center gap-[11px] overflow-hidden">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(59,130,246,0.3)]">
              <GraduationCap size={20} className="text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white m-0 tracking-tight">
                  OkulDesk
                </h2>
                <p className="text-xs text-white/45 m-0">
                  Yönetim Paneli
                </p>
              </div>
            )}
          </div>

          {/* Menü Daraltma Butonu (Masaüstü) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
            className="hidden md:flex bg-white/5 border-none rounded-md w-[26px] h-[26px] items-center justify-center text-white/60 cursor-pointer shrink-0 transition-colors hover:bg-white/10 hover:text-white"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Menü Öğeleri */}
        <nav className={`flex-1 overflow-y-auto flex flex-col ${collapsed ? 'py-3 px-2' : 'py-3 px-2.5'}`}>
          {/* Genel */}
          {!collapsed && <span className="text-xs font-bold text-cyan-300/80 uppercase tracking-wider mb-2 mt-1 px-3">Genel</span>}
          {collapsed && <div className="h-2" />}
          <NavItem to="/admin" icon={LayoutDashboard} label="Gösterge Paneli" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/students" icon={Users} label="Öğrenci Listesi" onClick={closeSidebar} collapsed={collapsed} />

          {/* Öğrenci İşlemleri */}
          {!collapsed && <span className="text-xs font-bold text-purple-300/80 uppercase tracking-wider mb-2 mt-4 px-3">Öğrenci İşlemleri</span>}
          {collapsed && <div className="h-3 border-t border-white/10 my-1.5" />}
          <NavItem to="/admin/parent-leave" icon={FileSignature} label="Veli İzin Dilekçesi" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/absenteeism" icon={Mail} label="Devamsızlık Mektubu" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/warnings" icon={AlertTriangle} label="Yazılı Uyarılar" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/violations" icon={ShieldAlert} label="İhlal Takibi" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/grade-reports" icon={TrendingDown} label="Başarısızlık Riski Bildirimi" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/parent-notification" icon={Bell} label="ÖMYK Devamsızlık Bildirimi" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/matbu-evraklar" icon={Printer} label="Kayıt Evrakları" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/parent-meeting" icon={FileText} label="Veli Toplantısı İmza Sirküsü" onClick={closeSidebar} collapsed={collapsed} />

          {/* Eğitim & Öğretim */}
          {!collapsed && <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider mb-2 mt-4 px-3">Eğitim & Öğretim</span>}
          {collapsed && <div className="h-3 border-t border-white/10 my-1.5" />}
          <NavItem to="/admin/duty-schedule" icon={CalendarRange} label="Nöbet Çizelgesi" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/timetable" icon={CalendarDays} label="Ders Programı" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/cover-assignments" icon={UserCheck} label="Boş Ders Doldurma" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/board-meeting" icon={UsersRound} label="Öğretmenler Kurulu" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/social-activity" icon={PartyPopper} label="Sosyal Etkinlik Planı" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/student-club" icon={Trophy} label="Öğrenci Kulüpleri" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/class-teachers" icon={UsersRound} label="Sınıf Rehber Öğretmenleri" onClick={closeSidebar} collapsed={collapsed} />

          {/* Personel & İnsan Kaynakları */}
          {!collapsed && <span className="text-xs font-bold text-blue-300/80 uppercase tracking-wider mb-2 mt-4 px-3">Personel & İnsan Kayn.</span>}
          {collapsed && <div className="h-3 border-t border-white/10 my-1.5" />}
          <NavItem to="/admin/staff" icon={UserCheck} label="Personel Havuzu" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/attendance-sheet" icon={FileSignature} label="Personel İmza Çizelgesi" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/teblig" icon={FileCheck} label="Tebliğ – Tebellüğ Belgesi" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/staff-transfer" icon={ArrowRightLeft} label="Personel Nakil Bildirimi" onClick={closeSidebar} collapsed={collapsed} />

          {/* Kurullar & Planlama */}
          {!collapsed && <span className="text-xs font-bold text-orange-300/80 uppercase tracking-wider mb-2 mt-4 px-3">Kurullar & Planlama</span>}
          {collapsed && <div className="h-3 border-t border-white/10 my-1.5" />}

          <NavItem to="/admin/commission" icon={Network} label="Kurul ve Komisyonlar" onClick={closeSidebar} collapsed={collapsed} />

          <NavItem to="/admin/field-trip" icon={Bus} label="Okul Gezi Planı" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/commemorative-days" icon={Flag} label="Belirli Gün ve Haftalar" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/holidays" icon={CalendarOff} label="Resmi Tatiller" onClick={closeSidebar} collapsed={collapsed} />

          {/* Satın Alma & Mali İşler */}
          {!collapsed && <span className="text-xs font-bold text-rose-300/80 uppercase tracking-wider mb-2 mt-4 px-3">Satın Alma & Mali İşler</span>}
          {collapsed && <div className="h-3 border-t border-white/10 my-1.5" />}
          <NavItem to="/admin/invoice-tracking" icon={Receipt} label="Fatura & Ödenek Takip" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/procurement" icon={FileSignature} label="Doğrudan Temin (22/d)" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/supplier" icon={Building2} label="Firma Rehberi" onClick={closeSidebar} collapsed={collapsed} />

          {/* Sistem */}
          {!collapsed && <span className="text-xs font-bold text-teal-300/80 uppercase tracking-wider mb-2 mt-4 px-3">Sistem</span>}
          {collapsed && <div className="h-3 border-t border-white/10 my-1.5" />}
          <NavItem to="/admin/whatsapp" icon={MessageSquare} label="WhatsApp Bağlantısı" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/settings" icon={Settings} label="Ayarlar" onClick={closeSidebar} collapsed={collapsed} />
          <NavItem to="/admin/audit-logs" icon={Activity} label="Sistem İzlenebilirliği (Audit)" onClick={closeSidebar} collapsed={collapsed} />
        </nav>

        {/* Alt Bilgi & Çıkış */}
        <div className={`flex items-center border-t border-white/10 gap-2 ${collapsed ? 'justify-center py-3.5 px-2' : 'justify-between py-3.5 px-4'}`}>
          {!collapsed ? (
            <>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white/90 overflow-hidden text-ellipsis whitespace-nowrap">
                  {user?.username || 'Yönetici'}
                </div>
                <div className="text-xs text-white/40 mt-px flex items-center gap-2">
                  <span>Yetkili Hesap</span>
                  <span className="bg-white/10 px-1.5 rounded-sm text-[10px]">v{packageJson.version}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Çıkış Yap"
                className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 rounded-lg text-red-300 text-xs py-1.5 px-3 cursor-pointer transition-colors hover:bg-red-500/25 hover:text-white"
              >
                <LogOut size={14} />
                <span>Çıkış</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              className="flex items-center justify-center bg-red-500/15 border border-red-500/30 rounded-lg text-red-300 w-9 h-9 cursor-pointer transition-colors hover:bg-red-500/25 hover:text-white"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 h-screen flex flex-col transform translate-x-0 bg-slate-200 print:h-auto print:bg-white print:p-0 print:transform-none">
        <div className="flex-1 overflow-y-auto print:overflow-visible">
          <Suspense fallback={
            <div className="flex h-full w-full items-center justify-center min-h-screen bg-slate-200">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent opacity-60" />
            </div>
          }>
            <div className="p-6 md:p-8 print:p-0">
              <Outlet />
            </div>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
