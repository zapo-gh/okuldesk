import fs from 'fs';
import path from 'path';

const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const errorLogStream = fs.createWriteStream(path.join(logDir, 'error.log'), { flags: 'a' });
const combinedLogStream = fs.createWriteStream(path.join(logDir, 'combined.log'), { flags: 'a' });

function formatMessage(level: string, message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  let metaStr = '';
  if (meta) {
    metaStr = typeof meta === 'object' ? JSON.stringify(meta) : String(meta);
  }
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}\n`;
}

export const logger = {
  info: (message: string, meta?: any) => {
    const formatted = formatMessage('info', message, meta);
    console.log(formatted.trim());
    combinedLogStream.write(formatted);
  },
  warn: (message: string, meta?: any) => {
    const formatted = formatMessage('warn', message, meta);
    console.warn(formatted.trim());
    combinedLogStream.write(formatted);
  },
  error: (message: string, meta?: any) => {
    const formatted = formatMessage('error', message, meta);
    console.error(formatted.trim());
    errorLogStream.write(formatted);
    combinedLogStream.write(formatted);
  }
};
