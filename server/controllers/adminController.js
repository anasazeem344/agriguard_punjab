import mongoose from 'mongoose';
import User from '../models/User.js';
import FarmerProfile from '../models/FarmerProfile.js';
import { isDbReady } from '../config/db.js';

const dbUnavailableResponse = (res) =>
  res.status(503).json({ message: 'Database is temporarily unavailable. Please try again shortly.' });

// @desc    List farmers linked to the logged-in admin (via their admin code
//          at registration). Sensors/last-activity have no real data source
//          yet, so they're explicit placeholders, not fabricated values.
// @route   GET /api/admin/farmers?page=&limit=
// @access  Private (admin)
export const listMyFarmers = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

    const [profiles, total] = await Promise.all([
      FarmerProfile.find({ linkedAdmin: req.user._id })
        .populate('user', 'fullName status')
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      FarmerProfile.countDocuments({ linkedAdmin: req.user._id })
    ]);

    const farmers = profiles.map((p) => ({
      id: p.user?._id,
      fullName: p.user?.fullName || 'Unknown',
      location: `${p.district}, ${p.province}`,
      farmArea: p.farmArea,
      status: p.user?.status === 'suspended' ? 'Suspended' : 'Active',
      sensors: 0,
      lastActivity: null
    }));

    res.status(200).json({ success: true, farmers, total, page, limit, hasMore: page * limit < total });
  } catch (error) {
    console.error('Error in listMyFarmers:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// Confirms the target farmer is actually linked to this admin before any
// mutation — a role check alone isn't enough, since any admin could
// otherwise act on any farmer by guessing a user id.
const findOwnedFarmer = (farmerId, adminId) => FarmerProfile.findOne({ user: farmerId, linkedAdmin: adminId });

// @desc    Suspend a farmer linked to this admin
// @route   PATCH /api/admin/farmers/:id/suspend
// @access  Private (admin)
export const suspendFarmer = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const owned = await findOwnedFarmer(req.params.id, req.user._id);
    if (!owned) return res.status(404).json({ message: 'Farmer not found' });

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'farmer', status: 'active' },
      { $set: { status: 'suspended' } },
      { new: true }
    );
    if (!user) return res.status(409).json({ message: 'Farmer not found or already suspended.' });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in suspendFarmer:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Reactivate a suspended farmer linked to this admin
// @route   PATCH /api/admin/farmers/:id/reactivate
// @access  Private (admin)
export const reactivateFarmer = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const owned = await findOwnedFarmer(req.params.id, req.user._id);
    if (!owned) return res.status(404).json({ message: 'Farmer not found' });

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'farmer', status: 'suspended' },
      { $set: { status: 'active' } },
      { new: true }
    );
    if (!user) return res.status(409).json({ message: 'Farmer not found or not suspended.' });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in reactivateFarmer:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Permanently remove a farmer linked to this admin
// @route   DELETE /api/admin/farmers/:id
// @access  Private (admin)
export const removeFarmer = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const owned = await findOwnedFarmer(req.params.id, req.user._id);
    if (!owned) return res.status(404).json({ message: 'Farmer not found' });

    const session = await mongoose.startSession();
    let removed;
    try {
      await session.withTransaction(async () => {
        removed = await User.findOneAndDelete({ _id: req.params.id, role: 'farmer' }, { session });
        if (removed) {
          await FarmerProfile.deleteOne({ user: removed._id }, { session });
        }
      });
    } finally {
      await session.endSession();
    }

    if (!removed) return res.status(404).json({ message: 'Farmer not found' });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in removeFarmer:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};
