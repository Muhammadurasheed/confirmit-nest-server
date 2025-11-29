import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as compression from 'compression';
import helmet from 'helmet';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

async function bootstrap() {
  // Load .env early
  dotenv.config();

  // ✅ Initialize Firebase safely
  if (!admin.apps.length) {
    try {
      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL
      ) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          }),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
          storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
        });
        console.log('🔥 Firebase initialized at bootstrap');
      } else {
        console.warn('⚠️ Firebase credentials missing, skipping initialization');
      }
    } catch (err) {
      console.error('❌ Firebase initialization failed:', err.message);
    }
  }

  const app = await NestFactory.create(AppModule);

  // ✅ Security & performance
  app.use(helmet());
  app.use(compression());

  // ✅ CORS setup - Production & Development (FAANG-grade flexibility)
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:5173',
    'https://confirmitx.vercel.app',
    'https://confirmit-nest-backend.vercel.app',
    'https://4f6ae8b3-0986-4c25-aa0e-a6fe3f16763a.lovableproject.com',
  ];

  // Add any additional origins from environment
  if (process.env.CORS_ORIGIN) {
    const envOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
    allowedOrigins.push(...envOrigins);
  }

  // Log CORS configuration for debugging
  console.log('🌍 CORS Allowed Origins:', allowedOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Api-Key'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // Cache preflight for 24 hours
  });

  // ✅ API prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api');

  // ✅ Validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ✅ Swagger setup (optional in production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ConfirmIT API')
      .setDescription('AI-powered trust verification API for African commerce')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('receipts', 'Receipt verification endpoints')
      .addTag('accounts', 'Account checking endpoints')
      .addTag('business', 'Business directory endpoints')
      .addTag('hedera', 'Blockchain integration endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ✅ Render provides PORT
  const port = process.env.PORT || 8080;
  await app.listen(port);

  console.log(`
  🚀 ConfirmIT Backend API is running!
  📡 Server: http://localhost:${port}
  ${process.env.NODE_ENV !== 'production' ? `📚 API Docs: http://localhost:${port}/api/docs` : ''}
  🔥 Environment: ${process.env.NODE_ENV || 'development'}
  `);
}

bootstrap();
