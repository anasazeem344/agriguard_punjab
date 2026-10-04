import mongoose from 'mongoose';

const pendingRegistrationSchema = new mongoose.Schema(
  {
    fullName:  { type: String, required: true, trim: true },
    phone:     { type: String, required: true, unique: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true, select: false },
    province:  { type: String, required: true },
    district:  { type: String, required: true },
    farmArea:  { type: Number, required: true },
    // Resolved from the admin code at registration time, copied onto the
    // real FarmerProfile once phone verification completes.
    linkedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    verificationChannel: {
      type: String,
      enum: ['whatsapp', 'email'],
      default: 'whatsapp'
    },

    phoneVerificationOtp:     { type: String,  select: false },
    phoneVerificationExpire:  { type: Date,    select: false },
    pendingVerificationToken: { type: String,  select: false },
    pendingVerificationExpire:{ type: Date,    select: false },
    otpAttempts:              { type: Number,  default: 0, select: false }
  },
  { timestamps: true }
);

// Background cleanup: auto-delete abandoned pending registrations after 30 min.
// The actual security gate is pendingVerificationExpire checked in code.
pendingRegistrationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 });

export default mongoose.model('PendingRegistration', pendingRegistrationSchema);
