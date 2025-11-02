"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectId = void 0;
exports.connect = connect;
exports.ensureTextIndex = ensureTextIndex;
exports.refreshDb = refreshDb;
exports.searchMovies = searchMovies;
exports.getMovieById = getMovieById;
exports.createMovie = createMovie;
exports.updateMovieById = updateMovieById;
exports.deleteMovieById = deleteMovieById;
exports.close = close;
const mongodb_1 = require("mongodb");
Object.defineProperty(exports, "ObjectId", { enumerable: true, get: function () { return mongodb_1.ObjectId; } });
let client = null;
let database = null;
async function connect(uri, dbName = process.env.DB_NAME || 'sample_mflix') {
    if (!uri)
        throw new Error('MONGO_URI missing');
    if (!client) {
        client = new mongodb_1.MongoClient(uri);
    }
    await client.connect();
    database = client.db(dbName);
    return database;
}
async function ensureTextIndex() {
    if (process.env.ENABLE_TEXT_INDEX !== 'true') {
        console.log('Text index creation skipped (ENABLE_TEXT_INDEX != "true")');
        return;
    }
    if (!database)
        throw new Error('DB not connected');
    await database.collection('movies').createIndex({ title: 'text', plot: 'text', cast: 'text' }, { name: 'ft_movies' });
    console.log('Text index ensured');
}
async function refreshDb(uri, dbName = 'sample_mflix') {
    const results = [];
    try {
        if (database) {
            await database.command({ ping: 1 });
            results.push('ping OK');
        }
        else {
            await connect(uri, dbName);
            results.push('connected');
        }
    }
    catch (err) {
        try {
            if (client)
                await client.close();
        }
        catch (e) { }
        await connect(uri, dbName);
        results.push('reconnected');
    }
    const idx = await ensureTextIndex();
    if (idx.ok)
        results.push('text index ensured');
    else
        results.push('index warning: ' + idx.error);
    return results;
}
function _buildQueryAndOptions(opts = {}) {
    const { limit = 20, year, title, fields, sort, skip = 0, q: textQuery } = opts;
    const query = {};
    if (year)
        query.year = Number(year);
    if (title)
        query.title = { $regex: title, $options: 'i' };
    let projection = null;
    let sortObj = {};
    if (textQuery) {
        query.$text = { $search: textQuery };
        projection = { score: { $meta: 'textScore' } };
        sortObj = { score: { $meta: 'textScore' } };
    }
    if (fields) {
        const p = projection || {};
        fields.split(',').map((f) => f.trim()).forEach((f) => { if (f)
            p[f] = 1; });
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
async function searchMovies(opts = {}) {
    if (!database)
        throw new Error('Not connected');
    const { query, options } = _buildQueryAndOptions(opts);
    const cursor = database.collection('movies')
        .find(query, options.projection ? { projection: options.projection } : {})
        .sort(options.sort || {})
        .skip(options.skip)
        .limit(options.limit);
    return cursor.toArray();
}
async function getMovieById(id) {
    if (!database)
        throw new Error('Not connected');
    if (!mongodb_1.ObjectId.isValid(id))
        return null;
    return database.collection('movies').findOne({ _id: new mongodb_1.ObjectId(id) });
}
async function createMovie(doc) {
    if (!database)
        throw new Error('Not connected');
    const res = await database.collection('movies').insertOne(doc);
    return { insertedId: res.insertedId };
}
async function updateMovieById(id, update) {
    if (!database)
        throw new Error('Not connected');
    if (!mongodb_1.ObjectId.isValid(id))
        return { matchedCount: 0, modifiedCount: 0 };
    const res = await database.collection('movies').updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: update });
    return { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
}
async function deleteMovieById(id) {
    if (!database)
        throw new Error('Not connected');
    if (!mongodb_1.ObjectId.isValid(id))
        return { deletedCount: 0 };
    const res = await database.collection('movies').deleteOne({ _id: new mongodb_1.ObjectId(id) });
    return { deletedCount: res.deletedCount };
}
async function close() {
    try {
        if (client)
            await client.close();
    }
    finally {
        client = null;
        database = null;
    }
}
