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
const { ApolloServer } = (() => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('apollo-server-express');
    }
    catch (e) {
        return {};
    }
})();
const app = (0, express_1.default)();
const MONGO_URI = process.env.MONGO_URI || '';
const PORT = Number(process.env.PORT || 3000);
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'public', 'index.html'));
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
            }
            catch (err) {
                console.warn('Could not initialize GraphQL (missing schema or apollo).', err.message || err);
            }
        }
        else {
            console.log('apollo-server-express not installed — GraphQL disabled.');
        }
        app.listen(PORT, () => {
            console.log(`Web Server is listening at port ${PORT}`);
        });
    }
    catch (err) {
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
