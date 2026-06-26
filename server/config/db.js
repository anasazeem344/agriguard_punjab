import mongoose from 'mongoose';

const RETRY_DELAY_MS = 10000;

// Never crashes the process: if Atlas is briefly unreachable (e.g. a WiFi
// hiccup during a live demo), the server keeps running and the readiness
// guards in each controller respond with 503 instead of hanging or dying.
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    console.log(`Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000}s...`);
    setTimeout(connectDB, RETRY_DELAY_MS);
  }
};

export const isDbReady = () => mongoose.connection.readyState === 1;

export default connectDB;
