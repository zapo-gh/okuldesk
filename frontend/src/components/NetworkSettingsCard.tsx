import React, { useState, useEffect } from 'react';
import { networkService, NetworkHostInfo } from '../services/network.service';
import { getEffectiveServerUrl, setCustomServerUrl, isClientMode } from '../services/api';
import { NetworkSetupModal } from './NetworkSetupModal';
import { Button } from './ui/Button';
import {
  Network,
  Server,
  Laptop,
  Wifi,
  Copy,
  Check,
  RefreshCw,
  Globe,
  Radio,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function NetworkSettingsCard() {
  const [isClient, setIsClient] = useState(isClientMode());
  const [hostInfo, setHostInfo] = useState<NetworkHostInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tünel durumu
  const [tunnelToggling, setTunnelToggling] = useState(false);

  // İstemci modu ping durumu
  const [clientPing, setClientPing] = useState<number | null>(null);
  const [clientChecking, setClientChecking] = useState(false);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    setLoading(true);
    try {
      if (!isClientMode()) {
        const info = await networkService.getInfo();
        setHostInfo(info);
      } else {
        // İstemci modundaysa mevcut sunucuya ping at
        checkClientConnection();
      }
    } catch (e) {
      // Hata durumunda sessizce geç
    } finally {
      setLoading(false);
    }
  };

  const checkClientConnection = async () => {
    setClientChecking(true);
    try {
      const url = getEffectiveServerUrl();
      const res = await networkService.testConnection(url);
      if (res.success && typeof res.latencyMs === 'number') {
        setClientPing(res.latencyMs);
      } else {
        setClientPing(null);
      }
    } catch {
      setClientPing(null);
    } finally {
      setClientChecking(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Panoya kopyalandı.');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateNewCode = async () => {
    try {
      const newCode = await networkService.generateCode();
      if (hostInfo) {
        setHostInfo({ ...hostInfo, pairingCode: newCode });
      }
      toast.success('Yeni eşleşme kodu oluşturuldu: ' + newCode);
    } catch {
      toast.error('Yeni kod oluşturulamadı.');
    }
  };

  const handleToggleTunnel = async () => {
    if (!hostInfo) return;
    const targetState = !hostInfo.tunnelActive;
    setTunnelToggling(true);
    const toastId = toast.loading(targetState ? 'Dış ağ tüneli başlatılıyor...' : 'Tünel durduruluyor...');

    try {
      const updated = await networkService.toggleTunnel(targetState);
      setHostInfo({
        ...hostInfo,
        tunnelActive: updated.active,
        tunnelUrl: updated.url,
      });
      if (updated.active) {
        toast.success('Dış ağ tüneli aktif! İnternet üzerinden bağlanılabilir.', { id: toastId });
      } else {
        toast.success('Dış ağ tüneli kapatıldı.', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Tünel işlemi başarısız: ' + (err.message || ''), { id: toastId });
    } finally {
      setTunnelToggling(false);
    }
  };

  const handleRevertToHost = () => {
    setCustomServerUrl(null);
    setIsClient(false);
    toast.success('Ana Bilgisayar moduna geçildi. Uygulama yenileniyor...');
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden col-span-1 lg:col-span-2">
        {/* Başlık Alanı */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Network size={20} />
            </div>
            Ağ ve Çoklu Bilgisayar (Ortak Veritabanı)
          </h2>

          <div className="flex items-center gap-2">
            {isClient ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                <Laptop size={14} />
                İstemci Bilgisayar (Client)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Server size={14} />
                Ana Sunucu (Host Bilgisayar)
              </span>
            )}
          </div>
        </div>

        {/* İçerik */}
        <div className="p-6 space-y-6">
          {/* KVKK Bilgi Rozeti */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="text-indigo-600 shrink-0 mt-0.5" size={20} />
            <div className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900">Yerel ve Güvenli Veri Paylaşımı:</span> OkulDesk, hassas öğrenci ve veli bilgilerini harici hiçbir üçüncü parti bulut veritabanında saklamaz. Tüm veriler okulunuzdaki Ana Bilgisayar'da tutulur; diğer bilgisayarlar güvenli yerel ağ veya şifreli bağlantı ile doğrudan bu veritabanına bağlanır.
            </div>
          </div>

          {/* İstemci Modu Durumu */}
          {isClient ? (
            <div className="p-5 rounded-xl border border-sky-200 bg-sky-50/50 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                    <Laptop size={18} className="text-sky-600" />
                    Bu Bilgisayar İstemci Olarak Çalışıyor
                  </h4>
                  <p className="text-xs text-sky-800 mt-1">
                    Yapılan tüm devamsızlık girişleri ve güncellemeler doğrudan okulun Ana Bilgisayar'ındaki veritabanına anında yansır.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkClientConnection}
                  disabled={clientChecking}
                  className="gap-1.5 text-xs bg-white"
                >
                  <RefreshCw size={13} className={clientChecking ? 'animate-spin' : ''} />
                  Bağlantıyı Test Et
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="bg-white p-3.5 rounded-lg border border-sky-100">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Bağlı Olunan Ana Sunucu
                  </span>
                  <div className="font-mono text-sm font-bold text-slate-800 break-all">
                    {getEffectiveServerUrl()}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-sky-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Bağlantı Gecikmesi (Ping)
                    </span>
                    <div className="flex items-center gap-2">
                      {clientPing !== null ? (
                        <>
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-bold text-emerald-700 text-sm">{clientPing} ms</span>
                          <span className="text-xs text-slate-500">(Canlı ve Hızlı)</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Ölçülmedi veya sunucu kapalı</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-sky-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs bg-white"
                >
                  Farklı Bir Sunucuya Bağlan / Ağı Tara
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevertToHost}
                  className="text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300"
                >
                  Bu Bilgisayarın Kendi Veritabanını Kullan (Ana Bilgisayar Moduna Dön)
                </Button>
              </div>
            </div>
          ) : (
            /* Ana Sunucu (Host) Durumu */
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Yerel Ağ Adresi */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Wifi size={14} className="text-indigo-600" />
                      Yerel Ağ (Okul İçi) IP
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(`http://${hostInfo?.primaryIp || 'localhost'}:${hostInfo?.port || 4000}`, 'ip')
                      }
                      className="text-xs text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded"
                      title="Kopyala"
                    >
                      {copiedKey === 'ip' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="font-mono font-bold text-base text-slate-900">
                    {hostInfo?.primaryIp ? `${hostInfo.primaryIp}:${hostInfo.port}` : 'Belirleniyor...'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Okul ağındaki diğer bilgisayarlar bu adrese bağlanır.
                  </p>
                </div>

                {/* 2. Ağ İçi Otomatik Keşif (Beacon) */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Radio size={14} className="text-emerald-600" />
                      Otomatik Cihaz Keşfi
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  </div>
                  <div className="font-bold text-sm text-emerald-800 flex items-center gap-1.5 mt-1">
                    🟢 LAN Beacon Aktif
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    İstemciler tek tıkla bu bilgisayarı otomatik bulabilir.
                  </p>
                </div>

                {/* 3. Okul Eşleşme Kodu */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-600" />
                      Okul Eşleşme Kodu
                    </span>
                    <button
                      onClick={handleGenerateNewCode}
                      className="text-xs text-slate-500 hover:text-indigo-600 p-1 hover:bg-slate-100 rounded"
                      title="Yeni Kod Üret"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-lg text-indigo-700 tracking-wider">
                      {hostInfo?.pairingCode || 'OKUL-XXXX'}
                    </span>
                    <button
                      onClick={() => handleCopy(hostInfo?.pairingCode || '', 'code')}
                      className="text-xs text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded"
                      title="Kodu Kopyala"
                    >
                      {copiedKey === 'code' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    İstemci ilk kurulumunda bu kodu girerek bağlanabilir.
                  </p>
                </div>
              </div>

              {/* Dış Ağ / Evden Bağlantı (Cloudflare Quick Tunnel) Bölümü */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                      <Globe size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Dış Ağ / Evden Erişim (Şifreli Tünel)
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Okul dışındayken veya evden çalışırken güvenli bağlantı sağlar.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant={hostInfo?.tunnelActive ? 'outline' : 'primary'}
                    size="sm"
                    onClick={handleToggleTunnel}
                    disabled={tunnelToggling}
                    className="gap-2 text-xs"
                  >
                    {tunnelToggling ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : hostInfo?.tunnelActive ? (
                      'Tüneli Kapat'
                    ) : (
                      'Dış Ağ Tünelini Başlat'
                    )}
                  </Button>
                </div>

                {hostInfo?.tunnelActive && hostInfo.tunnelUrl && (
                  <div className="p-3 bg-white rounded-lg border border-indigo-200 flex flex-wrap items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs font-semibold text-gray-700">Genel Erişim URL'si:</span>
                      <a
                        href={hostInfo.tunnelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                      >
                        {hostInfo.tunnelUrl}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(hostInfo.tunnelUrl!, 'tunnel')}
                      className="text-xs gap-1 py-1 h-7"
                    >
                      {copiedKey === 'tunnel' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      URL'yi Kopyala
                    </Button>
                  </div>
                )}
              </div>

              {/* Alt Butonlar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500">
                  Bu bilgisayar tüm okulun veritabanını barındırmaktadır. Düzenli yedekler otomatik alınır.
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  <Laptop size={14} />
                  Bu Bilgisayarı Başka Bir Ana Bilgisayara Bağla
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <NetworkSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          setIsClient(isClientMode());
          loadInfo();
        }}
      />
    </>
  );
}
