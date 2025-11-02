"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const tdb = __importStar(require("./db"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)()); // allow Live Server origin
// Health check endpoint for Render
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
// Serve frontend
app.get('/', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'public', 'index.html'));
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
    const uri = process.env.MONGO_URI;
    const dbName = process.env.DB_NAME || 'sample_mflix'; // ← Use sample_mflix
    if (!uri) {
        console.error('MONGO_URI is not set; skipping DB connect');
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
        }
        catch (e) {
            console.warn('GraphQL init failed:', e?.message || e);
        }
    }
    catch (err) {
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
