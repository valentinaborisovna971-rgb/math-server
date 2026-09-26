// ============================================================
//  Генератор ключей Ed25519 для одной программы
//
//  Запуск:
//    npm run generate-keys <programId>
//
//  Примеры:
//    npm run generate-keys mathapp-1
//    npm run generate-keys mathapp-2
//
//  Создаёт:
//    keys/<programId>/закрытый.pem  — только на сервере
//    keys/<programId>/открытый.pem  — вшивается в программу
// ============================================================

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const programId = process.argv[2];

if (!programId) {
  console.log('');
  console.log('ОШИБКА: не указан ID программы.');
  console.log('');
  console.log('Пример запуска:');
  console.log('  npm run generate-keys mathapp-1');
  console.log('');
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(programId)) {
  console.log('');
  console.log('ОШИБКА: ID программы должен содержать только латиницу, цифры и дефис.');
  console.log('Пример правильного ID: mathapp-1');
  console.log('');
  process.exit(1);
}

const programKeysDir = path.resolve(__dirname, '..', 'keys', programId);
const privatePath = path.join(programKeysDir, 'закрытый.pem');
const publicPath = path.join(programKeysDir, 'открытый.pem');

if (!fs.existsSync(programKeysDir)) {
  fs.mkdirSync(programKeysDir, { recursive: true });
}

if (fs.existsSync(privatePath) || fs.existsSync(publicPath)) {
  console.log('');
  console.log('Ключи для программы "' + programId + '" уже существуют:');
  console.log('  ' + privatePath);
  console.log('  ' + publicPath);
  console.log('');
  console.log('Если нужно пересоздать — сначала удали эти два файла вручную.');
  console.log('ВНИМАНИЕ: после пересоздания старые лицензии перестанут работать!');
  console.log('');
  process.exit(0);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(privatePath, privateKey, { mode: 0o600 });
fs.writeFileSync(publicPath, publicKey, { mode: 0o644 });

console.log('');
console.log('Ключи для программы "' + programId + '" успешно созданы!');
console.log('');
console.log('Закрытый (только на сервере, НЕ в git):');
console.log('  ' + privatePath);
console.log('');
console.log('Открытый (вшивается в программу MathApp):');
console.log('  ' + publicPath);
console.log('');