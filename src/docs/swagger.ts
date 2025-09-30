// src/docs/swagger.ts
import swaggerUi, { SwaggerUiOptions } from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import type { Express } from 'express';
import path from 'path';
import fs from 'fs';

export function mountSwagger(app: Express) {
  // Pakai folder routes di build (dist) kalau ada, kalau tidak pakai src
  const prodRoutesDir = path.join(__dirname, '../routes');
  const apis = fs.existsSync(prodRoutesDir)
    ? [path.join(prodRoutesDir, '*.js')] // production (dist)
    : [path.join(__dirname, '../../src/routes/*.ts')]; // development (ts-node)

  const swaggerSpec = swaggerJSDoc({
    definition: {
      openapi: '3.0.0',
      info: { title: 'Kostentram API', version: '1.0.0' },
      // Relative base URL → otomatis mengikuti domain/host saat diakses
      servers: [{ url: '/' }],
      components: {
        securitySchemes: {
          BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
          AuthRegister: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 6 },
              name: { type: 'string', nullable: true },
            },
          },
          AuthLogin: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 6 },
            },
          },
          PasswordForgot: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { type: 'string', format: 'email' },
            },
          },
          PasswordReset: {
            type: 'object',
            required: ['token', 'newPassword'],
            properties: {
              token: { type: 'string' },
              newPassword: { type: 'string', minLength: 6 },
            },
          },
          IklanCreate: {
            type: 'object',
            required: ['title', 'body', 'price'],
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
              price: { type: 'integer', minimum: 0 },
              published: { type: 'boolean' },
              addressLine: { type: 'string', nullable: true },
              city: { type: 'string', nullable: true },
              province: { type: 'string', nullable: true },
              postalCode: { type: 'string', nullable: true },
              areaSqm: { type: 'integer', nullable: true },
              rooms: { type: 'integer', nullable: true },
              bathrooms: { type: 'integer', nullable: true },
              facilities: {
                type: 'array',
                items: { type: 'string' },
                nullable: true,
              },
            },
          },
          IklanUpdate: {
            allOf: [{ $ref: '#/components/schemas/IklanCreate' }],
          },
        },
      },
    },
    apis,
  });

  // Opsi resmi Swagger UI → hindari "no overload matches"
  const uiOptions: SwaggerUiOptions = {
    explorer: false,
    swaggerOptions: {
      persistAuthorization: true, // simpan Bearer token di UI
    },
  };

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, uiOptions));
}
