import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSettings } from '../../context/SettingsContext';
import { LayoutDashboard, Receipt } from 'lucide-react';

interface DashboardData {
  totalStudents: number;
  totalStaff: number;
  absenteeism: { total: number; sentCount: number; notSentCount: number };
  warnings: { total: number; studentsWithWarnings: number };
  violations: { totalUploads: number; totalViolations: number; confirmedViolations: number };
  whatsapp: { consentedParents: number };
  schoolName: string;
  principalName: string;
  fieldTripsCount: number;
  commissionsCount: number;
  dutyCount: number;
  invoices: {
    bekleyenOdenekTalebi: number;
    odenekTalepEdildi: number;
    odenekGeldiMysBekliyor: number;
    odendi: number;
  };
  chartData?: { date: string; ihlal: number; devamsizlik: number }[];
}

const emptyData: DashboardData = {
  totalStudents: 0,
  totalStaff: 0,
  absenteeism: { total: 0, sentCount: 0, notSentCount: 0 },
  warnings: { total: 0, studentsWithWarnings: 0 },
  violations: { totalUploads: 0, totalViolations: 0, confirmedViolations: 0 },
  whatsapp: { consentedParents: 0 },
  schoolName: '',
  principalName: '',
  fieldTripsCount: 0,
  commissionsCount: 0,
  dutyCount: 0,
  invoices: { bekleyenOdenekTalebi: 0, odenekTalepEdildi: 0, odenekGeldiMysBekliyor: 0, odendi: 0 },
};

