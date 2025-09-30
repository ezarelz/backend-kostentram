// src/utils/zod.ts
import { z, type ZodError } from 'zod';

/** Schema create iklan – konsisten dengan Prisma & Swagger */
export const createIklanSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  price: z.number().int().nonnegative(),
  published: z.boolean().optional().default(true),

  addressLine: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),

  areaSqm: z.number().int().nonnegative().optional(),
  rooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),

  facilities: z.array(z.string()).optional().default([]),
});
export type CreateIklanInput = z.infer<typeof createIklanSchema>;

/** Ubah ZodError → { formErrors, fieldErrors } tanpa .format()/.flatten() */
export function zodToFieldErrors(err: ZodError) {
  const formErrors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of err.issues) {
    // `issue` punya { path, message, code }. Kita pakai path[0] sbg nama field.
    const key = issue.path.length ? String(issue.path[0]) : null;
    if (key) {
      (fieldErrors[key] ??= []).push(issue.message);
    } else {
      formErrors.push(issue.message);
    }
  }

  return {
    message: 'Validation failed',
    formErrors,
    fieldErrors, // contoh: { title: ["String must contain..."], price: ["Number must be..."] }
  };
}
