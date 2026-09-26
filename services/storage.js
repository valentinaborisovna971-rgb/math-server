// ============================================================
//  Простое хранилище на JSON-файле
//  Хранит: оплаты, выданные ключи
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'database.json');

// Создаём папку data, если нет
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Начальная структура базы
const emptyDb = {
  payments: [],
  licenses: [],
};

// Загружаем базу из файла
function load() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(emptyDb, null, 2), 'utf8');
    return { ...emptyDb };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return {
      payments: raw.payments || [],
      licenses: raw.licenses || [],
    };
  } catch (e) {
    console.error('Ошибка чтения базы:', e.message);
    return { ...emptyDb };
  }
}

// Сохраняем базу в файл
function save(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

// -------- Оплаты --------

export function addPayment(payment) {
  const db = load();
  db.payments.push({
    id: payment.id,
    email: payment.email,
    programId: payment.programId,
    months: payment.months,
    amount: payment.amount,
    paidAt: new Date().toISOString(),
    used: false,
  });
  save(db);
}

export function findUnusedPayment(email, programId) {
  const db = load();
  return db.payments.find(
    (p) => p.email === email && p.programId === programId && !p.used
  );
}

export function markPaymentUsed(paymentId) {
  const db = load();
  const p = db.payments.find((x) => x.id === paymentId);
  if (p) p.used = true;
  save(db);
}

// -------- Лицензии --------

export function addLicense(license) {
  const db = load();
  db.licenses.push({
    id: license.id,
    key: license.key,
    hwid: license.hwid,
    email: license.email,
    programId: license.programId,
    issuedAt: new Date().toISOString(),
    expiresAt: license.expiresAt,
  });
  save(db);
}

export function findLicensesByEmail(email) {
  const db = load();
  return db.licenses.filter((l) => l.email === email);
}

export function findLicenseByKey(key) {
  const db = load();
  return db.licenses.find((l) => l.key === key);
}

export function getAll() {
  return load();
}