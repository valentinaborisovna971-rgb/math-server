// ============================================================
//  API активации
//
//  POST /api/activate/request-key
//    Тело: { email, programId, hwid, months }
//    Ответ: { success, key, expiresAt } или { success: false, error }
//
//  POST /api/activate/verify
//    Тело: { programId, key, hwid }
//    Ответ: { valid: true/false, reason? }
// ============================================================

import express from 'express';
import crypto from 'crypto';
import {
  generateActivationKey,
  verifyActivationKey,
} from '../services/license.js';
import {
  findUnusedPayment,
  markPaymentUsed,
  addLicense,
} from '../services/storage.js';
import { sendActivationKey } from '../services/email.js';

const router = express.Router();

// -------- Выдача ключа --------

router.post('/request-key', async (req, res) => {
  try {
    const { email, programId, hwid, months } = req.body;

    if (!email || !programId || !hwid || !months) {
      return res.status(400).json({
        success: false,
        error: 'Не все поля заполнены: email, programId, hwid, months',
      });
    }

    const payment = findUnusedPayment(email.toLowerCase().trim(), programId);

    if (!payment) {
      return res.status(402).json({
        success: false,
        error:
          'Оплата не найдена. Проверьте, что вы использовали тот же email, что и при покупке.',
      });
    }

    const { key, expiresAt } = generateActivationKey({
      programId,
      hwid,
      email: email.toLowerCase().trim(),
      months: parseInt(months, 10),
    });

    addLicense({
      id: crypto.randomUUID(),
      key,
      hwid: hwid.trim().toUpperCase(),
      email: email.toLowerCase().trim(),
      programId,
      expiresAt,
    });

    markPaymentUsed(payment.id);

    const mailResult = await sendActivationKey({
      to: email.toLowerCase().trim(),
      programId,
      key,
      expiresAt,
    });

    return res.json({
      success: true,
      key,
      expiresAt,
      emailSent: mailResult.success,
    });
  } catch (e) {
    console.error('[activate/request-key] ошибка:', e.message);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера: ' + e.message,
    });
  }
});

// -------- Проверка ключа (использует MathApp) --------

router.post('/verify', (req, res) => {
  try {
    const { programId, key, hwid } = req.body;

    if (!programId || !key) {
      return res.status(400).json({
        valid: false,
        reason: 'missing_fields',
      });
    }

    const result = verifyActivationKey({ programId, key, hwid });
    return res.json(result);
  } catch (e) {
    console.error('[activate/verify] ошибка:', e.message);
    return res.status(500).json({
      valid: false,
      reason: 'server_error',
      message: e.message,
    });
  }
});

export default router;