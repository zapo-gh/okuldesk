import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

dotenv.config();

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Tauri production ortamında appData kullanımı (Örn: C:\Users\Username\AppData\Roaming\OkulDesk)
const appDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.local/share");
const okuldeskDir = path.join(appDataPath, 'OkulDesk');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.join(okuldeskDir, 'database.db')}`;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'production',
  port: parsePositiveInt(process.env.PORT, 4000),

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: (() => {
      const s = process.env.JWT_SECRET;
      if (!s || s.length < 32) {
        // Tauri desktop production ortamında fallback secret
        return 'okuldesk-desktop-default-jwt-secret-key-at-least-32-chars';
      }
      return s;
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || path.join(okuldeskDir, 'uploads'),
    maxSize: parsePositiveInt(process.env.UPLOAD_MAX_SIZE, 10 * 1024 * 1024),
  },

  backup: {
    dir: process.env.BACKUP_DIR || path.join(okuldeskDir, 'backups'),
    retentionDays: parsePositiveInt(process.env.BACKUP_RETENTION_DAYS, 30),
  },

  log: {
    dir: process.env.LOG_DIR || path.join(okuldeskDir, 'logs'),
  },

  frontendDomain: process.env.FRONTEND_DOMAIN || 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
