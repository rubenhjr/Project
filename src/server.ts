import 'dotenv/config';
import path from 'path';
import express from 'express';
import { connect, ensureTextIndex, close } from './db';

const app = express();

// Health check (Render can use /healthz)
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Static frontend
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Listen first so Render health checks don’t 502 while DB connects
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web Server is listening at port ${PORT}`);
});

async function start() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || 'sample_mflix';

  if (!uri) {
    console.error('MONGO_URI environment variable is not set. Skipping DB connection.');
    return; // server stays up for health checks
  }

  // Retry loop instead of process.exit(1)
  const connectWithRetry = async (attempt = 1) => {
    try {
      await connect(uri, dbName);
      console.log(`Connected to MongoDB db=${dbName}`);
      if (process.env.ENABLE_TEXT_INDEX === 'true') {
        await ensureTextIndex();
      }
    } catch (err: any) {
      const delay = Math.min(30000, attempt * 5000);
      console.error(`MongoDB connect failed (attempt ${attempt}): ${err?.message || err}`);
      setTimeout(() => connectWithRetry(attempt + 1), delay);
    }
  };

  connectWithRetry();
}

process.on('SIGINT', async () => {
  try { await close(); } finally { process.exit(0); }
});

start();
