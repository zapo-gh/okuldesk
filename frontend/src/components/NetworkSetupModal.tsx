import React, { useState, useEffect } from 'react';
import { ActionModal } from './ui/ActionModal';
import { Button } from './ui/Button';
import { networkService, DiscoveredHost } from '../services/network.service';
import { getEffectiveServerUrl, setCustomServerUrl, isClientMode } from '../services/api';
import { Wifi, Search, Laptop, Globe, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface NetworkSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NetworkSetupModal({ isOpen, onClose, onSuccess }: NetworkSetupModalProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [hosts, setHosts] = useState<DiscoveredHost[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  // Manuel bağlantı
  const [targetAddress, setTargetAddress] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    hostname?: string;
    schoolName?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
      // Açıldığında otomatik tarama başlat
      startScan();
    }
  }, [isOpen]);

  const startScan = async () => {
    setIsScanning(true);
    setHasScanned(false);
    try {
      const results = await networkService.scanLan(3000);
      setHosts(results);
      setHasScanned(true);
    } catch (err: any) {
      toast.error('Ağ taraması sırasında hata oluştu.');
      setHasScanned(true);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectToHost = (hostUrl: string) => {
    setCustomServerUrl(hostUrl);
    toast.success('Ana Bilgisayara bağlanıldı. Uygulama yenileniyor...', { duration: 3000 });
    setTimeout(() => {
      if (onSuccess) onSuccess();
      window.location.reload();
    }, 1000);
  };

  const handleTestManual = async () => {
    if (!targetAddress.trim()) {
      toast.error('Lütfen bir IP adresi veya sunucu bağlantı linki girin.');
      return;
    }

    let url = targetAddress.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await networkService.testConnection(url);
      setTestResult({
        tested: true,
        success: res.success,
        latencyMs: res.latencyMs,
        hostname: res.hostname,
        schoolName: res.schoolName,
        error: res.error,
      });
      if (res.success) {
        toast.success(`Bağlantı başarılı! (${res.hostname || 'OkulDesk'} - ${res.latencyMs}ms)`);
      } else {
        toast.error(res.error || 'Sunucuya ulaşılamadı.');
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        error: err.message || 'Bağlantı hatası',
      });
      toast.error('Sunucuya bağlanılamadı.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveManual = () => {
    if (!targetAddress.trim()) return;
    let url = targetAddress.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    setCustomServerUrl(url);
    toast.success('Sunucu kaydedildi. Yeniden bağlanılıyor...');
    setTimeout(() => {
      if (onSuccess) onSuccess();
      window.location.reload();
    }, 1000);
  };

  const handleRevertToLocal = () => {
    setCustomServerUrl(null);
    toast.success('Yerel ana bilgisayar moduna dönüldü.');
    setTimeout(() => {
      if (onSuccess) onSuccess();
      window.location.reload();
    }, 1000);
  };

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Ağ ve Çoklu Bilgisayar Bağlantı Sihirbazı"
      width="lg"
      hideFooter
    >
      <div className="space-y-5">
        {/* KVKK / Güvenlik Bilgilendirme Notu */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
          <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
          <div className="text-xs text-emerald-900 leading-relaxed">
            <span className="font-semibold">Sıfır Bulut Veritabanı & KVKK Güvencesi:</span> Öğrenci ve veli bilgileri asla üçüncü parti harici bulut sunucularda depolanmaz. Veritabanı fiziksel olarak okulunuzdaki Ana Bilgisayar'da kalır, diğer bilgisayarlar güvenli yerel ağ üzerinden doğrudan bu veritabanına bağlanır.
          </div>
        </div>

        {/* Tab Seçimi */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'scan'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wifi size={17} />
            Otomatik Ağ Taraması
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Globe size={17} />
            Manuel IP veya Tünel Linki
          </button>
        </div>

        {/* Tab 1: Otomatik Ağ Taraması */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-800">Ağdaki OkulDesk Sunucuları</h4>
                <p className="text-xs text-gray-500">
                  Yerel okul ağındaki (Wi-Fi veya kablo) ana bilgisayarlar taranıyor.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={startScan}
                disabled={isScanning}
                className="gap-1.5 text-xs font-semibold"
              >
                <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                {isScanning ? 'Taranıyor...' : 'Yeniden Tara'}
              </Button>
            </div>

            {isScanning && (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">Okul ağı taranıyor...</p>
                <p className="text-xs text-gray-500 mt-1">Ana bilgisayar aranıyor, lütfen birkaç saniye bekleyin.</p>
              </div>
            )}

            {!isScanning && hasScanned && hosts.length === 0 && (
              <div className="p-6 text-center bg-amber-50/70 border border-amber-200 rounded-xl">
                <AlertCircle className="mx-auto text-amber-600 mb-2" size={28} />
                <h5 className="text-sm font-bold text-amber-900">Yerel Ağda Ana Bilgisayar Bulunamadı</h5>
                <p className="text-xs text-amber-800 mt-1 max-w-md mx-auto">
                  Lütfen ana bilgisayarın açık olduğundan, OkulDesk'in çalıştığından ve aynı Wi-Fi/kablo ağına bağlı olduğunuzdan emin olun. Dilerseniz IP adresini manuel de girebilirsiniz.
                </p>
              </div>
            )}

            {!isScanning && hosts.length > 0 && (
              <div className="space-y-2.5">
                {hosts.map((h) => (
                  <div
                    key={h.ip}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Laptop size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{h.hostname}</span>
                          {h.isSelf && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded font-medium">
                              Bu Bilgisayar
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-semibold">
                            {h.latencyMs} ms
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {h.schoolName} • <span className="font-mono text-gray-600">{h.ip}:{h.port}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConnectToHost(h.url)}
                      className="gap-1.5 text-xs"
                    >
                      Bağlan
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Manuel IP / Link */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ana Bilgisayar Yerel IP Adresi veya Dış Ağ Linki
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  placeholder="Örn: 192.168.1.45:4000 veya https://xxxx.trycloudflare.com"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <Button
                  variant="outline"
                  onClick={handleTestManual}
                  disabled={isTesting || !targetAddress.trim()}
                  className="shrink-0 text-xs font-semibold"
                >
                  {isTesting ? 'Test Ediliyor...' : 'Test Et'}
                </Button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Ana bilgisayarın OkulDesk ayarlar sayfasında gösterilen yerel IP'sini veya tünel linkini giriniz.
              </p>
            </div>

            {testResult && testResult.tested && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  {testResult.success ? (
                    <div>
                      <p className="font-bold text-emerald-800">Bağlantı Başarılı!</p>
                      <p className="mt-0.5 text-emerald-700">
                        {testResult.schoolName} ({testResult.hostname}) — Gecikme: {testResult.latencyMs} ms
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-red-800">Bağlantı Başarısız</p>
                      <p className="mt-0.5 text-red-700">{testResult.error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleSaveManual}
                disabled={!targetAddress.trim()}
                className="gap-2 text-xs"
              >
                Bu Sunucuya Bağlan
              </Button>
            </div>
          </div>
        )}

        {/* Yerel moda geri dönme seçeneği */}
        {isClientMode() && (
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Şu an harici bir bilgisayara bağlısınız.</span>
            <button
              onClick={handleRevertToLocal}
              className="text-amber-700 hover:text-amber-800 font-semibold hover:underline"
            >
              Yerel Bilgisayar Veritabanına Geri Dön
            </button>
          </div>
        )}
      </div>
    </ActionModal>
  );
}
