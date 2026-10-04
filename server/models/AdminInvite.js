import mongoose from 'mongoose';

// One pending invite per email at a time — enforced by the unique index
// below. Deleted outright on accept/cancel (same "promote-then-delete"
// pattern as PendingRegistration), and self-expires via Mongo's TTL monitor
// otherwise.
const adminInviteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  // Assigned at invite time, carried onto AdminProfile when accepted.
  district: {
    type: String,
    trim: true,
    maxlength: 50
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedByName: {
    type: String,
    required: true,
    trim: true
  },
  tokenHash: {
    type: String,
    required: true,
    select: false
  },
  // Dedicated field (not createdAt) so resend can reset it in place.
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Deletes the document once expiresAt is in the past — re-evaluated by
// Mongo's background TTL sweep (~60s) against the field's current value, so
// resend's in-place update of expiresAt is picked up correctly.
adminInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AdminInvite = mongoose.model('AdminInvite', adminInviteSchema);
export default AdminInvite;
