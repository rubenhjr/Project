const { gql } = require('apollo-server-express');
const db = require('../db');

const typeDefs = gql`
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

const resolvers = {
  Query: {
    movies: async (_, args) => {
      const opts = { q: args.q, limit: args.limit || 20, skip: args.skip || 0 };
      return db.searchMovies(opts);
    },
    movie: async (_, { id }) => db.getMovieById(id),
  },
  Mutation: {
    createMovie: async (_, { input }) => {
      const r = await db.createMovie(input);
      return r.insertedId;
    },
    updateMovie: async (_, { id, input }) => db.updateMovieById(id, input),
    deleteMovie: async (_, { id }) => db.deleteMovieById(id),
  }
};

module.exports = { typeDefs, resolvers };
