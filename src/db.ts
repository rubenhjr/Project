import { MongoClient, ObjectId as MongoObjectId } from 'mongodb';

let client: MongoClient | null = null;
let database: any = null;

export async function connect(uri: string, dbName = process.env.DB_NAME || 'sample_mflix') {
  if (!uri) throw new Error('MONGO_URI is missing');
  if (!client) {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 30000, // wait longer in Render
    });
  }
  // Safe to call connect() multiple times; driver no-ops if already connected
  await client.connect();
  database = client.db(dbName);
  return database;
}

export async function ensureTextIndex() {
  if (process.env.ENABLE_TEXT_INDEX !== 'true') {
    console.log('Text index creation skipped (ENABLE_TEXT_INDEX != "true")');
    return;
  }
  if (!database) throw new Error('DB not connected');
  await database.collection('movies').createIndex(
    { title: 'text', plot: 'text', cast: 'text' },
    { name: 'ft_movies' }
  );
  console.log('Text index ensured');
}

export async function refreshDb(uri: string, dbName = 'sample_mflix') {
  const results: string[] = [];
  try {
    if (database) {
      await database.command({ ping: 1 });
      results.push('ping OK');
    } else {
      await connect(uri, dbName);
      results.push('connected');
    }
  } catch (err) {
    try { if (client) await client.close(); } catch (e) { }
    await connect(uri, dbName);
    results.push('reconnected');
  }

  const idx = await ensureTextIndex();
  if (idx.ok) results.push('text index ensured');
  else results.push('index warning: ' + idx.error);

  return results;
}

function _buildQueryAndOptions(opts: any = {}) {
  const { limit = 20, year, title, fields, sort, skip = 0, q: textQuery } = opts;
  const query: any = {};
  if (year) query.year = Number(year);
  if (title) query.title = { $regex: title, $options: 'i' };

  let projection: any = null;
  let sortObj: any = {};
  if (textQuery) {
    query.$text = { $search: textQuery };
    projection = { score: { $meta: 'textScore' } };
    sortObj = { score: { $meta: 'textScore' } };
  }

  if (fields) {
    const p = projection || {};
    fields.split(',').map((f: string) => f.trim()).forEach((f: string) => { if (f) p[f] = 1; });
    projection = p;
  }

  if (sort) {
    const [field, dir] = sort.split(':');
    sortObj = { [field]: (dir && dir.toLowerCase() === 'desc') ? -1 : 1 };
  }

  return {
    query,
    options: {
      projection: projection || undefined,
      sort: sortObj,
      skip: Number(skip) || 0,
      limit: Number(limit) || 20,
    }
  };
}

export async function searchMovies(opts: any = {}) {
  if (!database) throw new Error('Not connected');
  const { query, options } = _buildQueryAndOptions(opts);
  const cursor = database.collection('movies')
    .find(query, options.projection ? { projection: options.projection } : {})
    .sort(options.sort || {})
    .skip(options.skip)
    .limit(options.limit);
  return cursor.toArray();
}

export async function getMovieById(id: string) {
  if (!database) throw new Error('Not connected');
  if (!MongoObjectId.isValid(id)) return null;
  return database.collection('movies').findOne({ _id: new MongoObjectId(id) });
}

export async function createMovie(doc: any) {
  if (!database) throw new Error('Not connected');
  const res = await database.collection('movies').insertOne(doc);
  return { insertedId: res.insertedId };
}

export async function updateMovieById(id: string, update: any) {
  if (!database) throw new Error('Not connected');
  if (!MongoObjectId.isValid(id)) return { matchedCount: 0, modifiedCount: 0 };
  const res = await database.collection('movies').updateOne({ _id: new MongoObjectId(id) }, { $set: update });
  return { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
}

export async function deleteMovieById(id: string) {
  if (!database) throw new Error('Not connected');
  if (!MongoObjectId.isValid(id)) return { deletedCount: 0 };
  const res = await database.collection('movies').deleteOne({ _id: new MongoObjectId(id) });
  return { deletedCount: res.deletedCount };
}

export async function close() {
  try {
    if (client) await client.close();
  } finally {
    client = null;
    database = null;
  }
}

export { MongoObjectId as ObjectId };
