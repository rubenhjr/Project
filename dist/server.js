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
const cors_1 = __importDefault(require("cors"));
const db = __importStar(require("./db"));
const app = (0, express_1.default)();
// Middleware FIRST
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check (before GraphQL and static)
app.get('/healthz', (_req, res) => res.status(200).send('ok'));
// Initialize GraphQL synchronously BEFORE starting server
async function initGraphQL() {
    try {
        const { ApolloServer } = require('apollo-server-express');
        const { typeDefs, resolvers } = require('./graphql/schema');
        const apolloServer = new ApolloServer({
            typeDefs,
            resolvers,
            context: () => ({ db }),
            persistedQueries: false, // Disable to avoid cache vulnerability
            introspection: process.env.NODE_ENV !== 'production', // Disable introspection in prod
        });
        await apolloServer.start();
        apolloServer.applyMiddleware({ app, path: '/graphql' });
        console.log('✅ GraphQL endpoint mounted at /graphql');
        return true;
    }
    catch (err) {
        console.error('❌ GraphQL initialization failed:', err.message || err);
        return false;
    }
}
// Static files AFTER GraphQL (so /graphql isn't caught by static handler)
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
// Root route
app.get('/', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'public', 'index.html'));
});
// Connect to DB and initialize everything BEFORE starting server
async function start() {
    const MONGO_URI = process.env.MONGO_URI;
    const DB_NAME = process.env.DB_NAME || 'sample_mflix';
    // Connect to MongoDB
    if (!MONGO_URI) {
        console.error('❌ MONGO_URI not set - database features disabled');
    }
    else {
        try {
            await db.connect(MONGO_URI, DB_NAME);
            console.log(`✅ Connected to MongoDB (database: ${DB_NAME})`);
            if (process.env.ENABLE_TEXT_INDEX === 'true') {
                const result = await db.ensureTextIndex();
                if (result.ok)
                    console.log('✅ Text index ready');
            }
        }
        catch (err) {
            console.error('❌ MongoDB connection failed:', err.message || err);
            console.error('Database features will be unavailable');
        }
    }
    // Initialize GraphQL (required for app to work)
    const graphqlOk = await initGraphQL();
    if (!graphqlOk) {
        console.error('⚠️  Starting server without GraphQL - app will not function correctly');
    }
    // NOW start the HTTP server
    const PORT = Number(process.env.PORT || 3000);
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Web Server listening on port ${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/healthz`);
        if (graphqlOk)
            console.log(`   GraphQL: http://localhost:${PORT}/graphql`);
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
