// One-time manual script to create the first (and normally only) superadmin
// account. Run with: node server/scripts/seedSuperadmin.js
//
// Reads SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD from server/.env. Refuses to
// run if a superadmin already exists, so it's safe to re-run by accident.
// TOTP enrollment (scanning the QR into an authenticator app) happens on
// first login at /ams/login, not here.
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { isValidEmail, isStrongPassword } from '../utils/validators.js';

dotenv.config();

const run = async () => {
  const { MONGO_URI, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;

  if (!MONGO_URI || MONGO_URI.includes('xxxx') || MONGO_URI.includes('example')) {
    console.error('FATAL: MONGO_URI is not set to a real database in server/.env — seeding requires a live DB.');
    process.exit(1);
  }
  if (!isValidEmail(SUPERADMIN_EMAIL)) {
    console.error('FATAL: SUPERADMIN_EMAIL is missing or invalid in server/.env.');
    process.exit(1);
  }
  if (!isStrongPassword(SUPERADMIN_PASSWORD)) {
    console.error('FATAL: SUPERADMIN_PASSWORD is missing or not strong enough (8+ chars, uppercase, lowercase, number, special char).');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const existing = await User.findOne({ role: 'superadmin' });
  if (existing) {
    console.error(`A superadmin already exists (${existing.email}). Refusing to create another. Exiting.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, salt);

  await User.create({
    fullName: 'Superadmin',
    email: SUPERADMIN_EMAIL.toLowerCase(),
    password: passwordHash,
    role: 'superadmin',
    status: 'active',
    isEmailVerified: true
    // totpEnabled defaults to false — first login at /ams/login routes into enrollment.
  });

  console.log(`Superadmin account created for ${SUPERADMIN_EMAIL.toLowerCase()}.`);
  console.log('Log in at /ams/login to complete authenticator (TOTP) enrollment.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Error seeding superadmin:', error);
  process.exit(1);
});
