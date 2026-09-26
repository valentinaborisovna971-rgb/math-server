// ============================================================
//  Модуль лицензий
//  - Генерирует ключ активации, подписанный закрытым ключом программы
//  - Проверяет ключ открытым ключом
// ============================================================

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keysRoot = path.resolve(__dirname, '..', 'keys');

// -------- Пути к ключам программы --------

function getPrivateKeyPath(programId) {
  return path.join(keysRoot, programId, 'закрытый.pem');
}

function getPublicKeyPath(programId) {
  return path.join(keysRoot, programId, 'открытый.pem');
}

// -------- Чтение ключей --------

function readPrivateKey(programId) {
  const p = getPrivateKeyPath(programId);
  if (!fs.existsSync(p)) {
    throw new Error('Закрытый ключ программы "' + programId + '" не найден: ' + p);
  }
  return fs.readFileSync(p, 'utf8');
}

export function readPublicKey(programId) {
  const p = getPublicKeyPath(programId);
  if (!fs.existsSync(p)) {
    throw new Error('Открытый ключ программы "' + programId + '" не найден: ' + p);
  }
  return fs.readFileSync(p, 'utf8');
}

// -------- Кодирование / декодирование base64url --------

function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64');
}

// -------- Генерация ключа активации --------

export function generateActivationKey({ programId, hwid, email, months }) {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const payload = {
    programId,
    hwid: hwid.trim().toUpperCase(),
    email,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const payloadJson = JSON.stringify(payload);
  const payloadBytes = Buffer.from(payloadJson, 'utf8');

  const privateKey = readPrivateKey(programId);
  const signature = crypto.sign(null, payloadBytes, privateKey);

  const key = toBase64Url(payloadBytes) + '.' + toBase64Url(signature);

  return {
    key,
    payload,
    expiresAt: expiresAt.toISOString(),
  };
}

// -------- Проверка ключа активации --------

export function verifyActivationKey({ programId, key, hwid }) {
  try {
    const parts = key.split('.');
    if (parts.length !== 2) {
      return { valid: false, reason: 'wrong_format' };
    }

    const payloadBytes = fromBase64Url(parts[0]);
    const signature = fromBase64Url(parts[1]);
    const payload = JSON.parse(payloadBytes.toString('utf8'));

    const publicKey = readPublicKey(programId);
    const signatureValid = crypto.verify(null, payloadBytes, publicKey, signature);

    if (!signatureValid) {
      return { valid: false, reason: 'bad_signature' };
    }

    if (payload.programId !== programId) {
      return { valid: false, reason: 'wrong_program', payload };
    }

    if (new Date(payload.expiresAt) < new Date()) {
      return { valid: false, reason: 'expired', payload };
    }

    if (hwid && payload.hwid !== hwid.trim().toUpperCase()) {
      return { valid: false, reason: 'wrong_hwid', payload };
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: 'error', message: e.message };
  }
}