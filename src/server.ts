// src/server.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { mountSwagger } from './docs/swagger';
import authRoutes from './routes/auth';
import iklanRoutes from './routes/iklan';

const app = express();

//  CORS whitelist FE dari env
const allowOrigin = process.env.FRONTEND_URL || '*';
app.use(
  cors({
    origin: allowOrigin === '*' ? '*' : [allowOrigin],
  })
);

app.use(express.json());

/** Health check */
app.get('/health', (_req, res) => res.json({ ok: true }));

// Swagger docs
mountSwagger(app);

// Routes
app.use('/auth', authRoutes);
app.use('/iklan', iklanRoutes);

// ✅ Port dari env (Railway auto set)
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(
    `✅ API running at http://localhost:${port}\n📖 Docs available at http://localhost:${port}/docs`
  );
});
