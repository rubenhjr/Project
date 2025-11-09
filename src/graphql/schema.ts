import { gql } from 'apollo-server-express';
import * as db from '../db';
import { Movie } from '../types';
import { getCurrentUser } from '../config/auth';

export const typeDefs = gql`
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

export const resolvers = {
  Query: {
    movies: async (_: any, { q, limit = 20, skip = 0 }: any, { db }: any) => {
      return db.searchMovies({ q, limit, skip });
    },
    movie: async (_: any, { id }: any) => {
      return await db.getMovieById(id);
    },
    me: async (_: any, __: any, { req }: any) => {
      console.log('Me query - Session ID:', req.sessionID);
      console.log('Me query - IsAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : 'no isAuthenticated method');
      console.log('Me query - User:', req.user);
      console.log('Me query - Session:', req.session);
      const user = getCurrentUser(req);
      console.log('Me query - getCurrentUser result:', user);
      return user;
    },
  },
  Mutation: {
    createMovie: async (_: any, { input }: any, { req }: any) => {
      console.log('CreateMovie - Session ID:', req.sessionID);
      console.log('CreateMovie - IsAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : 'no isAuthenticated method');
      console.log('CreateMovie - User:', req.user);
      const user = getCurrentUser(req);
      console.log('CreateMovie - getCurrentUser result:', user);
      if (!user) {
        throw new Error('Authentication required to create movies');
      }
      const r = await db.createMovie(input);
      return r.insertedId;
    },
    updateMovie: async (_: any, { id, input }: any, { req }: any) => {
      console.log('UpdateMovie - Session ID:', req.sessionID);
      console.log('UpdateMovie - IsAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : 'no isAuthenticated method');
      console.log('UpdateMovie - User:', req.user);
      const user = getCurrentUser(req);
      console.log('UpdateMovie - getCurrentUser result:', user);
      if (!user) {
        throw new Error('Authentication required to update movies');
      }
      return db.updateMovieById(id, input);
    },
    deleteMovie: async (_: any, { id }: any, { req }: any) => {
      console.log('DeleteMovie - Session ID:', req.sessionID);
      console.log('DeleteMovie - IsAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : 'no isAuthenticated method');
      console.log('DeleteMovie - User:', req.user);
      const user = getCurrentUser(req);
      console.log('DeleteMovie - getCurrentUser result:', user);
      if (!user) {
        throw new Error('Authentication required to delete movies');
      }
      return db.deleteMovieById(id);
    },
  }
};
