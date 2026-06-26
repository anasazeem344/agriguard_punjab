import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB Atlas (if URI is provided and valid)
// If MONGO_URI contains xxxx or is placeholder, we catch the connect error to prevent app crash
if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('xxxx') && !process.env.MONGO_URI.includes('example')) {
  connectDB();
} else {
  console.log('----------------------------------------------------');
  console.log('WARNING: MongoDB URI is set to placeholder in server/.env.');
  console.log('The server will run in MOCK database mode for local UI testing.');
  console.log('To connect to a live MongoDB, update MONGO_URI in:');
  console.log('server/.env');
  console.log('----------------------------------------------------');
}

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
// Strips any request key starting with "$" or containing "." (e.g. {"$gt": ""}),
// so user input can never be interpreted as a Mongo query operator.
app.use(mongoSanitize());

// Mock DB fallback middleware for local sandbox testing
// If the DB connection is not initialized, we simulate success for UI demo
app.use('/api/auth/register/*', (req, res, next) => {
  const isMockMode = !process.env.MONGO_URI || process.env.MONGO_URI.includes('xxxx') || process.env.MONGO_URI.includes('example');
  if (isMockMode) {
    console.log(`[MOCK DATABASE] Intercepted POST ${req.originalUrl}`);
    console.log('Payload:', req.body);
    // Simulate server delay
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

// Basic sanity API status check
app.get('/api/status', (req, res) => {
  res.json({ status: 'running', database: mongoose.connection.readyState === 1 ? 'connected' : 'mocked' });
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
