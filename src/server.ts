import 'dotenv/config';
import express from 'express';
import path from 'path';
import * as db from './db';

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
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web Server is listening at port ${PORT}`);
});

// Initialize database connection with retry logic
async function initializeDatabase() {
  const MONGO_URI = process.env.MONGO_URI;
  const DB_NAME = process.env.DB_NAME || 'sample_mflix';

  if (!MONGO_URI) {
    console.error('MONGO_URI environment variable is not set. Skipping database connection.');
    return;
  }

  let attempt = 1;
  const maxAttempts = 5;

  while (attempt <= maxAttempts) {
    try {
      console.log(`Attempting to connect to MongoDB (attempt ${attempt}/${maxAttempts})...`);
      await db.connect(MONGO_URI, DB_NAME);
      console.log(`Connected to MongoDB (database: ${DB_NAME})`);
      
      // Only create text index if explicitly enabled
      if (process.env.ENABLE_TEXT_INDEX === 'true') {
        const indexResult = await db.ensureTextIndex();
        if (indexResult.ok) {
          console.log('Text index ensured on movies collection');
        }
      } else {
        console.log('Text index creation skipped (ENABLE_TEXT_INDEX not set to "true")');
      }
      
      // Initialize GraphQL after successful DB connection
      await initializeGraphQL();
      return;
    } catch (err: any) {
      console.error(`MongoDB connection attempt ${attempt} failed:`, err.message || err);
      
      if (attempt === maxAttempts) {
        console.error('Max connection attempts reached. Database features will be unavailable.');
        return;
      }
      
      const delay = Math.min(10000, attempt * 2000);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
}

// Initialize GraphQL server
async function initializeGraphQL() {
  try {
    const { ApolloServer } = require('apollo-server-express');
    const { typeDefs, resolvers } = require('./graphql/schema');
    
    const apolloServer = new ApolloServer({ 
      typeDefs, 
      resolvers,
      context: () => ({ db })
    });
    
    await apolloServer.start();
    apolloServer.applyMiddleware({ app, path: '/graphql' });
    console.log('GraphQL endpoint mounted at /graphql');
  } catch (err: any) {
    console.warn('GraphQL initialization failed:', err.message || err);
    console.warn('GraphQL features will be unavailable.');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT received, closing connections...');
  try {
    await db.close();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  try {
    await db.close();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// Start database initialization (non-blocking)
initializeDatabase().catch(err => {
  console.error('Unexpected error during database initialization:', err);
});
