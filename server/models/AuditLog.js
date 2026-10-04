import mongoose from 'mongoose';

// No enum on `kind` and no pre-rendered sentence stored here — the frontend
// renders the localized sentence from `kind` + `actorName` via its own i18n
// dictionary, so the log stays translatable as new kinds are added later.
const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actorName: {
    type: String,
    required: true,
    trim: true
  },
  kind: {
    type: String,
    required: true,
    trim: true,
    maxlength: [30, 'kind cannot exceed 30 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
