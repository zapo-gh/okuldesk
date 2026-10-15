import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

const LoginPage = React.lazy(() => import('./pages/admin/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'));
const StudentListPage = React.lazy(() => import('./pages/admin/StudentListPage'));
const Student360Page = React.lazy(() => import('./pages/admin/Student360Page'));
const AbsenteeismPage = React.lazy(() => import('./pages/admin/AbsenteeismPage'));
const DailyAbsenteeismPage = React.lazy(() => import('./pages/admin/DailyAbsenteeismPage'));
const WarningsPage = React.lazy(() => import('./pages/admin/WarningsPage'));
const ViolationsPage = React.lazy(() => import('./pages/admin/ViolationsPage'));
const StaffPage = React.lazy(() => import('./pages/admin/StaffPage'));
const WhatsAppPage = React.lazy(() => import('./pages/admin/WhatsAppPage'));
const WhatsAppConsentPage = React.lazy(() => import('./pages/admin/WhatsAppConsentPage'));
const GradeReportPage = React.lazy(() => import('./pages/admin/GradeReportPage'));
const ParentMeetingPage = React.lazy(() => import('./pages/admin/ParentMeetingPage'));
const ClassTeachersPage = React.lazy(() => import('./pages/admin/modules/ClassTeachersPage'));
const ParentNotificationPage = React.lazy(() => import('./pages/admin/ParentNotificationPage'));
const TebligPage = React.lazy(() => import('./pages/admin/TebligPage'));
const SettingsPage = React.lazy(() => import('./pages/admin/SettingsPage'));
const UsersPage = React.lazy(() => import('./pages/admin/UsersPage'));
const AuditLogPage = React.lazy(() => import('./pages/admin/AuditLogPage'));
const MatbuEvraklarPage = React.lazy(() => import('./pages/admin/MatbuEvraklarPage'));
const DutySchedulePage = React.lazy(() => import('./pages/admin/modules/DutySchedulePage'));
const BoardMeetingPage = React.lazy(() => import('./pages/admin/modules/BoardMeetingPage'));
const CommissionPage = React.lazy(() => import('./pages/admin/modules/CommissionPage'));
const AnnualPlanPage = React.lazy(() => import('./pages/admin/modules/AnnualPlanPage'));
const CommemorativeDaysPage = React.lazy(() => import('./pages/admin/modules/CommemorativeDaysPage'));
const SocialActivityPage = React.lazy(() => import('./pages/admin/modules/SocialActivityPage'));
const ParentAssociationPage = React.lazy(() => import('./pages/admin/modules/ParentAssociationPage'));
const FieldTripPage = React.lazy(() => import('./pages/admin/modules/FieldTripPage'));
const ExtracurricularPage = React.lazy(() => import('./pages/admin/modules/ExtracurricularPage'));
const TravelAllowancePage = React.lazy(() => import('./pages/admin/modules/TravelAllowancePage'));
const StaffTransferPage = React.lazy(() => import('./pages/admin/modules/StaffTransferPage'));
const StudentClubPage = React.lazy(() => import('./pages/admin/modules/StudentClubPage'));
const OrderLetterPage = React.lazy(() => import('./pages/admin/modules/OrderLetterPage'));
const HolidayPage = React.lazy(() => import('./pages/admin/modules/HolidayPage'));
const AttendanceSheetPage = React.lazy(() => import('./pages/admin/modules/AttendanceSheetPage'));
const SupplierPage = React.lazy(() => import('./pages/admin/modules/SupplierPage'));
const ProcurementPage = React.lazy(() => import('./pages/admin/modules/ProcurementPage'));
const InvoiceTrackingPage = React.lazy(() => import('./pages/admin/modules/InvoiceTrackingPage'));
const ParentLeavePage = React.lazy(() => import('./pages/admin/modules/ParentLeavePage'));
const PetitionsPage = React.lazy(() => import('./pages/admin/modules/PetitionsPage'));
const TimetablePage = React.lazy(() => import('./pages/admin/modules/TimetablePage'));
const CoverAssignmentPage = React.lazy(() => import('./pages/admin/modules/CoverAssignmentPage'));
const FolderSpinePage = React.lazy(() => import('./pages/admin/modules/FolderSpinePage'));

import { getEffectiveServerUrl, setCustomServerUrl, isClientMode } from './services/api';
import { NetworkSetupModal } from './components/NetworkSetupModal';
import { WifiOff, Search, RefreshCw, Laptop } from 'lucide-react';
import { Button } from './components/ui/Button';

const PageLoader = () => <div className="flex h-full w-full items-center justify-center min-h-[300px]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent opacity-70" /></div>;

