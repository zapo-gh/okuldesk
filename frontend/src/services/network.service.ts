import api, { getEffectiveServerUrl, setCustomServerUrl, isClientMode } from './api';

export interface LocalAddressInfo {
  address: string;
  family: string;
  netmask: string;
  mac: string;
  interfaceName: string;
}

export interface DiscoveredHost {
  ip: string;
  port: number;
  url: string;
  hostname: string;
  schoolName: string;
  latencyMs: number;
  isSelf: boolean;
}

export interface NetworkHostInfo {
  hostname: string;
  port: number;
  ipAddresses: LocalAddressInfo[];
  primaryIp: string | null;
  schoolName: string;
  tunnelUrl: string | null;
  tunnelActive: boolean;
  pairingCode: string;
  isHost: boolean;
}

export const networkService = {
  getEffectiveServerUrl,
  setCustomServerUrl,
  isClientMode,

  /**
   * Sunucu ağ ve eşleşme bilgilerini çeker
   */
  async getInfo(): Promise<NetworkHostInfo> {
    const res = await api.get('/network/info');
    return res.data.data;
  },

  /**
   * Yeni eşleşme kodu üretir
   */
  async generateCode(): Promise<string> {
    const res = await api.post('/network/generate-code');
    return res.data.code;
  },

  /**
   * Yerel ağı tarayarak aktif OkulDesk sunucularını bulur
   */
  async scanLan(timeout = 2500): Promise<DiscoveredHost[]> {
    // İstemci tarafında yerel backend'e tarama isteği gönder
    const res = await api.post('/network/scan', { timeout });
    return res.data.hosts || [];
  },

  /**
   * Belirli bir sunucu adresine bağlanabilirliği ve gecikmeyi test eder
   */
  async testConnection(url: string): Promise<{
    success: boolean;
    latencyMs?: number;
    hostname?: string;
    schoolName?: string;
    error?: string;
  }> {
    const res = await api.post('/network/test-connection', { url });
    return res.data;
  },

  /**
   * Dış ağlar için Cloudflare Quick Tüneli açar/kapatır
   */
  async toggleTunnel(enable: boolean): Promise<any> {
    const res = await api.post('/network/tunnel/toggle', { enable });
    return res.data.data;
  },
};
