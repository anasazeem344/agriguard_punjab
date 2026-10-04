import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AdminProfile from '../models/AdminProfile.js';
import FarmerProfile from '../models/FarmerProfile.js';
import { isDbReady } from '../config/db.js';
import { isNonEmptyString, isValidEmail, normalizePhone, isPositiveNumber, isStrongPassword } from '../utils/validators.js';
import { issueVerificationEmail } from '../utils/verificationEmail.js';


const dbUnavailableResponse = (res) =>
  res.status(503).json({ message: 'Database is temporarily unavailable. Please try again shortly.' });

// @desc    Get the logged-in user's profile (base user + role profile)
// @route   GET /api/users/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const user = req.user;
    let profileFields = {};
    if (user.role === 'admin') {
      const profile = await AdminProfile.findOne({ user: user._id });
      profileFields = { district: profile?.district, linkCode: profile?.linkCode };
    } else if (user.role === 'farmer') {
      const profile = await FarmerProfile.findOne({ user: user._id });
      profileFields = { province: profile?.province, district: profile?.district, farmArea: profile?.farmArea };
    } else if (user.role === 'superadmin') {
      profileFields = { totpEnrolledAt: user.totpEnrolledAt };
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        ...profileFields
      }
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Update the logged-in user's profile
// @route   PUT /api/users/me
// @access  Private
export const updateMe = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const user = req.user;
    const { fullName, email, phone, province, district, farmArea } = req.body;

    if (fullName !== undefined) {
      if (!isNonEmptyString(fullName)) {
        return res.status(400).json({ message: 'Full name cannot be empty' });
      }
      user.fullName = fullName;
    }

    if (email !== undefined && email.toLowerCase() !== (user.email || '').toLowerCase()) {
      return res.status(400).json({ message: 'Email address cannot be updated after registration' });
    }

    // Phone is the farmer's verified identity — it cannot be changed after registration.
    if (user.role === 'farmer' && phone !== undefined) {
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ message: 'Please enter a valid Pakistani mobile number' });
      }
      if (normalizedPhone !== user.phone) {
        return res.status(400).json({ message: 'Phone number cannot be changed after registration' });
      }
    }

    await user.save();

    if (user.role === 'farmer' && (province !== undefined || district !== undefined || farmArea !== undefined)) {
      const profile = await FarmerProfile.findOne({ user: user._id });
      if (profile) {
        if (province !== undefined) {
          if (!isNonEmptyString(province)) return res.status(400).json({ message: 'Province cannot be empty' });
          profile.province = province;
        }
        if (district !== undefined) {
          if (!isNonEmptyString(district)) return res.status(400).json({ message: 'District cannot be empty' });
          profile.district = district;
        }
        if (farmArea !== undefined) {
          if (!isPositiveNumber(farmArea)) return res.status(400).json({ message: 'Farm area must be a positive number' });
          profile.farmArea = Number(farmArea);
        }
        await profile.save();
      }
    }

    res.status(200).json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error in updateMe:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Change password for the logged-in user (requires current password)
// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { currentPassword, newPassword } = req.body;

    if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword)) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: 'New password must be strong (8+ chars, uppercase, lowercase, number, special char)' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordChangedAt = new Date();
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};
