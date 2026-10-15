import { Router } from 'express';
import {
  getNetworkInfo,
  generatePairingCode,
  verifyPairingCode,
  scanLan,
  testConnection,
  toggleTunnel,
} from './network.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

// İstemci bilgisayarların oturum açmadan önce de ağ taraması ve bağlantı testi yapabilmesi için açık
router.post('/scan', scanLan);
router.post('/test-connection', testConnection);
router.post('/verify-code', verifyPairingCode);

// Oturum gerektiren host ve ağ yönetim endpoint'leri
router.get('/info', authMiddleware, getNetworkInfo);
router.post('/generate-code', authMiddleware, requirePermission('settings'), generatePairingCode);
router.post('/tunnel/toggle', authMiddleware, requirePermission('settings'), toggleTunnel);

export default router;
