import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

// Fail fast on missing secrets — silent fallbacks are how credentials leak.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('xxxx')) {
  console.error('FATAL: JWT_SECRET is not set in server/.env. Refusing to start.');
  process.exit(1);
}

if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('xxxx') && !process.env.MONGO_URI.includes('example')) {
  connectDB();
} else {
  console.log('----------------------------------------------------');
  console.log('WARNING: MongoDB URI is set to placeholder in server/.env.');
  console.log('The server will run in MOCK database mode for local UI testing.');
  console.log('To connect to a live MongoDB, update MONGO_URI in server/.env');
  console.log('----------------------------------------------------');
}

const app = express();

// Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
app.use(helmet());

// Restrict cross-origin requests to the configured client URL only.
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));

// Parse JSON bodies with a size cap (prevents memory-exhaustion via huge payloads).
app.use(express.json({ limit: '50kb' }));

// Strips any key starting with "$" or containing "." so user input can
// never be interpreted as a Mongo query operator (defense-in-depth behind
// the per-field type guards in each controller).
app.use(mongoSanitize());

// Mock DB fallback — only active when MONGO_URI is a placeholder.
app.use('/api/auth/register/*', (req, res, next) => {
  const isMockMode = !process.env.MONGO_URI || process.env.MONGO_URI.includes('xxxx') || process.env.MONGO_URI.includes('example');
  if (isMockMode) {
    console.log(`[MOCK DATABASE] Intercepted POST ${req.originalUrl}`);
    return setTimeout(() => {
      res.status(201).json({
        success: true,
        token: 'mock-jwt-token-for-local-demo-purposes',
        user: {
          id: 'mock-user-id-12345',
          fullName: req.body.fullName,
          email: req.body.email || null,
          phone: req.body.phone || null,
          role: req.originalUrl.includes('admin') ? 'admin' : 'farmer'
        },
        message: 'Mock registration successful (No live database connected)'
      });
    }, 800);
  }
  next();
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'running', database: mongoose.connection.readyState === 1 ? 'connected' : 'mocked' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
