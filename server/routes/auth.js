import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import WorkerProfile from '../models/WorkerProfile.js';
import BusinessProfile from '../models/BusinessProfile.js';
import { checkWorkerFlags } from '../services/flagService.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { normalizePhone, sendSMS } from '../services/smsService.js';
import { SITE_NAME } from '../config/site.js';

const router = express.Router();

function generateTokens(user) {
  const payload = { id: user._id, name: user.name, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['client', 'worker', 'business']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, data: null, message: errors.array()[0].msg });
    }

    const { name, email, password, role, phone, category, experienceYears, dayRateMin, dayRateMax, languages, businessName, businessType } = req.body;

    const normalEmail = email ? email.toLowerCase().trim() : null;
    const normalPhone = phone ? (normalizePhone(phone) || phone.replace(/\D/g, '')) : null;

    if (role !== 'worker' && !normalEmail) {
      return res.status(400).json({ success: false, data: null, message: 'Email is required.' });
    }
    if (!normalEmail && !normalPhone) {
      return res.status(400).json({ success: false, data: null, message: 'Provide at least an email or phone number.' });
    }

    try {
      if (normalEmail) {
        const byEmail = await User.findOne({ email: normalEmail });
        if (byEmail) return res.status(400).json({ success: false, data: null, message: 'Email already registered.' });
      }
      if (normalPhone) {
        const byPhone = await User.findOne({ phone: normalPhone });
        if (byPhone) return res.status(400).json({ success: false, data: null, message: 'Phone number already registered.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email: normalEmail || undefined,
        phone: normalPhone || undefined,
        passwordHash,
        role,
      });

      if (role === 'worker') {
        await WorkerProfile.create({
          userId: user._id,
          workerName: name,
          category: category || 'cleaner',
          experienceYears: experienceYears || 0,
          dayRateMin: dayRateMin || 0,
          dayRateMax: dayRateMax || 0,
          languages: languages || ['English'],
        });
        await checkWorkerFlags(user._id);
      }

      if (role === 'business') {
        await BusinessProfile.create({
          userId: user._id,
          businessName: businessName || name,
          businessType: businessType || 'other',
        });
      }

      const { accessToken, refreshToken } = generateTokens(user);
      res.status(201).json({ success: true, data: { user, accessToken, refreshToken }, message: 'Registered successfully' });
    } catch (err) {
      res.status(500).json({ success: false, data: null, message: err.message });
    }
  }
);

router.post('/login', async (req, res) => {
  const { email: identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ success: false, data: null, message: 'Email/phone and password are required.' });
  }

  try {
    let user = null;
    const trimmed = identifier.trim();

    const looksLikePhone = /^[+\d\s()-]{7,15}$/.test(trimmed) && !/^[^@]+@[^@]+$/.test(trimmed);

    if (looksLikePhone) {
      const normalised = normalizePhone(trimmed) || trimmed.replace(/\D/g, '');
      user = await User.findOne({ phone: normalised });
    } else {
      user = await User.findOne({ email: trimmed.toLowerCase() });
    }

    if (!user) {
      return res.status(401).json({ success: false, data: null, message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, data: null, message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    res.json({ success: true, data: { user, accessToken, refreshToken }, message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, data: null, message: 'No refresh token' });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, data: null, message: 'User not found' });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken }, message: 'Token refreshed' });
  } catch {
    res.status(401).json({ success: false, data: null, message: 'Invalid refresh token' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true, data: null, message: 'Logged out' });
});

router.post('/forgot-password', async (req, res) => {
  const { email: identifier } = req.body;
  if (!identifier) return res.status(400).json({ success: false, message: 'Email or phone number is required.' });

  const GENERIC_OK = 'If that account is registered, you will receive a reset link shortly.';

  try {
    const trimmed = identifier.trim();
    const looksLikePhone = /^[+\d\s()-]{7,15}$/.test(trimmed) && !/^[^@]+@[^@]+$/.test(trimmed);

    let user = null;
    if (looksLikePhone) {
      const normalised = normalizePhone(trimmed) || trimmed.replace(/\D/g, '');
      user = await User.findOne({ phone: normalised });
    } else {
      user = await User.findOne({ email: trimmed.toLowerCase() });
    }

    if (!user) return res.json({ success: true, message: GENERIC_OK });

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const hashed    = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    user.resetPasswordToken  = hashed;
    user.resetPasswordExpiry = expiresAt;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

    if (user.email) {
      await sendPasswordResetEmail(user.email, resetUrl);
    } else if (user.phone) {
      sendSMS(
        user.phone,
        `${SITE_NAME}: Reset your password: ${resetUrl} - Link expires in 1 hour. Ignore if you did not request this.`
      ).catch(() => {});
    }

    res.json({ success: true, message: GENERIC_OK });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token and new password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  try {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken:  hashed,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }

    user.passwordHash        = await bcrypt.hash(password, 10);
    user.resetPasswordToken  = null;
    user.resetPasswordExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

export default router;
