// ======================================================
// Math Server — точка входа
// Обслуживает сайт-витрину и программы MathApp
// ======================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import activateRoutes from './routes/activate.js';
import webhookRoutes from './routes/webhook.js';

// ---------- Конфигурация ----------
const PORT = parseInt(process.env.PORT || '3001', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

const app = express();

// CORS — разрешаем сайту и программам обращаться к API
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
  })
);

// ---------- Маршруты ----------

// Вебхук должен идти ПЕРВЫМ, потому что ему нужен raw body
app.use('/api/webhook', webhookRoutes);

// Обычные JSON-запросы
app.use(express.json({ limit: '1mb' }));

// API активации
app.use('/api/activate', activateRoutes);

// Health-check — чтобы хостинг знал, что сервер жив
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    service: 'math-server',
  });
});

// Тестовый эндпоинт для проверки отправки писем
// GET /api/test-email?to=ваша@почта.com
app.get('/api/test-email', async (req, res) => {
  try {
    const { sendTestEmail } = await import('./services/email.js');
    const to = req.query.to || 'valentinaborisovna971@gmail.com';
    const result = await sendTestEmail(to);
    res.json({
      target: to,
      result,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Корень — небольшая страница-заглушка
app.get('/', (req, res) => {
  res.send('Math Server is running');
});

// ---------- Обработка ошибок ----------
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------- Запуск ----------
app.listen(PORT, () => {
  console.log('===========================================');
  console.log(' Math Server');
  console.log(' Порт: ' + PORT);
  console.log(' Режим: ' + (process.env.NODE_ENV || 'development'));
  console.log(' Origins: ' + ALLOWED_ORIGINS.join(', '));
  console.log('===========================================');
});

// ---------- Мягкое выключение ----------
process.on('SIGINT', () => {
  console.log('\n[server] Выключение...');
  process.exit(0);
});