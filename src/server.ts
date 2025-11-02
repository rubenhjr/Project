import 'dotenv/config';
import express from 'express';
import path from 'path';
import * as tdb from './db';

const app = express();

// Health check endpoint for Render
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve frontend
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server immediately so Render health checks pass while DB connects
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web Server is listening at port ${PORT}`);
  console.log(`Env check -> has MONGO_URI: ${Boolean(process.env.MONGO_URI)}, DB_NAME: ${process.env.DB_NAME || 'sample_mflix'}`);
});

// Movie operations are provided via GraphQL at /graphql. REST endpoints removed.

// Connect to Mongo and mount GraphQL
async function start() {
  const uri = process.env.MONGO_URI;                // CHANGED: read from env
  const dbName = process.env.DB_NAME || 'secureDB'; // or your default

  if (!uri) {
    console.error('MONGO_URI is not set; skipping DB connect (service will still serve / and /healthz).');
    return;
  }

  try {
    await tdb.connect(uri, dbName);
    console.log(`Connected to MongoDB (db=${dbName})`);

    // Initialize GraphQL after DB connect
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { typeDefs, resolvers } = require('./graphql/schema');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ApolloServer } = require('apollo-server-express');
      const apolloServer = new ApolloServer({ typeDefs, resolvers, context: () => ({ db: tdb }) });
      await apolloServer.start();
      // @ts-ignore
      apolloServer.applyMiddleware({ app, path: '/graphql' });
      console.log('GraphQL endpoint mounted at /graphql');
    } catch (e: any) {
      console.warn('GraphQL init failed:', e?.message || e);
    }
  } catch (err: any) {
    console.error('MongoDB connect failed:', err?.message || err);
    // Do not exit on Render; keep serving health checks and static files
  }
}

process.on('SIGINT', async () => {
  console.log('SIGINT received; closing DB');
  await tdb.close();
  process.exit(0);
});

start();
