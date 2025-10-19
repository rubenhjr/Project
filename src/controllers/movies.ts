import * as db from '../db';
import { Request, Response } from 'express';
import { Movie } from '../types';

export async function list(req: Request, res: Response) {
  try {
  const movies: Movie[] = await db.searchMovies(req.query);
    res.json(movies);
  } catch (err: any) {
    console.error('controller.list error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch movies' });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;
  const movie = await db.getMovieById(id);
    if (!movie) return res.status(404).json({ error: 'Not found' });
    res.json(movie);
  } catch (err: any) {
    console.error('controller.getById error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch movie' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const doc = req.body;
    const errors: Record<string, string> = {};
    if (!doc || Object.keys(doc).length === 0) return res.status(400).json({ error: 'Empty body' });
    if (!doc.title || String(doc.title).trim() === '') errors.title = 'Title is required';
    if (doc.year !== undefined && doc.year !== null && Number.isNaN(Number(doc.year))) errors.year = 'Year must be a number';
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', fields: errors });

  const r = await db.createMovie(doc);
    res.status(201).json(r);
  } catch (err: any) {
    console.error('controller.create error', err);
    res.status(500).json({ error: err.message || 'Failed to create movie' });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateDoc = req.body;
    const errors: Record<string, string> = {};
    if (!updateDoc || Object.keys(updateDoc).length === 0) return res.status(400).json({ error: 'Empty body' });
    if (updateDoc.title !== undefined && String(updateDoc.title).trim() === '') errors.title = 'Title is required';
    if (updateDoc.year !== undefined && Number.isNaN(Number(updateDoc.year))) errors.year = 'Year must be a number';
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', fields: errors });

  const r = await db.updateMovieById(id, updateDoc);
    if (r.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (err: any) {
    console.error('controller.update error', err);
    res.status(500).json({ error: err.message || 'Failed to update movie' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;
  const r = await db.deleteMovieById(id);
    if (r.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (err: any) {
    console.error('controller.remove error', err);
    res.status(500).json({ error: err.message || 'Failed to delete movie' });
  }
}
