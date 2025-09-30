// src/routes/iklan.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';
import { createIklanSchema, zodToFieldErrors } from '../utils/zod';

const prisma = new PrismaClient();
const r = Router();

const Create = createIklanSchema;
const Update = Create.partial();

const toCsv = (a?: string[]) =>
  a?.length
    ? a
        .map((s) => s.trim())
        .filter(Boolean)
        .join(',')
    : null;

const fromCsv = (s?: string | null) =>
  !s
    ? []
    : s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

/**
 * @openapi
 * /iklan:
 *   get:
 *     tags: [Iklan]
 *     summary: List ads (published)
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: integer }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
r.get('/', async (req, res) => {
  const { city, minPrice, maxPrice, q } = req.query;
  const where: any = { published: true };

  if (city) where.city = String(city);
  if (minPrice) where.price = { ...(where.price || {}), gte: Number(minPrice) };
  if (maxPrice) where.price = { ...(where.price || {}), lte: Number(maxPrice) };
  if (q)
    where.OR = [
      { title: { contains: String(q), mode: 'insensitive' } },
      { body: { contains: String(q), mode: 'insensitive' } },
      { city: { contains: String(q), mode: 'insensitive' } },
    ];

  const data = await prisma.iklan.findMany({
    where,
    select: {
      id: true,
      title: true,
      price: true,
      city: true,
      province: true,
      areaSqm: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(data);
});

/**
 * @openapi
 * /iklan/{id}:
 *   get:
 *     tags: [Iklan]
 *     summary: Get ad detail (published)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
r.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const ad = await prisma.iklan.findUnique({ where: { id } });
  if (!ad || !ad.published) return res.status(404).json({ error: 'Not found' });

  res.json({
    id: ad.id,
    title: ad.title,
    body: ad.body,
    price: ad.price,
    published: ad.published,
    location: {
      addressLine: ad.addressLine,
      city: ad.city,
      province: ad.province,
      postalCode: ad.postalCode,
    },
    property: {
      areaSqm: ad.areaSqm,
      rooms: ad.rooms,
      bathrooms: ad.bathrooms,
      facilities: fromCsv(ad.facilitiesCsv),
    },
    createdAt: ad.createdAt,
  });
});

/**
 * @openapi
 * /iklan:
 *   post:
 *     tags: [Iklan]
 *     summary: Create ad (protected)
 *     security: [ { BearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/IklanCreate' }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
r.post('/', auth, async (req: any, res) => {
  const parsed = Create.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(zodToFieldErrors(parsed.error));
  }
  const { facilities, ...rest } = parsed.data;

  const created = await prisma.iklan.create({
    data: {
      ...rest,
      facilitiesCsv: toCsv(facilities),
      ownerId: req.user!.userId,
    },
  });
  res.status(201).json(created);
});

/**
 * @openapi
 * /iklan/{id}:
 *   put:
 *     tags: [Iklan]
 *     summary: Update own ad (protected)
 *     security: [ { BearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/IklanUpdate' }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
r.put('/:id', auth, async (req: any, res) => {
  const id = Number(req.params.id);
  const own = await prisma.iklan.findUnique({ where: { id } });
  if (!own || own.ownerId !== req.user!.userId)
    return res.status(404).json({ error: 'Not found' });

  const parsed = Update.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(zodToFieldErrors(parsed.error));
  }
  const { facilities, ...rest } = parsed.data;

  const updated = await prisma.iklan.update({
    where: { id },
    data: {
      ...rest,
      facilitiesCsv: facilities ? toCsv(facilities) : undefined,
    },
  });
  res.json(updated);
});

/**
 * @openapi
 * /iklan/{id}:
 *   delete:
 *     tags: [Iklan]
 *     summary: Delete own ad (protected)
 *     security: [ { BearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
r.delete('/:id', auth, async (req: any, res) => {
  const id = Number(req.params.id);
  const own = await prisma.iklan.findUnique({ where: { id } });
  if (!own || own.ownerId !== req.user!.userId)
    return res.status(404).json({ error: 'Not found' });

  await prisma.iklan.delete({ where: { id } });
  res.status(204).end();
});

export default r;
