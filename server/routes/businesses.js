import express from 'express';
import mongoose from 'mongoose';
import BusinessProfile from '../models/BusinessProfile.js';
import User from '../models/User.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { upload, fileUrl } from '../middleware/upload.js';
import { deleteByUrl } from '../services/cloudinaryService.js';
import { generateSlug } from '../utils/slugify.js';

const router = express.Router();

// ── Public: list businesses ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { district, type, search, featured, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true, isSuspended: false, onboardingComplete: true };

    if (district) filter.district = district;
    if (type)     filter.businessType = type;
    if (featured) filter.featuredUntil = { $gt: new Date() };

    let query = BusinessProfile.find(filter)
      .populate('userId', 'name profilePhoto location')
      .sort({ featuredUntil: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const [businesses, total] = await Promise.all([
      query,
      BusinessProfile.countDocuments(filter),
    ]);

    res.json({ success: true, data: { businesses, total, page: Number(page), pages: Math.ceil(total / limit) }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Public: single business profile ─────────────────────────────────────────
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const param = req.params.slug;
    const isObjectId = mongoose.Types.ObjectId.isValid(param) && param.length === 24;
    const query = isObjectId
      ? { $or: [{ slug: param }, { userId: param }] }
      : { slug: param };

    const profile = await BusinessProfile.findOne(query)
      .populate('userId', 'name profilePhoto location socialLinks');
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Business not found' });

    const data = profile.toObject();
    if (!req.user) {
      data.phone    = undefined;
      data.whatsapp = undefined;
      if (data.userId) data.userId.socialLinks = undefined;
    }

    res.json({ success: true, data: { ...data, isAuthenticated: !!req.user }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Business dashboard ───────────────────────────────────────────────────────
router.get('/dashboard/me', authenticateToken, requireRole('business'), async (req, res) => {
  try {
    const [profile, user] = await Promise.all([
      BusinessProfile.findOne({ userId: req.user.id }),
      User.findById(req.user.id).select('-passwordHash'),
    ]);
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Profile not found' });
    res.json({ success: true, data: { profile, user }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Update business profile ──────────────────────────────────────────────────
router.put('/profile/me', authenticateToken, requireRole('business'),
  upload.fields([{ name: 'coverPhoto', maxCount: 1 }, { name: 'photos', maxCount: 12 }]),
  async (req, res) => {
    try {
      const {
        businessName, businessType, description, tagline,
        district, address, phone, whatsapp, website,
        openingHours, removePhotos,
      } = req.body;

      const update = {};
      if (businessName)  update.businessName  = businessName.trim();
      if (businessType)  update.businessType  = businessType;
      if (description !== undefined) update.description = description.trim();
      if (tagline !== undefined)     update.tagline     = tagline.trim();
      if (district)  update.district  = district;
      if (address !== undefined)  update.address  = address;
      if (phone !== undefined)    update.phone    = phone;
      if (whatsapp !== undefined) update.whatsapp = whatsapp;
      if (website !== undefined)  update.website  = website;
      if (openingHours) update.openingHours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;

      if (req.files?.coverPhoto?.[0]) {
        update.coverPhoto = fileUrl(req.files.coverPhoto[0]);
      }

      const profile = await BusinessProfile.findOne({ userId: req.user.id });

      let currentPhotos = profile.photos || [];
      if (removePhotos) {
        const toRemove = Array.isArray(removePhotos) ? removePhotos : [removePhotos];
        toRemove.forEach((url) => deleteByUrl(url).catch(() => {}));
        currentPhotos = currentPhotos.filter((p) => !toRemove.includes(p));
      }
      if (req.files?.photos?.length) {
        const newPhotos = req.files.photos.map(fileUrl);
        currentPhotos = [...currentPhotos, ...newPhotos].slice(0, 12);
      }
      update.photos = currentPhotos;

      const updated = await BusinessProfile.findOneAndUpdate(
        { userId: req.user.id },
        update,
        { new: true }
      );
      res.json({ success: true, data: updated, message: 'Profile updated' });
    } catch (err) {
      res.status(500).json({ success: false, data: null, message: err.message });
    }
  }
);

// ── Complete onboarding ──────────────────────────────────────────────────────
router.post('/onboarding/complete', authenticateToken, requireRole('business'), async (req, res) => {
  try {
    const existing = await BusinessProfile.findOne({ userId: req.user.id }).select('slug businessName businessType district');
    const update = { onboardingComplete: true };

    if (!existing?.slug) {
      update.slug = generateSlug(
        existing?.businessName || '',
        existing?.businessType?.replace(/_/g, ' ') || '',
        existing?.district || ''
      );
    }

    const profile = await BusinessProfile.findOneAndUpdate(
      { userId: req.user.id },
      update,
      { new: true }
    );
    res.json({ success: true, data: profile, message: 'Onboarding complete' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Services CRUD ────────────────────────────────────────────────────────────
router.post('/services', authenticateToken, requireRole('business'), async (req, res) => {
  try {
    const { name, description, priceMin, priceMax } = req.body;
    if (!name) return res.status(400).json({ success: false, data: null, message: 'Service name required' });

    const profile = await BusinessProfile.findOne({ userId: req.user.id });
    if (profile.services.length >= 20) {
      return res.status(400).json({ success: false, data: null, message: 'Maximum 20 services allowed' });
    }

    profile.services.push({ name: name.trim(), description: description?.trim(), priceMin: priceMin ? Number(priceMin) : undefined, priceMax: priceMax ? Number(priceMax) : undefined });
    await profile.save();
    res.json({ success: true, data: profile.services, message: 'Service added' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.put('/services/:serviceId', authenticateToken, requireRole('business'), async (req, res) => {
  try {
    const { name, description, priceMin, priceMax } = req.body;
    const profile = await BusinessProfile.findOne({ userId: req.user.id });
    const svc = profile.services.id(req.params.serviceId);
    if (!svc) return res.status(404).json({ success: false, data: null, message: 'Service not found' });

    if (name)        svc.name        = name.trim();
    if (description !== undefined) svc.description = description.trim();
    if (priceMin !== undefined) svc.priceMin = priceMin ? Number(priceMin) : undefined;
    if (priceMax !== undefined) svc.priceMax = priceMax ? Number(priceMax) : undefined;
    await profile.save();
    res.json({ success: true, data: profile.services, message: 'Service updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

router.delete('/services/:serviceId', authenticateToken, requireRole('business'), async (req, res) => {
  try {
    const profile = await BusinessProfile.findOne({ userId: req.user.id });
    profile.services = profile.services.filter((s) => s._id.toString() !== req.params.serviceId);
    await profile.save();
    res.json({ success: true, data: profile.services, message: 'Service removed' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

export default router;
