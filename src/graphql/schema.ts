import { gql } from 'apollo-server-express';
import * as db from '../db';
import { Movie } from '../types';

export const typeDefs = gql`
  type Movie {
    _id: ID
    title: String
    year: Int
    plot: String
    score: Float
  }

  input MovieInput {
    title: String!
    year: Int
    plot: String
  }

  type Query {
    movies(q: String, limit: Int, skip: Int): [Movie]
    movie(id: ID!): Movie
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
    movies: async (_: any, { q, limit = 20, skip = 0 }: any) => {
      const opts = { q, limit, skip };
      const results = await db.searchMovies(opts);
      console.log(`GraphQL movies query returned ${results.length} results`); // debug log
      return results;
    },
    movie: async (_: any, { id }: any) => {
      return await db.getMovieById(id);
    },
  },
  Mutation: {
    createMovie: async (_: any, { input }: any) => {
      const r = await db.createMovie(input);
      return r.insertedId;
    },
    updateMovie: async (_: any, { id, input }: any) => db.updateMovieById(id, input),
    deleteMovie: async (_: any, { id }: any) => db.deleteMovieById(id),
  }
};