function App() {
  const [backendReady, setBackendReady] = React.useState(false);
  const [connectionFailed, setConnectionFailed] = React.useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = React.useState(false);

  const serverUrl = getEffectiveServerUrl();
  const healthUrl = serverUrl.endsWith('/api') ? `${serverUrl}/health` : `${serverUrl}/api/health`;

  React.useEffect(() => {
    let mounted = true;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const checkHealth = async () => {
      try {
        const res = await fetch(healthUrl);
        if (res.ok && mounted) {
          setBackendReady(true);
          setConnectionFailed(false);
        } else if (mounted) {
          attempts += 1;
          if (attempts >= 4) {
            setConnectionFailed(true);
          }
          retryTimer = setTimeout(checkHealth, 1500);
        }
      } catch {
        if (mounted) {
          attempts += 1;
          if (attempts >= 4) {
            setConnectionFailed(true);
          }
          retryTimer = setTimeout(checkHealth, 1500);
        }
      }
    };

    checkHealth();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [healthUrl]);

  if (connectionFailed && !backendReady) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-950 text-white p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-4">
          <div className="mx-auto w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center">
            <WifiOff size={28} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">Ana Sunucuya Bağlanılamadı</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono break-all bg-slate-950/60 py-1.5 px-3 rounded-lg border border-slate-800 inline-block">
              {serverUrl}
            </p>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {isClientMode()
              ? 'OkulDesk ana bilgisayarına erişilemedi. Ana bilgisayarın açık ve aynı Wi-Fi/kablo ağına bağlı olduğundan emin olun.'
              : 'Yerel veritabanı servisi yanıt vermiyor. Yeniden deneyebilir veya ağdaki başka bir ana bilgisayara bağlanabilirsiniz.'}
          </p>

          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              variant="primary"
              onClick={() => setIsNetworkModalOpen(true)}
              className="w-full justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Search size={16} />
              Ağdaki Ana Bilgisayarı Tara / Sunucu Değiştir
            </Button>

            {isClientMode() && (
              <Button
                variant="outline"
                onClick={() => {
                  setCustomServerUrl(null);
                  window.location.reload();
                }}
                className="w-full justify-center gap-2 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-800"
              >
                <Laptop size={16} />
                Yerel Bilgisayar Moduna Dön
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setConnectionFailed(false);
                window.location.reload();
              }}
              className="w-full justify-center gap-2 text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800"
            >
              <RefreshCw size={15} />
              Yeniden Bağlanmayı Dene
            </Button>
          </div>
        </div>

        <NetworkSetupModal
          isOpen={isNetworkModalOpen}
          onClose={() => setIsNetworkModalOpen(false)}
          onSuccess={() => {
            setIsNetworkModalOpen(false);
            window.location.reload();
          }}
        />
      </div>
    );
  }

  if (!backendReady) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mb-4" />
        <p className="text-slate-400">Sistem başlatılıyor, lütfen bekleyin...</p>
        <p className="text-xs text-slate-600 mt-2 font-mono">{serverUrl}</p>
      </div>
    );
  }

  return <AuthProvider><SettingsProvider><Suspense fallback={<PageLoader />}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
      <Route index element={<DashboardPage />} />
      <Route path="students" element={<StudentListPage />} />
      <Route path="students/:id" element={<Student360Page />} />
      <Route path="absenteeism" element={<AbsenteeismPage />} />
      <Route path="daily-absenteeism" element={<DailyAbsenteeismPage />} />
      <Route path="warnings" element={<WarningsPage />} />
      <Route path="violations" element={<ViolationsPage />} />
      <Route path="staff" element={<StaffPage />} />
      <Route path="class-teachers" element={<ClassTeachersPage />} />
      <Route path="whatsapp" element={<WhatsAppPage />} />
      <Route path="whatsapp-consent" element={<WhatsAppConsentPage />} />
      <Route path="grade-reports" element={<GradeReportPage />} />
      <Route path="parent-meeting" element={<ParentMeetingPage />} />
      <Route path="parent-notification" element={<ParentNotificationPage />} />
      <Route path="teblig" element={<TebligPage />} />
      <Route path="matbu-evraklar" element={<MatbuEvraklarPage />} />
      <Route path="parent-leave" element={<ParentLeavePage />} />
      <Route path="petitions" element={<PetitionsPage />} />
      <Route path="duty-schedule" element={<DutySchedulePage />} />
      <Route path="timetable" element={<TimetablePage />} />
      <Route path="cover-assignments" element={<CoverAssignmentPage />} />
      <Route path="board-meeting" element={<BoardMeetingPage />} />
      <Route path="commission" element={<CommissionPage />} />
      <Route path="annual-plan" element={<AnnualPlanPage />} />
      <Route path="commemorative-days" element={<CommemorativeDaysPage />} />
      <Route path="social-activity" element={<SocialActivityPage />} />
      <Route path="parent-association" element={<ParentAssociationPage />} />
      <Route path="field-trip" element={<FieldTripPage />} />
      <Route path="extracurricular" element={<ExtracurricularPage />} />
      <Route path="travel-allowance" element={<TravelAllowancePage />} />
      <Route path="staff-transfer" element={<StaffTransferPage />} />
      <Route path="student-club" element={<StudentClubPage />} />
      <Route path="order-letter" element={<OrderLetterPage />} />
      <Route path="holidays" element={<HolidayPage />} />
      <Route path="attendance-sheet" element={<AttendanceSheetPage />} />
      <Route path="supplier" element={<SupplierPage />} />
      <Route path="procurement" element={<ProcurementPage />} />
      <Route path="invoice-tracking" element={<InvoiceTrackingPage />} />
      <Route path="folder-spines" element={<FolderSpinePage />} />
      <Route path="audit-logs" element={<AuditLogPage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes></Suspense></SettingsProvider></AuthProvider>;
}

export default App;
