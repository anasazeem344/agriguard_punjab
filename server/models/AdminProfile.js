import mongoose from 'mongoose';

const adminProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Assigned via AMS when an admin is invited. Optional so it doesn't break
  // profiles created before this field existed; admins without one just
  // don't contribute to the "Districts Covered" stat yet.
  district: {
    type: String,
    trim: true,
    maxlength: [50, 'District name cannot exceed 50 characters']
  },
  // Display-only identifier, generated at account-creation time. Admins
  // created before this field existed just don't have one (sparse).
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: 20
  },
  // Shared with farmers out-of-band so they can link their registration to
  // this specific admin. Distinct prefix from employeeId so the two aren't
  // confused anywhere they appear together.
  linkCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: 20
  }
});

const AdminProfile = mongoose.model('AdminProfile', adminProfileSchema);
export default AdminProfile;
