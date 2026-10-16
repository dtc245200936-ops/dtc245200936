const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');
const { validateCustomer } = require('./customer-validation');

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'crm',
  user: process.env.DB_USER || 'crm_app',
  password: process.env.DB_PASSWORD,
});
const logFile = process.env.LOG_FILE || '';
const logStream = logFile ? fs.createWriteStream(logFile, { flags: 'a' }) : null;

client.collectDefaultMetrics({ prefix: 'crm_' });
const httpDuration = new client.Histogram({
  name: 'crm_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

function writeLog(record) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...record });
  process.stdout.write(`${line}\n`);
  if (logStream) logStream.write(`${line}\n`);
}

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    end({ method: req.method, route, status_code: String(res.statusCode) });
    writeLog({ type: 'http', method: req.method, path: req.path, status: res.statusCode });
  });
  next();
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    writeLog({ level: 'error', type: 'healthcheck', message: error.message });
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/api/customers', async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim().slice(0, 100);
    const result = await pool.query(
      `SELECT id, name, email, phone, company, status, notes, created_at, updated_at
       FROM customers
       WHERE ($1 = '' OR name ILIKE $2 OR email ILIKE $2 OR company ILIKE $2)
       ORDER BY created_at DESC`,
      [query, `%${query}%`],
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/customers', async (req, res, next) => {
  const { name, email, phone = '', company = '', status = 'lead', notes = '' } = req.body || {};
  const validationError = validateCustomer({ name, email, phone, company, status, notes });
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const result = await pool.query(
      `INSERT INTO customers (name, email, phone, company, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, company, status, notes, created_at, updated_at`,
      [name.trim(), email.trim().toLowerCase(), phone.trim(), company.trim(), status, notes.trim()],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email da duoc su dung.' });
    next(error);
  }
});

app.patch('/api/customers/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const { name, email, phone, company, status, notes } = req.body || {};
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Du lieu khach hang khong hop le.' });
  }
  const validationError = validateCustomer({ name, email, phone, company, status, notes });
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const result = await pool.query(
      `UPDATE customers
       SET name=$1, email=$2, phone=$3, company=$4, status=$5, notes=$6, updated_at=NOW()
       WHERE id=$7
       RETURNING id, name, email, phone, company, status, notes, created_at, updated_at`,
      [name.trim(), email.trim().toLowerCase(), phone.trim(), company.trim(), status, notes.trim(), id],
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Khong tim thay khach hang.' });
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email da duoc su dung.' });
    next(error);
  }
});

app.delete('/api/customers/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'ID khong hop le.' });
  try {
    const result = await pool.query('DELETE FROM customers WHERE id=$1', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Khong tim thay khach hang.' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(__dirname, '..', 'public'), { index: 'index.html' }));
app.use((error, _req, res, _next) => {
  writeLog({ level: 'error', type: 'application', message: error.message });
  res.status(500).json({ error: 'Loi he thong. Vui long thu lai sau.' });
});

const server = app.listen(port, '0.0.0.0', () => {
  writeLog({ type: 'startup', port });
});

function shutdown() {
  server.close(() => {
    pool.end().then(() => process.exit(0)).catch((error) => {
      writeLog({ level: 'error', type: 'shutdown', message: error.message });
      process.exit(1);
    });
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
