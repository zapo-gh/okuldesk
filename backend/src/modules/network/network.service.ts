import os from 'os';
import dgram from 'dgram';
import crypto from 'crypto';
import http from 'http';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { tunnelService, TunnelState } from '../whatsapp/tunnel.service';

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

class NetworkService {
  private udpServer: dgram.Socket | null = null;
  private beaconInterval: NodeJS.Timeout | null = null;
  private currentPairingCode: string = '';

  constructor() {
    this.generatePairingCode();
  }

  /**
   * Bilgisayarın fiziksel / yerel IPv4 adreslerini tespit eder
   */
  getLocalAddresses(): LocalAddressInfo[] {
    const interfaces = os.networkInterfaces();
    const result: LocalAddressInfo[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        const isIpv4 = addr.family === 'IPv4' || (addr.family as unknown) === 4;
        if (isIpv4 && !addr.internal) {
          result.push({
            address: addr.address,
            family: 'IPv4',
            netmask: addr.netmask,
            mac: addr.mac,
            interfaceName: name,
          });
        }
      }
    }

    return result;
  }

  /**
   * En olası birincil yerel IP adresini belirler (192.168.x.x veya 10.x.x.x)
   */
  getPrimaryIp(): string | null {
    const list = this.getLocalAddresses();
    if (list.length === 0) return null;

    const preferred = list.find(
      i =>
        i.address.startsWith('192.168.') ||
        i.address.startsWith('10.') ||
        i.address.startsWith('172.')
    );

    return preferred ? preferred.address : list[0].address;
  }

  /**
   * Güvenli Okul Eşleşme Kodu üretir (Örn: OKUL-7489)
   */
  generatePairingCode(): string {
    const rand = crypto.randomInt(1000, 9999);
    this.currentPairingCode = `OKUL-${rand}`;
    return this.currentPairingCode;
  }

  getPairingCode(): string {
    if (!this.currentPairingCode) {
      return this.generatePairingCode();
    }
    return this.currentPairingCode;
  }

  verifyPairingCode(code: string): boolean {
    if (!code) return false;
    const clean = code.trim().toUpperCase();
    return clean === this.currentPairingCode.toUpperCase();
  }

  /**
   * Ana sunucu ağ durumunu ve bağlantı bilgilerini döner
   */
  async getHostInfo(): Promise<NetworkHostInfo> {
    const addresses = this.getLocalAddresses();
    const primaryIp = this.getPrimaryIp();
    const tunnelState = await tunnelService.getStatus();

    let schoolName = 'OkulDesk';
    try {
      const settings = await prisma.schoolSettings.findUnique({
        where: { id: 'singleton' },
        select: { schoolName: true },
      });
      if (settings?.schoolName) schoolName = settings.schoolName;
    } catch {}

    return {
      hostname: os.hostname(),
      port: config.port,
      ipAddresses: addresses,
      primaryIp,
      schoolName,
      tunnelUrl: tunnelState.url,
      tunnelActive: tunnelState.active,
      pairingCode: this.getPairingCode(),
      isHost: true,
    };
  }

  /**
   * Yerel ağda otomatik keşif için UDP Beacon (sinyal) başlatır.
   * Ana bilgisayar her 4 saniyede bir yerel ağa "Ben OkulDesk Ana Bilgisayarıyım" sinyali atar.
   */
  startLanBeacon(): void {
    if (this.udpServer) return;

    try {
      this.udpServer = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.udpServer.bind(0, () => {
        try {
          this.udpServer?.setBroadcast(true);
        } catch (e) {
          console.warn('[NetworkService] UDP broadcast yetkisi alınamadı:', e);
        }
      });

      this.beaconInterval = setInterval(async () => {
        try {
          if (!this.udpServer) return;
          const primaryIp = this.getPrimaryIp();
          if (!primaryIp) return;

          let schoolName = 'OkulDesk';
          try {
            const settings = await prisma.schoolSettings.findUnique({
              where: { id: 'singleton' },
              select: { schoolName: true },
            });
            if (settings?.schoolName) schoolName = settings.schoolName;
          } catch {}

          const packet = JSON.stringify({
            service: 'okuldesk_server',
            hostname: os.hostname(),
            schoolName,
            ip: primaryIp,
            port: config.port,
            timestamp: Date.now(),
          });

          const msg = Buffer.from(packet);
          // 4002 portuna broadcast gönder
          this.udpServer.send(msg, 0, msg.length, 4002, '255.255.255.255', () => {});
        } catch {}
      }, 4000);

      console.log('📡 Yerel ağ cihaz keşif sinyali (LAN Beacon) aktif edildi.');
    } catch (err) {
      console.warn('[NetworkService] UDP Beacon başlatılamadı:', err);
    }
  }

  stopLanBeacon(): void {
    if (this.beaconInterval) {
      clearInterval(this.beaconInterval);
      this.beaconInterval = null;
    }
    if (this.udpServer) {
      try {
        this.udpServer.close();
      } catch {}
      this.udpServer = null;
    }
  }

  /**
   * Yerel ağda aktif OkulDesk sunucularını tarar.
   * Hem UDP yayınlarını dinler hem de yerel alt ağdaki (subnet /24) IP'leri hızlıca tarar.
   */
  async scanLan(timeoutMs: number = 2500): Promise<DiscoveredHost[]> {
    const discovered = new Map<string, DiscoveredHost>();
    const myIps = new Set(this.getLocalAddresses().map(a => a.address));
    myIps.add('127.0.0.1');

    // 1. UDP Beacon Dinleyici
    let listenerSocket: dgram.Socket | null = null;
    try {
      listenerSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      listenerSocket.on('message', (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data && data.service === 'okuldesk_server' && data.ip) {
            const isSelf = myIps.has(data.ip);
            discovered.set(data.ip, {
              ip: data.ip,
              port: data.port || config.port,
              url: `http://${data.ip}:${data.port || config.port}`,
              hostname: data.hostname || 'OkulDesk Sunucu',
              schoolName: data.schoolName || 'OkulDesk',
              latencyMs: 1,
              isSelf,
            });
          }
        } catch {}
      });

      listenerSocket.bind(4002, () => {});
    } catch {}

    // 2. Aktif Alt Ağ (Subnet) Taraması
    // Kullanıcının bağlı olduğu ağın ilk 254 IP'sini /api/health ile yoklar
    const primaryIp = this.getPrimaryIp();
    if (primaryIp) {
      const parts = primaryIp.split('.');
      if (parts.length === 4) {
        const subnetBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
        const checkHost = (ip: string): Promise<void> => {
          return new Promise<void>((resolve) => {
            const start = Date.now();
            const req = http.get(
              `http://${ip}:${config.port}/api/health`,
              { timeout: 700 },
              (res) => {
                if (res.statusCode === 200) {
                  let body = '';
                  res.on('data', chunk => { body += chunk; });
                  res.on('end', () => {
                    try {
                      const json = JSON.parse(body);
                      if (json && (json.status === 'ok' || json.app === 'okuldesk')) {
                        const isSelf = myIps.has(ip);
                        discovered.set(ip, {
                          ip,
                          port: config.port,
                          url: `http://${ip}:${config.port}`,
                          hostname: json.hostname || 'OkulDesk Sunucu',
                          schoolName: json.schoolName || 'OkulDesk',
                          latencyMs: Date.now() - start,
                          isSelf,
                        });
                      }
                    } catch {}
                    resolve();
                  });
                } else {
                  resolve();
                }
              }
            );

            req.on('error', () => resolve());
            req.on('timeout', () => {
              req.destroy();
              resolve();
            });
          });
        };

        // 40'ar elemanlık gruplar halinde paralel tara
        const allIps: string[] = [];
        for (let i = 1; i <= 254; i++) {
          allIps.push(`${subnetBase}.${i}`);
        }

        const chunkSize = 40;
        for (let i = 0; i < allIps.length; i += chunkSize) {
          const chunk = allIps.slice(i, i + chunkSize);
          await Promise.all(chunk.map(ip => checkHost(ip)));
          if (Date.now() % 10 === 0 && discovered.size > 0) {
            // Bir sunucu bulunduysa taramaya devam et ama aşırı geciktirme
          }
        }
      }
    }

    // Bekleme süresi bitene kadar UDP mesajlarını da topla
    await new Promise(r => setTimeout(r, Math.min(timeoutMs, 1000)));

    if (listenerSocket) {
      try {
        listenerSocket.close();
      } catch {}
    }

    return Array.from(discovered.values());
  }

  /**
   * Belirtilen bir sunucu adresine bağlantıyı ve gecikmeyi test eder
   */
  async testConnection(targetUrl: string): Promise<{
    success: boolean;
    latencyMs?: number;
    hostname?: string;
    schoolName?: string;
    error?: string;
  }> {
    if (!targetUrl) {
      return { success: false, error: 'Sunucu adresi boş olamaz.' };
    }

    const cleanBase = targetUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
    const healthUrl = `${cleanBase}/api/health`;

    const start = Date.now();
    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Sunucu yanıt verdi ancak durum kodu hatalı: ${response.status}`,
        };
      }

      const json = (await response.json()) as any;
      const latencyMs = Date.now() - start;

      return {
        success: true,
        latencyMs,
        hostname: json.hostname,
        schoolName: json.schoolName,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.name === 'TimeoutError'
          ? 'Bağlantı zaman aşımına uğradı (Sunucuya ulaşılamadı).'
          : `Bağlantı hatası: ${err.message || 'Bilinmeyen hata'}`,
      };
    }
  }

  /**
   * Dış ağlar için güvenli Quick Tunnel başlatır
   */
  async startTunnel(): Promise<TunnelState> {
    return await tunnelService.start();
  }

  async stopTunnel(): Promise<TunnelState> {
    return await tunnelService.stop();
  }
}

export const networkService = new NetworkService();
