import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists' });
    }

    // Invalidate tokens issued before the last password change.
    if (user.passwordChangedAt) {
      const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAtSeconds) {
        return res.status(401).json({ message: 'Session expired because the password was changed. Please log in again.' });
      }
    }

    // Ensure the account is verified — a token issued to an unverified account
    // (which should not happen, but guards against future bugs) is rejected here.
    if (user.role === 'admin' && !user.isEmailVerified) {
      return res.status(403).json({ message: 'Account not verified. Please verify your email.' });
    }
    if (user.role === 'farmer' && !user.isPhoneVerified) {
      return res.status(403).json({ message: 'Account not verified. Please verify your phone number.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
};

// Middleware factory that restricts access to specific roles.
// Usage: router.get('/admin-only', protect, restrictTo('admin'), handler)
export const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action' });
  }
  next();
};
