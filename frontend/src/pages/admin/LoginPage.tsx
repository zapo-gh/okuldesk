import toast from 'react-hot-toast';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff, Network, AlertCircle, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getEffectiveServerUrl, isClientMode } from '../../services/api';
import { NetworkSetupModal } from '../../components/NetworkSetupModal';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('rememberMe') === '1');
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const serverUrl = getEffectiveServerUrl();
  const isClient = isClientMode();
  const cleanServerHost = serverUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '');
  
  const [loading, setLoading] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Kullanıcı adını hatırla; hatırlanmışsa parola alanına focus yap
  useEffect(() => {
    const saved = localStorage.getItem('savedUsername');
    if (saved) {
      setUsername(saved);
      passwordRef.current?.focus();
    } else {
      usernameRef.current?.focus();
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSlowWarning(false);
    setLoading(true);

    timerRef.current = setTimeout(() => setSlowWarning(true), 3000);

    try {
      await login(username, password, rememberMe);
      if (rememberMe) {
        localStorage.setItem('rememberMe', '1');
        localStorage.setItem('savedUsername', username);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('savedUsername');
      }
      navigate('/admin');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Kullanıcı adı veya şifre hatalı! Lütfen bilgilerinizi kontrol edip tekrar deneyiniz.';
      setErrorMessage(msg);
      toast.error(msg, { duration: 4000 });
      passwordRef.current?.focus();
      passwordRef.current?.select();
    } finally {
      setLoading(false);
      setSlowWarning(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden p-5">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="py-9 px-10 w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative z-10">
        
        <div className="text-center mb-8">
          <div className="w-[56px] h-[56px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-indigo-500/25">
            <GraduationCap className="text-white" size={30} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 m-0 tracking-tight">
            OkulDesk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Yönetim Sistemine Giriş Yapın
          </p>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 mb-4 rounded-xl bg-red-50/95 border border-red-200 text-red-800 text-xs font-medium shadow-sm animate-in fade-in zoom-in-95">
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-red-900 mb-0.5">Giriş Başarısız!</div>
              <div>{errorMessage}</div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-700 p-0.5 transition cursor-pointer"
              title="Kapat"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {slowWarning && (
          <div className="text-xs px-3.5 py-2.5 rounded-lg mb-4 bg-yellow-50 text-yellow-700 border border-yellow-200">
            ⏳ Sunucu hazırlanıyor, lütfen bekleyin...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <User size={17} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Kullanıcı adınızı giriniz"
                required
                ref={usernameRef}
                className={`w-full py-2.5 pr-3.5 pl-10 rounded-xl border text-sm outline-none transition-all placeholder:text-slate-400 ${
                  errorMessage
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Şifre
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={17} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Şifrenizi giriniz"
                required
                ref={passwordRef}
                className={`w-full py-2.5 pr-11 pl-10 rounded-xl border text-sm outline-none transition-all placeholder:text-slate-400 ${
                  errorMessage
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded cursor-pointer"
                title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 pb-2">
            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-indigo-600 rounded"
              />
              <label className="text-sm text-slate-700 cursor-pointer select-none font-medium" htmlFor="rememberMe">
                Beni hatırla
              </label>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Güvenli Oturum</span>
            </div>
          </div>

          <Button
            className="w-full py-3 px-4 text-sm rounded-xl flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold transition-all hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 shadow-md shadow-indigo-600/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            type="submit"
            disabled={loading}
          >
            <span>
              {loading
                ? slowWarning
                  ? 'Sunucu uyandırılıyor...'
                  : 'Giriş yapılıyor...'
                : 'Giriş Yap'}
            </span>
            {!loading && <ArrowRight size={17} />}
          </Button>
        </form>

        {/* Ağ & Sunucu Bağlantı Durumu */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 truncate max-w-[210px]" title={serverUrl}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isClient ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="truncate font-medium text-slate-600">
              {isClient ? `İstemci: ${cleanServerHost}` : 'Ana Bilgisayar (Yerel)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsNetworkModalOpen(true)}
            className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors flex items-center gap-1 cursor-pointer hover:underline shrink-0"
          >
            <Network size={13} />
            {isClient ? 'Sunucuyu Değiştir' : 'Ana PC\'ye Bağlan'}
          </button>
        </div>

        {/* Ağ Kurulum Modalı */}
        <NetworkSetupModal
          isOpen={isNetworkModalOpen}
          onClose={() => setIsNetworkModalOpen(false)}
        />
      </div>
    </div>
  );
}
