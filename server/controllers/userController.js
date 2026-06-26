import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AdminProfile from '../models/AdminProfile.js';
import FarmerProfile from '../models/FarmerProfile.js';
import { isDbReady } from '../config/db.js';
import { isNonEmptyString, isValidEmail, normalizePhone, isPositiveNumber } from '../utils/validators.js';
import { issueVerificationEmail } from '../utils/verificationEmail.js';
import { issuePhoneOtp } from '../utils/phoneVerification.js';

const dbUnavailableResponse = (res) =>
  res.status(503).json({ message: 'Database is temporarily unavailable. Please try again shortly.' });

// @desc    Get the logged-in user's profile (base user + role profile)
// @route   GET /api/users/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const user = req.user;
    const profile = user.role === 'admin'
      ? await AdminProfile.findOne({ user: user._id })
      : await FarmerProfile.findOne({ user: user._id });

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
        ...(user.role === 'admin'
          ? { accessCode: profile?.accessCode }
          : { province: profile?.province, district: profile?.district, farmArea: profile?.farmArea })
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

    // Admins verify via email; changing it means the new address hasn't been
    // proven yet, so it must be re-verified before the next login.
    let emailChanged = false;
    if (user.role === 'admin' && email !== undefined && email.toLowerCase() !== (user.email || '').toLowerCase()) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
      }
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ message: 'Another account already uses this email' });
      }
      user.email = email;
      user.isEmailVerified = false;
      emailChanged = true;
    } else if (email !== undefined && isValidEmail(email)) {
      // Farmers can still keep an informational email on file (no verification tied to it).
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ message: 'Another account already uses this email' });
      }
      user.email = email;
    }

    // Farmers verify via phone; changing it means the new number hasn't
    // been proven yet, so it must be re-verified before the next login.
    let phoneChanged = false;
    if (user.role === 'farmer' && phone !== undefined) {
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({ message: 'Please enter a valid Pakistani mobile number' });
      }
      if (normalizedPhone !== user.phone) {
        const existing = await User.findOne({ phone: normalizedPhone, _id: { $ne: user._id } });
        if (existing) {
          return res.status(400).json({ message: 'Another account already uses this phone number' });
        }
        user.phone = normalizedPhone;
        user.isPhoneVerified = false;
        phoneChanged = true;
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

    if (emailChanged) {
      const { mocked, verifyUrl } = await issueVerificationEmail(user);
      return res.status(200).json({
        success: true,
        message: 'Profile updated. Please verify your new email address before your next login.',
        requiresVerification: true,
        verificationChannel: 'email',
        ...(mocked && { devVerificationUrl: verifyUrl })
      });
    }

    if (phoneChanged) {
      const { configured, otp, deepLink, whatsappNumber } = await issuePhoneOtp(user);
      return res.status(200).json({
        success: true,
        message: 'Profile updated. Please verify your new phone number via WhatsApp before your next login.',
        requiresVerification: true,
        verificationChannel: 'phone',
        deepLink,
        whatsappNumber,
        ...(!configured && { devOtp: otp })
      });
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
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
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
