import mongoose from 'mongoose';

const adminProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  accessCode: {
    type: String,
    required: [true, 'Access code is required'],
    trim: true
  }
});

const AdminProfile = mongoose.model('AdminProfile', adminProfileSchema);
export default AdminProfile;
