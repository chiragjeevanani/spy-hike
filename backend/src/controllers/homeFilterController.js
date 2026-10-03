import HomeFilter from '../models/HomeFilter.js';
import Trek from '../models/Trek.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify } from '../utils/slug.js';
import { cacheInvalidate } from '../lib/cache.js';

const serialize = (filter) => filter.toPublicJSON();

export const listHomeFilters = asyncHandler(async (_req, res) => {
  const filters = await HomeFilter.find({ active: true }).sort({ order: 1, label: 1 });
  res.json({ filters: filters.map(serialize) });
});

export const adminListHomeFilters = asyncHandler(async (_req, res) => {
  const filters = await HomeFilter.find().sort({ order: 1, label: 1 });
  res.json({ filters: filters.map(serialize) });
});

export const createHomeFilter = asyncHandler(async (req, res) => {
  const label = String(req.body.label || '').trim();
  if (!label) throw ApiError.badRequest('Filter name is required');
  const id = slugify(label);
  if (!id) throw ApiError.badRequest('Filter name must contain a letter or number');
  if (await HomeFilter.exists({ _id: id })) throw ApiError.conflict('A filter with this name already exists');

  const filter = await HomeFilter.create({
    _id: id,
    label,
    icon: req.body.icon || 'Mountain',
    order: Number(req.body.order) || 0,
    active: req.body.active !== false,
  });
  await cacheInvalidate('home-filters', 'treks', 'trips');
  res.status(201).json({ filter: serialize(filter) });
});

export const updateHomeFilter = asyncHandler(async (req, res) => {
  const filter = await HomeFilter.findById(req.params.id);
  if (!filter) throw ApiError.notFound('Homepage filter not found');
  if (req.body.label !== undefined) {
    const label = String(req.body.label).trim();
    if (!label) throw ApiError.badRequest('Filter name is required');
    filter.label = label;
  }
  if (req.body.icon !== undefined) filter.icon = req.body.icon;
  if (req.body.order !== undefined) filter.order = Number(req.body.order) || 0;
  if (req.body.active !== undefined) filter.active = !!req.body.active;
  await filter.save();
  await cacheInvalidate('home-filters', 'treks', 'trips');
  res.json({ filter: serialize(filter) });
});

export const deleteHomeFilter = asyncHandler(async (req, res) => {
  const filter = await HomeFilter.findByIdAndDelete(req.params.id);
  if (!filter) throw ApiError.notFound('Homepage filter not found');
  await Trek.updateMany({}, { $pull: { homeFilterIds: req.params.id } });
  await cacheInvalidate('home-filters', 'treks', 'trips');
  res.json({ ok: true, id: req.params.id });
});
