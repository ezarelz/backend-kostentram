// routes/auth.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { signJwt } from '../utils/jwt';
import { zodToFieldErrors } from '../utils/zod';

const prisma = new PrismaClient();
const r = Router();

// ===== Schemas =====
const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

const ForgotSchema = z.object({
  email: z.email(),
});

const ResetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6),
});

// helper: build FE reset link (fallback testing mode)
const FE = process.env.FRONTEND_URL?.replace(/\/$/, ''); // trim trailing slash
const buildResetLink = (token: string) =>
  FE ? `${FE}/reset-password?token=${token}` : null;

// ===== Routes =====

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register New User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AuthRegister' }
 *     responses:
 *       201: { description: Registered }
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 */
r.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json(zodToFieldErrors(parsed.error));

  const { email, password, name } = parsed.data;
  const hashed = await bcrypt.hash(password, 10);

  try {
    const u = await prisma.user.create({
      data: { email, password: hashed, name },
    });
    res.status(201).json({ id: u.id, email: u.email });
  } catch {
    res.status(409).json({ error: 'Email exists' });
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and create token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AuthLogin' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *       401: { description: Invalid credentials }
 *       400: { description: Validation error }
 */
r.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json(zodToFieldErrors(parsed.error));

  const { email, password } = parsed.data;
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(password, u.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signJwt({ userId: u.id, email: u.email });
  res.json({ token });
});

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset (testing disregard expiry)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PasswordForgot' }
 *     responses:
 *       200: { description: If email exists, a reset link is generated }
 *       400: { description: Validation error }
 */
r.post('/forgot-password', async (req, res) => {
  const parsed = ForgotSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json(zodToFieldErrors(parsed.error));

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Untuk keamanan, selalu balas 200 agar tidak bocorkan apakah email terdaftar
  if (!user)
    return res.json({
      message: 'If the email exists, a reset link will be sent',
    });

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.passwordReset.create({ data: { token, userId: user.id } }); // expiresAt null (testing), used=false

  const resetLink = buildResetLink(token);
  if (resetLink) {
    // production mode: FE URL tersedia
    return res.json({ message: 'Reset link generated' });
  }
  // testing mode: FE belum ada, balikan token supaya bisa di-POST ke /auth/reset-password
  return res.json({
    message: 'Reset link generated (testing mode)',
    token,
    hint: 'POST to /auth/reset-password with { token, newPassword }',
  });
});

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with token (testing disregard expiry)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PasswordReset' }
 *     responses:
 *       200: { description: Password updated }
 *       400: { description: Invalid or used token }
 */
r.post('/reset-password', async (req, res) => {
  const parsed = ResetSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json(zodToFieldErrors(parsed.error));

  const { token, newPassword } = parsed.data;
  const record = await prisma.passwordReset.findUnique({ where: { token } });

  if (!record || record.used) {
    return res.status(400).json({ error: 'Invalid or already used token' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: record.userId },
    data: { password: hashed },
  });
  await prisma.passwordReset.update({
    where: { id: record.id },
    data: { used: true },
  });

  res.json({ message: 'Password updated successfully (testing mode)' });
});

export default r;
