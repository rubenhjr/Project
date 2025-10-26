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
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.remove = remove;
const db = __importStar(require("../db"));
async function list(req, res) {
    try {
        const movies = await db.searchMovies(req.query);
        res.json(movies);
    }
    catch (err) {
        console.error('controller.list error', err);
        res.status(500).json({ error: err.message || 'Failed to fetch movies' });
    }
}
async function getById(req, res) {
    try {
        const { id } = req.params;
        const movie = await db.getMovieById(id);
        if (!movie)
            return res.status(404).json({ error: 'Not found' });
        res.json(movie);
    }
    catch (err) {
        console.error('controller.getById error', err);
        res.status(500).json({ error: err.message || 'Failed to fetch movie' });
    }
}
async function create(req, res) {
    try {
        const doc = req.body;
        const errors = {};
        if (!doc || Object.keys(doc).length === 0)
            return res.status(400).json({ error: 'Empty body' });
        if (!doc.title || String(doc.title).trim() === '')
            errors.title = 'Title is required';
        if (doc.year !== undefined && doc.year !== null && Number.isNaN(Number(doc.year)))
            errors.year = 'Year must be a number';
        if (Object.keys(errors).length)
            return res.status(400).json({ error: 'Validation failed', fields: errors });
        const r = await db.createMovie(doc);
        res.status(201).json(r);
    }
    catch (err) {
        console.error('controller.create error', err);
        res.status(500).json({ error: err.message || 'Failed to create movie' });
    }
}
async function update(req, res) {
    try {
        const { id } = req.params;
        const updateDoc = req.body;
        const errors = {};
        if (!updateDoc || Object.keys(updateDoc).length === 0)
            return res.status(400).json({ error: 'Empty body' });
        if (updateDoc.title !== undefined && String(updateDoc.title).trim() === '')
            errors.title = 'Title is required';
        if (updateDoc.year !== undefined && Number.isNaN(Number(updateDoc.year)))
            errors.year = 'Year must be a number';
        if (Object.keys(errors).length)
            return res.status(400).json({ error: 'Validation failed', fields: errors });
        const r = await db.updateMovieById(id, updateDoc);
        if (r.matchedCount === 0)
            return res.status(404).json({ error: 'Not found' });
        res.json(r);
    }
    catch (err) {
        console.error('controller.update error', err);
        res.status(500).json({ error: err.message || 'Failed to update movie' });
    }
}
async function remove(req, res) {
    try {
        const { id } = req.params;
        const r = await db.deleteMovieById(id);
        if (r.deletedCount === 0)
            return res.status(404).json({ error: 'Not found' });
        res.json(r);
    }
    catch (err) {
        console.error('controller.remove error', err);
        res.status(500).json({ error: err.message || 'Failed to delete movie' });
    }
}
