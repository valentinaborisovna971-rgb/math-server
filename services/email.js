// ============================================================
//  Отправка писем через Resend (resend.com)
//  Клиент создаётся лениво — только при отправке.
//  Если RESEND_API_KEY не задан, отправка пропускается.
// ============================================================

import { Resend } from 'resend';

let resendClient = null;

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromEmail() {
  return process.env.FROM_EMAIL || 'onboarding@resend.dev';
}

// -------- Отправка ключа активации --------

export async function sendActivationKey({ to, programId, key, expiresAt }) {
  const client = getClient();

  if (!client) {
    console.warn('[email] RESEND_API_KEY не задан — письмо не отправлено');
    console.log('[email] Ключ для ' + to + ': ' + key);
    return { success: false, error: 'no_api_key' };
  }

  const expiresText = new Date(expiresAt).toLocaleDateString('ru-RU');

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #F5F5F7;">
      <div style="background: white; padding: 30px; border-radius: 20px;">
        <h1 style="font-size: 22px; color: #1D1D1F; margin: 0 0 10px;">Спасибо за покупку!</h1>
        <p style="color: #86868B; font-size: 14px; margin: 0 0 25px;">Ваш ключ активации для программы готов.</p>

        <div style="background: #F5F5F7; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <p style="color: #86868B; font-size: 11px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px;">Ключ активации</p>
          <p style="font-family: monospace; font-size: 13px; color: #1D1D1F; word-break: break-all; margin: 0; font-weight: 600;">${key}</p>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #86868B; margin-bottom: 25px;">
          <span>Программа: <b style="color: #1D1D1F;">${programId}</b></span>
          <span>Действует до: <b style="color: #1D1D1F;">${expiresText}</b></span>
        </div>

        <div style="border-top: 1px solid #E5E5EA; padding-top: 20px; font-size: 13px; color: #424245; line-height: 1.6;">
          <p style="margin: 0 0 10px; font-weight: 600;">Как активировать:</p>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Скачайте программу на компьютер</li>
            <li>Запустите её — появится код вашего ПК</li>
            <li>Введите полученный ключ активации</li>
          </ol>
        </div>
      </div>

      <p style="text-align: center; font-size: 11px; color: #86868B; margin-top: 20px;">
        Если возникли вопросы — ответьте на это письмо.
      </p>
    </div>
  `;

  try {
    const result = await client.emails.send({
      from: getFromEmail(),
      to,
      subject: 'Ваш ключ активации',
      html,
    });
    return { success: true, result };
  } catch (e) {
    console.error('Ошибка отправки письма:', e.message);
    return { success: false, error: e.message };
  }
}

// -------- Простое тестовое письмо --------

export async function sendTestEmail(to) {
  const client = getClient();

  if (!client) {
    console.warn('[email] RESEND_API_KEY не задан — тестовое письмо не отправлено');
    return { success: false, error: 'no_api_key' };
  }

  try {
    const result = await client.emails.send({
      from: getFromEmail(),
      to,
      subject: 'Проверка связи',
      html: '<p>Это тестовое письмо с math-server.</p>',
    });
    return { success: true, result };
  } catch (e) {
    console.error('Ошибка отправки письма:', e.message);
    return { success: false, error: e.message };
  }
}