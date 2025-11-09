import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import * as db from './db';
import { configureAuth } from './config/auth';
import authRoutes from './routes/auth';

const app = express();

// Middleware FIRST
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
configureAuth();
app.use(passport.initialize());
app.use(passport.session());

// Health check (before GraphQL and static)
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Authentication routes
app.use('/auth', authRoutes);

// Initialize GraphQL synchronously BEFORE starting server
async function initGraphQL() {
  try {
    const { ApolloServer } = require('apollo-server-express');
    const { typeDefs, resolvers } = require('./graphql/schema');

    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req }: { req: any }) => ({ db, req }),
      persistedQueries: false, // Disable to avoid cache vulnerability
      introspection: process.env.NODE_ENV !== 'production', // Disable introspection in prod
    });

    await apolloServer.start();
    apolloServer.applyMiddleware({ app, path: '/graphql' });
    console.log('GraphQL endpoint mounted at /graphql');
    return true;
  } catch (err: any) {
    console.error('GraphQL initialization failed:', err.message || err);
    return false;
  }
}

// Static files AFTER GraphQL (so /graphql isn't caught by static handler)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Root route
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Connect to DB and initialize everything BEFORE starting server
async function start() {
  const MONGO_URI = process.env.MONGO_URI;
  const DB_NAME = process.env.DB_NAME || 'sample_mflix';

  // Connect to MongoDB
  if (!MONGO_URI) {
    console.error('MONGO_URI not set - database features disabled');
  } else {
    try {
      await db.connect(MONGO_URI, DB_NAME);
      console.log(`Connected to MongoDB (database: ${DB_NAME})`);

      if (process.env.ENABLE_TEXT_INDEX === 'true') {
        const result = await db.ensureTextIndex();
        if (result.ok) console.log('Text index ready');
      }
    } catch (err: any) {
      console.error('MongoDB connection failed:', err.message || err);
      console.error('Database features will be unavailable');
    }
  }

  // Initialize GraphQL (required for app to work)
  const graphqlOk = await initGraphQL();
  if (!graphqlOk) {
    console.error('Starting server without GraphQL - app will not function correctly');
  }

  // NOW start the HTTP server
  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web Server listening on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/healthz`);
    if (graphqlOk) console.log(`   GraphQL: http://localhost:${PORT}/graphql`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing connections...');
  await db.close();
  process.exit(0);
});

// Start everything
start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
