// ============================================================
//  Вебхук от Lemon Squeezy
//  После успешной оплаты Lemon Squeezy присылает сюда POST-запрос.
//  Мы сохраняем оплату в базе. Клиент потом сможет получить ключ,
//  введя HWID и тот же email.
//
//  Настройка: в Lemon Squeezy → Settings → Webhooks
//    URL: https://ваш-сервер/api/webhook/lemonsqueezy
//    Событие: order_created
//    Подпись: скопировать секрет в .env (LEMONSQUEEZY_WEBHOOK_SECRET)
// ============================================================

import express from 'express';
import crypto from 'crypto';
import { addPayment } from '../services/storage.js';

const router = express.Router();

// -------- Проверка подписи --------

function verifySignature(rawBody, signatureHeader) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[webhook] LEMONSQUEEZY_WEBHOOK_SECRET не задан — подпись не проверяется');
    return true;
  }
  if (!signatureHeader) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
  const signature = Buffer.from(signatureHeader, 'utf8');

  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}

// -------- Обработчик вебхука --------

router.post('/lemonsqueezy', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-signature'];

  if (!verifySignature(req.body, signature)) {
    console.warn('[webhook] неверная подпись');
    return res.status(401).send('Invalid signature');
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch (e) {
    console.error('[webhook] не удалось распарсить JSON');
    return res.status(400).send('Bad JSON');
  }

  const eventName = payload.meta?.event_name;
  console.log('[webhook] получено событие:', eventName);

  if (eventName !== 'order_created') {
    return res.status(200).send('Ignored');
  }

  try {
    const attributes = payload.data.attributes;
    const custom = payload.meta?.custom_data || {};

    const payment = {
      id: payload.data.id,
      email: (attributes.user_email || '').toLowerCase().trim(),
      programId: custom.program_id || 'mathapp-1',
      months: parseInt(custom.months || '1', 10),
      amount: attributes.total,
    };

    if (!payment.email) {
      console.warn('[webhook] нет email в оплате');
      return res.status(200).send('No email');
    }

    addPayment(payment);
    console.log('[webhook] оплата сохранена:', payment.email, payment.programId, payment.months);

    return res.status(200).send('OK');
  } catch (e) {
    console.error('[webhook] ошибка обработки:', e.message);
    return res.status(500).send('Error');
  }
});

export default router;