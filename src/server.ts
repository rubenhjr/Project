import 'dotenv/config';
import express from 'express';
import path from 'path';
import * as tdb from './db';
import * as moviesController from './controllers/movies';

const { ApolloServer } = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('apollo-server-express');
  } catch (e) {
    return {} as any;
  }
})();

const app = express();
const MONGO_URI = process.env.MONGO_URI || '';
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Movie operations are provided via GraphQL at /graphql. REST endpoints removed.

async function start() {
  try {
    await tdb.connect(MONGO_URI);
    await tdb.ensureTextIndex();
    console.log('Connected to MongoDB (via src/db.ts)');

    if (ApolloServer) {
      try {
        const { typeDefs, resolvers } = require('./graphql/schema');
        const apolloServer = new ApolloServer({ typeDefs, resolvers });
        await apolloServer.start();
        // @ts-ignore
        apolloServer.applyMiddleware({ app, path: '/graphql' });
        console.log('GraphQL endpoint mounted at /graphql');
      } catch (err: any) {
        console.warn('Could not initialize GraphQL (missing schema or apollo).', err.message || err);
      }
    } else {
      console.log('apollo-server-express not installed — GraphQL disabled.');
    }

    app.listen(PORT, () => {
      console.log(`Web Server is listening at port ${PORT}`);
    });
  } catch (err: any) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing MongoDB connection');
  await tdb.close();
  process.exit(0);
});

start();
