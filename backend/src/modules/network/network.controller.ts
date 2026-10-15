import { Request, Response } from 'express';
import { networkService } from './network.service';

export async function getNetworkInfo(_req: Request, res: Response): Promise<void> {
  try {
    const info = await networkService.getHostInfo();
    res.json({
      success: true,
      data: info,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Ağ bilgileri alınırken hata oluştu.',
      error: error.message,
    });
  }
}

export async function generatePairingCode(_req: Request, res: Response): Promise<void> {
  try {
    const code = networkService.generatePairingCode();
    res.json({
      success: true,
      code,
      message: 'Yeni okul bağlantı kodu üretildi.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Kod üretilirken hata oluştu.',
      error: error.message,
    });
  }
}

export async function verifyPairingCode(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.body;
    const isValid = networkService.verifyPairingCode(code);
    res.json({
      success: true,
      valid: isValid,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Kod doğrulanırken hata oluştu.',
      error: error.message,
    });
  }
}

export async function scanLan(req: Request, res: Response): Promise<void> {
  try {
    const timeout = Number(req.body?.timeout) || 2500;
    const hosts = await networkService.scanLan(timeout);
    res.json({
      success: true,
      hosts,
      count: hosts.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Yerel ağ taranırken hata oluştu.',
      error: error.message,
    });
  }
}

export async function testConnection(req: Request, res: Response): Promise<void> {
  try {
    const { url } = req.body;
    const result = await networkService.testConnection(url);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Bağlantı testi sırasında hata oluştu.',
    });
  }
}

export async function toggleTunnel(req: Request, res: Response): Promise<void> {
  try {
    const { enable } = req.body;
    let state;
    if (enable) {
      state = await networkService.startTunnel();
    } else {
      state = await networkService.stopTunnel();
    }
    res.json({
      success: true,
      data: state,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Tünel durumu değiştirilirken hata oluştu.',
      error: error.message,
    });
  }
}
