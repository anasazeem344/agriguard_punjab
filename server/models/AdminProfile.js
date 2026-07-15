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
    trim: true,
    maxlength: [50, 'Access code cannot exceed 50 characters']
  }
});

const AdminProfile = mongoose.model('AdminProfile', adminProfileSchema);
export default AdminProfile;
