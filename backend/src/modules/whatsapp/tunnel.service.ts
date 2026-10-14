import prisma from '../shared/utils/prisma';
import { spawn, exec, execSync, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import fs from 'node:fs';

interface TunnelState {
  active: boolean;
  url: string | null;
  startedAt: Date | null;
  error: string | null;
}

let tunnelProcess: ChildProcess | null = null;
let tunnelState: TunnelState = {
  active: false,
  url: null,
  startedAt: null,
  error: null,
};

export class TunnelService {
  private async ensureBinary(): Promise<string> {
    const version = process.env.CLOUDFLARED_VERSION || '2026.7.2';
    const binName = process.platform === 'win32' ? `cloudflared.${version}.exe` : `cloudflared.${version}`;
    const binPath = path.join(tmpdir(), 'node-untun', binName);

    if (fs.existsSync(binPath)) {
      return binPath;
    }

    try {
      const untunChunk = await import('untun/dist/_chunks/cloudflared.mjs' as any);
      if (typeof untunChunk.installCloudflared === 'function') {
        console.log(`[Tunnel] cloudflared ikili dosyası indiriliyor: ${binPath}`);
        await untunChunk.installCloudflared(binPath, version);
        if (fs.existsSync(binPath)) {
          return binPath;
        }
      }
    } catch (e) {
      console.warn('[Tunnel] untun installCloudflared çağrılırken hata:', (e as any)?.message);
    }

    return binPath;
  }

  private killChild(child: ChildProcess) {
    if (!child || child.killed) return;
    try {
      if (process.platform === 'win32' && child.pid) {
        exec(`taskkill /F /T /PID ${child.pid}`, () => {});
      } else {
        child.kill('SIGTERM');
      }
    } catch (e) {
      console.warn('[Tunnel] Process sonlandırılırken hata:', (e as any)?.message);
    }
  }

  /**
   * Cloudflare Quick Tunnel başlatır
   */
  async start(): Promise<TunnelState> {
    if (tunnelState.active && tunnelState.url && tunnelProcess) {
      return { ...tunnelState };
    }

    // Önceki süreç varsa temizle
    await this.stop();

    const port = Number(process.env.PORT) || 4000;
    console.log(`[Tunnel] Cloudflare Quick Tunnel başlatılıyor (Port: ${port})...`);

    try {
      const binPath = await this.ensureBinary();

      return await new Promise<TunnelState>((resolve, reject) => {
        let isSettled = false;
        const recentLogs: string[] = [];

        const args = [
          'tunnel',
          '--url', `http://127.0.0.1:${port}`,
          '--no-tls-verify',
          '--no-autoupdate',
        ];

        const child = spawn(binPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });

        tunnelProcess = child;

        const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

        const onData = (data: Buffer) => {
          const text = data.toString();
          for (const line of text.split('\n')) {
            const trimmed = line.trim();
            if (trimmed) {
              recentLogs.push(trimmed);
              if (recentLogs.length > 15) recentLogs.shift();
            }
          }

          const match = text.match(urlRegex);
          if (match && !isSettled) {
            isSettled = true;
            const publicUrl = match[0];
            tunnelState = {
              active: true,
              url: publicUrl,
              startedAt: new Date(),
              error: null,
            };
            console.log(`[Tunnel] ✅ Cloudflare Tüneli URL alındı: ${publicUrl}`);
            resolve({ ...tunnelState });
          }

          if (text.includes('Registered tunnel connection')) {
            console.log(`[Tunnel] ✅ Edge bağlantısı başarıyla kuruldu.`);
            tunnelState.error = null;
          }

          if (text.includes('7844') && (text.includes('wsarecv') || text.includes('Unable to establish connection') || text.includes('blocked') || text.includes('failed to dial to edge with quic'))) {
            const edgeError = "Okul/MEB güvenlik duvarı port 7844'ü engellediği için Cloudflare veri tüneli kurulamıyor (Error 1033). Lütfen mobil internet (hotspot) bağlayınız.";
            console.warn(`[Tunnel] ⚠️ ${edgeError}`);
            tunnelState.error = edgeError;
          }
        };

        child.stdout?.on('data', onData);
        child.stderr?.on('data', onData);

        child.on('error', (err) => {
          console.error('[Tunnel] cloudflared spawn hatası:', err);
          if (!isSettled) {
            isSettled = true;
            tunnelState = {
              active: false,
              url: null,
              startedAt: null,
              error: err.message,
            };
            tunnelProcess = null;
            reject(err);
          }
        });

        child.on('exit', (code, signal) => {
          console.log(`[Tunnel] cloudflared kapandı (kod=${code}, sinyal=${signal})`);
          if (!isSettled) {
            isSettled = true;
            const msg = recentLogs.length > 0
              ? recentLogs.join(' | ')
              : `cloudflared kapandı (kod=${code})`;
            tunnelState = {
              active: false,
              url: null,
              startedAt: null,
              error: msg,
            };
            tunnelProcess = null;
            reject(new Error(msg));
          } else {
            tunnelState = {
              active: false,
              url: null,
              startedAt: null,
              error: null,
            };
            tunnelProcess = null;
          }
        });

        // 35 saniye zaman aşımı
        setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            const err = new Error('Cloudflare tünel adresi 35 saniye içinde alınamadı.');
            this.killChild(child);
            tunnelProcess = null;
            tunnelState = {
              active: false,
              url: null,
              startedAt: null,
              error: err.message,
            };
            reject(err);
          }
        }, 35000);
      });
    } catch (err: any) {
      console.error('[Tunnel] Cloudflare tüneli başlatılamadı:', err);
      tunnelState = {
        active: false,
        url: null,
        startedAt: null,
        error: err?.message || 'Tünel başlatılamadı.',
      };
      tunnelProcess = null;
      return { ...tunnelState };
    }
  }

  /**
   * Tüneli durdurur
   */
  async stop(): Promise<TunnelState> {
    if (tunnelProcess) {
      this.killChild(tunnelProcess);
      tunnelProcess = null;
    }

    tunnelState = {
      active: false,
      url: null,
      startedAt: null,
      error: null,
    };

    // Eğer SchoolSettings'te eski trycloudflare linki kaldıysa temizle
    try {
      const settings = await prisma.schoolSettings.findUnique({
        where: { id: 'singleton' },
        select: { publicBaseUrl: true },
      });
      if (settings?.publicBaseUrl?.includes('trycloudflare.com')) {
        await prisma.schoolSettings.update({
          where: { id: 'singleton' },
          data: { publicBaseUrl: '' },
        });
      }
    } catch (e) {
      console.warn('[Tunnel] publicBaseUrl temizlenirken hata:', (e as any)?.message);
    }

    console.log('[Tunnel] Cloudflare tüneli durduruldu.');
    return { ...tunnelState };
  }

  /**
   * Quick Tunnel'in şu an aktif olup olmadığını döner
   */
  isTunnelActive(): boolean {
    return Boolean(tunnelState.active && tunnelState.url && tunnelProcess && !tunnelProcess.killed);
  }

  /**
   * Dış internet üzerinden erişilebilir bir adres olup olmadığını kontrol eder.
   * Quick tunnel aktifse veya ayarlarda geçerli bir statik domain tanımlıysa true döner.
   */
  async isPublicAccessAvailable(): Promise<boolean> {
    if (this.isTunnelActive()) {
      return true;
    }

    try {
      const settings = await prisma.schoolSettings.findUnique({
        where: { id: 'singleton' },
        select: { publicBaseUrl: true },
      });
      const url = settings?.publicBaseUrl?.trim() || '';
      if (url.includes('trycloudflare.com')) {
        return false;
      }
      if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        return true;
      }
    } catch {}

    return false;
  }

  /**
   * Tünel durumunu ve geçerli genel URL'yi döner
   */
  async getStatus(): Promise<TunnelState & { customUrl: string }> {
    let customUrl = '';
    try {
      const settings = await prisma.schoolSettings.findUnique({
        where: { id: 'singleton' },
        select: { publicBaseUrl: true },
      });
      const storedUrl = settings?.publicBaseUrl?.trim() || '';
      if (storedUrl && !storedUrl.includes('trycloudflare.com')) {
        customUrl = storedUrl;
      }
    } catch {}

    return {
      ...tunnelState,
      customUrl,
    };
  }

  /**
   * Geçerli genel URL'yi belirler:
   * Öncelik 1: Aktif Cloudflare Quick Tunnel URL'si
   * Öncelik 2: Ayarlarda kayıtlı geçerli statik publicBaseUrl (trycloudflare hariç)
   * Öncelik 3: Yerel adres (http://localhost:4000)
   */
  async getEffectiveBaseUrl(): Promise<string> {
    if (tunnelState.active && tunnelState.url) {
      return tunnelState.url.replace(/\/+$/, '');
    }

    try {
      const settings = await prisma.schoolSettings.findUnique({
        where: { id: 'singleton' },
        select: { publicBaseUrl: true },
      });
      const url = settings?.publicBaseUrl?.trim() || '';
      if (url && !url.includes('trycloudflare.com') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        return url.replace(/\/+$/, '');
      }
    } catch {}

    const port = Number(process.env.PORT) || 4000;
    return `http://localhost:${port}`;
  }
}

// Uygulama tamamen sonlandığında arkada asılı process kalmaması için temizle:
process.on('exit', () => {
  if (tunnelProcess?.pid && process.platform === 'win32') {
    try {
      execSync(`taskkill /F /T /PID ${tunnelProcess.pid}`, { stdio: 'ignore' });
    } catch {}
  }
});

export const tunnelService = new TunnelService();
