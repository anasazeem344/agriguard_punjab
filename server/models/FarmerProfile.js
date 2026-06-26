import mongoose from 'mongoose';

const farmerProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  province: {
    type: String,
    required: [true, 'Province is required'],
    trim: true
  },
  district: {
    type: String,
    required: [true, 'District is required'],
    trim: true
  },
  farmArea: {
    type: Number,
    required: [true, 'Farm area is required'],
    min: [0.1, 'Farm area must be greater than 0']
  }
});

const FarmerProfile = mongoose.model('FarmerProfile', farmerProfileSchema);
export default FarmerProfile;
