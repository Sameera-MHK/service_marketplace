import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload, fileUrl } from '../middleware/upload.js';
import { normalizePhone } from '../services/smsService.js';

const router = express.Router();

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, data: null, message: 'User not found' });
    res.json({ success: true, data: user, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/me', authenticateToken, upload.single('profilePhoto'), async (req, res) => {
  try {
    const updates = {};
    const { name, phone, district, province, socialLinks } = req.body;
    if (name) updates.name = name;
    if (phone) updates.phone = normalizePhone(phone) || phone;
    if (district || province) updates.location = { district, province };
    if (req.file) updates.profilePhoto = fileUrl(req.file);

    if (socialLinks) {
      const parsed = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
      const ALLOWED = ['facebook','instagram','youtube','tiktok','linkedin','whatsapp','website'];
      updates.socialLinks = {};
      ALLOWED.forEach((k) => {
        if (parsed[k] !== undefined) updates.socialLinks[k] = parsed[k].trim();
      });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-passwordHash');
    res.json({ success: true, data: user, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

export default router;