export default function DashboardPage() {
  const { settings } = useSettings();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  

  const load = async () => {
    setLoading(true);
    void 0;
    try {
      const response = await api.get('/dashboard/summary');
      setData(response.data?.data ?? emptyData);
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      toast.error('Gösterge paneli verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex h-full min-h-[360px] items-center justify-center"><RefreshCw className="animate-spin text-slate-500" size={28} /></div>;
  }

  const cards = [
    { icon: Users,         value: data.totalStudents,                  label: 'Aktif Öğrenci',    color: 'text-blue-600',    bg: 'bg-blue-50',    path: '/admin/students' },
    { icon: UserCheck,     value: data.totalStaff,                     label: 'Aktif Personel',    color: 'text-indigo-600',  bg: 'bg-indigo-50',  path: '/admin/staff' },
    { icon: CheckCircle2,  value: data.fieldTripsCount,                label: 'Planlı Gezi',      color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/admin/field-trip' },
    { icon: Briefcase,     value: data.commissionsCount,               label: 'Aktif Komisyon',    color: 'text-orange-600',  bg: 'bg-orange-50',  path: '/admin/commission' },
    { icon: Clock,         value: data.dutyCount,                      label: 'Nöbet Yeri',        color: 'text-purple-600',  bg: 'bg-purple-50',  path: '/admin/duty-schedule' },
    { icon: FileText,      value: data.absenteeism.total,              label: 'Devamsızlık Kaydı', color: 'text-cyan-600',    bg: 'bg-cyan-50',    path: '/admin/absenteeism' },
    { icon: AlertTriangle, value: data.warnings.total,                 label: 'Yazılı Uyardı',    color: 'text-amber-600',   bg: 'bg-amber-50',   path: '/admin/warnings' },
    { icon: ShieldAlert,   value: data.violations.confirmedViolations, label: 'Onaylı İhlal',     color: 'text-red-600',     bg: 'bg-red-50',     path: '/admin/violations' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gösterge Paneli"
        description={`${data.schoolName || 'OkulDesk Yönetim Paneli'}${data.principalName ? ` · Müdür: ${data.principalName}` : ''}`}
        icon={<LayoutDashboard size={28} />}
        actions={
          <>
            <Link
              to="/admin/settings"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium hover:bg-slate-50 text-slate-700"
            >
              <Settings size={15} /> Ayarlar
            </Link>
            <Button variant="outline" size="sm" onClick={load} className="flex items-center gap-1.5 px-3.5 py-2 text-sm">
              <RefreshCw size={15} /> Yenile
            </Button>
          </>
        }
      />

      {new Date().getDay() === 5 && settings?.dutyRotationFreq && settings.dutyRotationFreq !== 'none' && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-indigo-800">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Nöbet Rotasyonu Hatırlatması</h4>
            <p className="text-xs mt-1">
              Bugün Cuma. Nöbet yerlerinde {
                settings.dutyRotationFreq === 'weekly' ? 'haftalık' :
                settings.dutyRotationFreq === 'biweekly' ? '2 haftalık' :
                settings.dutyRotationFreq === 'fourweekly' ? '4 haftalık' : 'aylık'
              } rotasyon uygulanıyor. Gelecek haftanın nöbet yerlerini oluşturmayı unutmayın.
            </p>
          </div>
          <Link to="/admin/duty-schedule" className="ml-auto flex items-center gap-1 bg-white px-3 py-1.5 rounded text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition">
            <Clock size={14} /> Nöbete Git
          </Link>
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {cards.map(({ icon: Icon, value, label, color, bg, path }) => (
          <Link
            key={label}
            to={path}
            className="flex min-h-[108px] items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div><div className="mb-1 text-xs font-medium text-slate-500">{label}</div><div className={`text-2xl font-bold ${color}`}>{value}</div></div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}><Icon size={20} className={color} /></div>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailCard title="Devamsızlık Durumu" icon={FileText} to="/admin/absenteeism">
          <MiniStat value={data.absenteeism.notSentCount} label="Gönderilmedi" className="text-red-600" />
          <MiniStat value={data.absenteeism.sentCount} label="Gönderildi" className="text-green-600" />
          <MiniStat value={data.absenteeism.total} label="Toplam" className="text-indigo-600" />
        </DetailCard>
        <DetailCard title="Yazılı Uyardılar" icon={AlertTriangle} to="/admin/warnings" cols={2}>
          <MiniStat value={data.warnings.total} label="Toplam" className="text-amber-600" />
          <MiniStat value={data.warnings.studentsWithWarnings} label="Öğrenci" className="text-purple-600" />
        </DetailCard>
        <DetailCard title="İhlal Takibi" icon={ShieldAlert} to="/admin/violations">
          <MiniStat value={data.violations.totalUploads} label="Yükleme" className="text-blue-600" />
          <MiniStat value={data.violations.totalViolations} label="Toplam" className="text-orange-600" />
          <MiniStat value={data.violations.confirmedViolations} label="Onaylı" className="text-red-600" />
        </DetailCard>
        <DetailCard title="WhatsApp" icon={MessageSquare} to="/admin/whatsapp" cols={1}>
          <MiniStat value={data.whatsapp.consentedParents} label="Onaylı Veli" className="text-green-600" />
        </DetailCard>
        <DetailCard title="Fatura Takibi" icon={Receipt} to="/admin/invoice-tracking" cols={4} className="md:col-span-2 xl:col-span-2">
          <MiniStat value={data.invoices.bekleyenOdenekTalebi} label="Ödenek Bekleyen" className="text-red-600" />
          <MiniStat value={data.invoices.odenekTalepEdildi} label="Talep Edildi" className="text-orange-600" />
          <MiniStat value={data.invoices.odenekGeldiMysBekliyor} label="MYS Bekleyen" className="text-blue-600" />
          <MiniStat value={data.invoices.odendi} label="Ödendi" className="text-green-600" />
        </DetailCard>
      </section>

      {/* Chart Section */}
      {data.chartData && data.chartData.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Son 30 Gün İhlal ve Devamsızlık Trendi</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIhlal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDevamsizlik" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 12 }} stroke="#cbd5e1" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                />
                <Area type="monotone" name="İhlal" dataKey="ihlal" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorIhlal)" />
                <Area type="monotone" name="Devamsızlık" dataKey="devamsizlik" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorDevamsizlik)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

function DetailCard({ title, icon: Icon, to, children, className = '' }: { title: string; icon: React.ElementType; to: string; children: React.ReactNode; cols?: number; className?: string }) {
  return (
    <Link to={to} className={`flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
          <Icon size={18} />
        </div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="mt-auto flex w-full items-stretch rounded-xl bg-slate-50/80 border border-slate-100 p-1.5 divide-x divide-slate-200/60">
        {children}
      </div>
    </Link>
  );
}

function MiniStat({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-2 text-center">
      <div className={`text-xl font-bold ${className}`}>{value}</div>
      <div className="mt-1 w-full text-xs font-medium text-slate-500 leading-tight break-words">{label}</div>
    </div>
  );
}
