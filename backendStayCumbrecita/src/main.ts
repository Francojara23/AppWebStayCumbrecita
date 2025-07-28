// Polyfill para crypto en Node.js 18+ - DEBE estar ANTES de cualquier importación
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { useContainer } from "class-validator";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { IoAdapter } from "@nestjs/platform-socket.io";
import * as cookieParser from "cookie-parser";
import "reflect-metadata";

async function bootstrap() {
  // ────────────────────────────────────────────────
  // 1. Inicialización de la app
  // ────────────────────────────────────────────────
  const app = await NestFactory.create(AppModule);

  // ────────────────────────────────────────────────
  // 2. Configuración de middleware
  // ────────────────────────────────────────────────
  // Cookie parser para leer cookies HTTP
  app.use(cookieParser());

  // ────────────────────────────────────────────────
  // 3. Configuración de CORS
  // ────────────────────────────────────────────────
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://frontend:3000'  // Para conexiones desde el contenedor frontend
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ────────────────────────────────────────────────
  // 4. Validaciones globales
  // ────────────────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({ forbidUnknownValues: false }));
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // ────────────────────────────────────────────────
  // 5. Swagger
  // ────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle("API Cumbrecita")
    .setDescription("Documentación de la API con Swagger")
    .setVersion("1.0")
    .addBearerAuth(
      { 
        type: "http", 
        scheme: "bearer", 
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header"
      },
      "bearer",
    )
    .build();

  SwaggerModule.setup(
    "api",
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  // ────────────────────────────────────────────────
  // 6. WebSockets
  // ────────────────────────────────────────────────
  app.useWebSocketAdapter(new IoAdapter(app));

  // ────────────────────────────────────────────────
  // 7. Lectura de variables de entorno
  // ────────────────────────────────────────────────
  const PORT = parseInt(process.env.PORT ?? "5001", 10); // Cambiar puerto para evitar conflicto con AirTunes
  const HOST = process.env.HOST ?? "localhost"; // Cambiar a localhost para que coincida con el frontend

  // ────────────────────────────────────────────────
  // 8. Inicio del servidor
  // ────────────────────────────────────────────────
  await app.listen(PORT, HOST);
  console.log(`🚀  Aplicación iniciada en http://${HOST}:${PORT}`);
}

bootstrap().catch((err) =>
  console.error("Error during application bootstrap:", err),
);
