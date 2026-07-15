import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null/undefined values for farmers who don't register with email
    lowercase: true,
    trim: true,
    maxlength: [100, 'Email cannot exceed 100 characters'],
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null/undefined values for admins who don't register with phone
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    maxlength: [128, 'Password cannot exceed 128 characters']
  },
  role: {
    type: String,
    enum: ['farmer', 'admin'],
    required: true
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpire: {
    type: Date,
    select: false
  },
  // Farmers verify via WhatsApp OTP instead of email (admins use email above).
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerificationOtp: {
    type: String,
    select: false
  },
  phoneVerificationExpire: {
    type: Date,
    select: false
  },
  // Bumped whenever the password changes; any JWT issued before this
  // instant is rejected by the auth middleware even if it hasn't expired yet.
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
export default User;
