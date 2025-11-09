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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = exports.typeDefs = void 0;
const apollo_server_express_1 = require("apollo-server-express");
const db = __importStar(require("../db"));
const auth_1 = require("../config/auth");
exports.typeDefs = (0, apollo_server_express_1.gql) `
  type Movie {
    _id: ID
    title: String
    year: Int
    plot: String
    score: Float
  }

  type User {
    id: ID!
    email: String!
    name: String!
    picture: String
  }

  input MovieInput {
    title: String!
    year: Int
    plot: String
  }

  type Query {
    movies(q: String, limit: Int, skip: Int): [Movie]
    movie(id: ID!): Movie
    me: User
  }

  type Mutation {
    createMovie(input: MovieInput!): ID
    updateMovie(id: ID!, input: MovieInput!): UpdateResult
    deleteMovie(id: ID!): DeleteResult
  }

  type UpdateResult { matchedCount: Int, modifiedCount: Int }
  type DeleteResult { deletedCount: Int }
`;
exports.resolvers = {
    Query: {
        movies: async (_, { q, limit = 20, skip = 0 }, { db }) => {
            return db.searchMovies({ q, limit, skip });
        },
        movie: async (_, { id }) => {
            return await db.getMovieById(id);
        },
        me: async (_, __, { req }) => {
            return (0, auth_1.getCurrentUser)(req);
        },
    },
    Mutation: {
        createMovie: async (_, { input }, { req }) => {
            const user = (0, auth_1.getCurrentUser)(req);
            if (!user) {
                throw new Error('Authentication required to create movies');
            }
            const r = await db.createMovie(input);
            return r.insertedId;
        },
        updateMovie: async (_, { id, input }, { req }) => {
            const user = (0, auth_1.getCurrentUser)(req);
            if (!user) {
                throw new Error('Authentication required to update movies');
            }
            return db.updateMovieById(id, input);
        },
        deleteMovie: async (_, { id }, { req }) => {
            const user = (0, auth_1.getCurrentUser)(req);
            if (!user) {
                throw new Error('Authentication required to delete movies');
            }
            return db.deleteMovieById(id);
        },
    }
};
