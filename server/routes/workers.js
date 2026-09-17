import express from 'express';
import mongoose from 'mongoose';
import WorkerProfile from '../models/WorkerProfile.js';
import WorkerOffer from '../models/WorkerOffer.js';
import FeaturedRequest from '../models/FeaturedRequest.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { upload, fileUrl } from '../middleware/upload.js';
import { deleteByUrl } from '../services/cloudinaryService.js';
import { checkWorkerFlags } from '../services/flagService.js';
import { recalculateScore } from '../services/scoreService.js';
import { generateSlug } from '../utils/slugify.js';
import { normalizePhone } from '../services/smsService.js';

const router = express.Router();

function isPaidPlan(profile) {
  if (!profile) return false;
  if (profile.subscriptionPlan === 'free') return false;
  if (profile.subscriptionExpiry && new Date(profile.subscriptionExpiry) < new Date()) return false;
  return true;
}

// GET /featured — public featured workers (active, not expired)
router.get('/featured', async (req, res) => {
  try {
    const now = new Date();
    const profiles = await WorkerProfile.find({
      isActive: true,
      isSuspended: false,
      featuredUntil: { $gt: now },
    })
      .sort({ skillScore: -1 })
      .limit(8)
      .populate('userId', '-passwordHash -idPhotoFront -idPhotoBack -idNumber');

    res.json({ success: true, data: profiles, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET / — public worker listing (paginated, supports ?q= full-text search)
router.get('/', async (req, res) => {
  try {
    const { q, category, district, minScore, page = 1, limit = 20 } = req.query;

    const PAGE  = Math.max(1, parseInt(page, 10) || 1);
    const LIMIT = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const SKIP  = (PAGE - 1) * LIMIT;

    const baseFilter = { isActive: true, isSuspended: false, acceptingWork: true };
    if (category) baseFilter.category = category;
    if (minScore) baseFilter.skillScore = { $gte: Number(minScore) };

    if (q && q.trim()) {
      const textFilter = { ...baseFilter, $text: { $search: q.trim() } };

      const [profiles, total] = await Promise.all([
        WorkerProfile.find(textFilter, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' }, skillScore: -1 })
          .skip(SKIP)
          .limit(LIMIT)
          .populate('userId', '-passwordHash -idPhotoFront -idPhotoBack'),
        WorkerProfile.countDocuments(textFilter),
      ]);

      const filtered = district
        ? profiles.filter(
            (p) => p.serviceDistricts?.includes(district) || p.userId?.location?.district === district
          )
        : profiles;

      return res.json({
        success: true,
        data: filtered,
        pagination: {
          page: PAGE, limit: LIMIT, total,
          pages: Math.ceil(total / LIMIT),
          hasNext: PAGE * LIMIT < total,
          hasPrev: PAGE > 1,
        },
        message: 'OK',
      });
    }

    if (district) {
      baseFilter.$or = [{ serviceDistricts: district }];
    }

    const [total, profiles] = await Promise.all([
      WorkerProfile.countDocuments(baseFilter),
      WorkerProfile.find(baseFilter)
        .sort({ skillScore: -1 })
        .skip(SKIP)
        .limit(LIMIT)
        .populate('userId', '-passwordHash -idPhotoFront -idPhotoBack'),
    ]);

    const filtered = district
      ? profiles.filter(
          (p) => p.serviceDistricts?.includes(district) || p.userId?.location?.district === district
        )
      : profiles;

    res.json({
      success: true,
      data: filtered,
      pagination: {
        page: PAGE, limit: LIMIT, total,
        pages: Math.ceil(total / LIMIT),
        hasNext: PAGE * LIMIT < total,
        hasPrev: PAGE > 1,
      },
      message: 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /dashboard — worker's own full data
router.get('/dashboard', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const [profile, user, jobs] = await Promise.all([
      WorkerProfile.findOne({ userId: req.user.id }),
      User.findById(req.user.id).select('-passwordHash'),
      Job.find({ workerId: req.user.id }).populate('clientId', 'name profilePhoto'),
    ]);

    const completed = jobs.filter((j) => j.status === 'completed');
    const totalEarned = completed.reduce((sum, j) => sum + (j.agreedRate || 0), 0);
    const pendingEscrow = jobs
      .filter((j) => ['accepted', 'in_progress'].includes(j.status))
      .reduce((sum, j) => sum + (j.agreedRate || 0), 0);

    res.json({
      success: true,
      data: { profile, user, jobs, earnings: { totalEarned, pendingEscrow } },
      message: 'OK',
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /:slug — public profile
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const param = req.params.slug;

    const isObjectId = mongoose.Types.ObjectId.isValid(param) && param.length === 24;
    const query = isObjectId
      ? { $or: [{ slug: param }, { userId: param }] }
      : { slug: param };

    const profile = await WorkerProfile.findOne(query)
      .populate('userId', '-passwordHash -idPhotoFront -idPhotoBack -idNumber -phone -whatsappNumber');
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Worker not found' });

    if (!req.user && profile.userId?.socialLinks) {
      profile.userId.socialLinks = undefined;
    }

    const workerId = profile.userId?._id || profile.userId;
    const reviews = await Job.find({ workerId, clientRating: { $exists: true } })
      .select('clientRating clientReview createdAt clientId')
      .populate('clientId', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: { profile, reviews, isAuthenticated: !!req.user }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// POST /onboarding — save each step + mark complete on final step
router.post('/onboarding', authenticateToken, requireRole('worker'),
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'coverPhoto',   maxCount: 1 },
  ]),
  async (req, res) => {
  try {
    const { step, category, bio, experienceYears, dayRateMin, dayRateMax,
            languages, district, province, serviceDistricts, availableDays,
            phone, whatsappNumber, complete } = req.body;

    const profileUpdates = {};
    const userUpdates    = {};

    if (category)        profileUpdates.category        = category;
    if (experienceYears) profileUpdates.experienceYears = Number(experienceYears);
    if (bio)           { profileUpdates.pendingBio = bio; profileUpdates.bioStatus = 'pending'; }
    if (languages) {
      profileUpdates.languages = Array.isArray(languages)
        ? languages
        : JSON.parse(languages);
    }

    if (dayRateMin)       profileUpdates.dayRateMin      = Number(dayRateMin);
    if (dayRateMax)       profileUpdates.dayRateMax      = Number(dayRateMax);
    if (serviceDistricts) {
      profileUpdates.serviceDistricts = Array.isArray(serviceDistricts)
        ? serviceDistricts
        : JSON.parse(serviceDistricts);
    }
    if (availableDays) {
      profileUpdates.availableDays = Array.isArray(availableDays)
        ? availableDays
        : JSON.parse(availableDays);
    }
    if (district) { userUpdates['location.district'] = district; }
    if (province) { userUpdates['location.province'] = province; }

    if (phone)          userUpdates.phone          = normalizePhone(phone) || phone;
    if (whatsappNumber) userUpdates.whatsappNumber = normalizePhone(whatsappNumber) || whatsappNumber;

    if (req.files?.profilePhoto?.[0]) userUpdates.profilePhoto    = fileUrl(req.files.profilePhoto[0]);
    if (req.files?.coverPhoto?.[0])   profileUpdates.coverPhoto   = fileUrl(req.files.coverPhoto[0]);

    if (complete === 'true' || complete === true) {
      profileUpdates.onboardingComplete = true;

      const existingProfile = await WorkerProfile.findOne({ userId: req.user.id }).select('slug category');
      if (!existingProfile?.slug) {
        const user = await User.findById(req.user.id).select('name location');
        const slugCategory = profileUpdates.category || existingProfile?.category || '';
        const slugDistrict = district || user?.location?.district || '';
        profileUpdates.slug = generateSlug(user?.name || '', slugCategory, slugDistrict);
      }
    }

    const [profile] = await Promise.all([
      WorkerProfile.findOneAndUpdate({ userId: req.user.id }, profileUpdates, { new: true }),
      Object.keys(userUpdates).length
        ? User.findByIdAndUpdate(req.user.id, userUpdates)
        : Promise.resolve(),
    ]);

    res.json({ success: true, data: profile, message: 'Saved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /profile — update work details + availability
router.put('/profile', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const profileUpdates = {};
    const userUpdates = {};

    const {
      bio, experienceYears, dayRateMin, dayRateMax, languages, category,
      serviceDistricts, availableDays, acceptingWork,
      phone, whatsappNumber, district, province,
    } = req.body;

    if (bio !== undefined) {
      profileUpdates.pendingBio = bio;
      profileUpdates.bioStatus  = 'pending';
    }
    if (experienceYears !== undefined) profileUpdates.experienceYears = Number(experienceYears);
    if (dayRateMin !== undefined) profileUpdates.dayRateMin = Number(dayRateMin);
    if (dayRateMax !== undefined) profileUpdates.dayRateMax = Number(dayRateMax);
    if (category) profileUpdates.category = category;
    if (languages !== undefined) profileUpdates.languages = Array.isArray(languages) ? languages : JSON.parse(languages || '[]');
    if (serviceDistricts !== undefined) profileUpdates.serviceDistricts = Array.isArray(serviceDistricts) ? serviceDistricts : JSON.parse(serviceDistricts || '[]');
    if (availableDays !== undefined) profileUpdates.availableDays = Array.isArray(availableDays) ? availableDays : JSON.parse(availableDays || '[]');
    if (acceptingWork !== undefined) profileUpdates.acceptingWork = acceptingWork === 'true' || acceptingWork === true;

    if (phone) userUpdates.phone = normalizePhone(phone) || phone;
    if (whatsappNumber !== undefined) userUpdates.whatsappNumber = normalizePhone(whatsappNumber) || whatsappNumber;
    if (district || province) userUpdates.location = { district, province };

    if (userUpdates.name) profileUpdates.workerName = userUpdates.name;

    const [profile] = await Promise.all([
      WorkerProfile.findOneAndUpdate({ userId: req.user.id }, profileUpdates, { new: true }),
      Object.keys(userUpdates).length ? User.findByIdAndUpdate(req.user.id, userUpdates) : Promise.resolve(),
    ]);

    res.json({ success: true, data: profile, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /profile/photo — upload profile photo
router.put('/profile/photo', authenticateToken, requireRole('worker'), upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, data: null, message: 'No file uploaded' });
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePhoto: fileUrl(req.file) },
      { new: true }
    ).select('-passwordHash');
    res.json({ success: true, data: user, message: 'Profile photo updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /profile/cover — upload cover photo
router.put('/profile/cover', authenticateToken, requireRole('worker'), upload.single('coverPhoto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, data: null, message: 'No file uploaded' });
    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.user.id },
      { coverPhoto: fileUrl(req.file) },
      { new: true }
    );
    res.json({ success: true, data: profile, message: 'Cover photo updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /profile/idDoc — upload ID photos (front + back)
router.put('/profile/idDoc', authenticateToken, requireRole('worker'), upload.fields([
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 },
]), async (req, res) => {
  try {
    const userUpdates = { idSubmitted: true };
    if (req.body.idNumber) userUpdates.idNumber = req.body.idNumber;
    if (req.files?.idFront?.[0]) userUpdates.idPhotoFront = fileUrl(req.files.idFront[0]);
    if (req.files?.idBack?.[0]) userUpdates.idPhotoBack = fileUrl(req.files.idBack[0]);

    const user = await User.findByIdAndUpdate(req.user.id, userUpdates, { new: true }).select('-passwordHash');

    await Notification.create({
      userId: req.user.id,
      type: 'score_changed',
      message: 'ID documents submitted — pending admin verification',
    });

    await checkWorkerFlags(req.user.id);

    res.json({ success: true, data: user, message: 'ID submitted for verification' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /profile/certifications — upload trade certification
router.put('/profile/certifications', authenticateToken, requireRole('worker'), upload.fields([
  { name: 'tradeCert', maxCount: 1 },
]), async (req, res) => {
  try {
    const profileUpdates = {};
    const { certName, certIssuedBy } = req.body;

    if (req.files?.tradeCert?.[0]) {
      profileUpdates.tradeCertificationPhoto = fileUrl(req.files.tradeCert[0]);
      profileUpdates.tradeCertification = true;
      if (certName || certIssuedBy) {
        profileUpdates.$push = {
          certifications: { name: certName || 'Trade Cert', issuedBy: certIssuedBy || '' },
        };
      }
    }

    const profile = await WorkerProfile.findOneAndUpdate({ userId: req.user.id }, profileUpdates, { new: true });
    await recalculateScore(req.user.id);

    res.json({ success: true, data: profile, message: 'Certifications updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /profile/portfolio — add portfolio photos (goes to pending moderation)
router.put('/profile/portfolio', authenticateToken, requireRole('worker'), upload.array('photos', 8), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, data: null, message: 'No files uploaded' });
    const newPhotos = req.files.map((f) => ({ url: fileUrl(f), uploadedAt: new Date() }));
    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $push: { pendingPortfolioPhotos: { $each: newPhotos } } },
      { new: true }
    );
    res.json({ success: true, data: profile, message: 'Photos submitted for review — admin will approve within 24 hours' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// DELETE /profile/portfolio — remove one photo (approved or pending)
router.delete('/profile/portfolio', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const { url, pending } = req.body;
    const update = pending
      ? { $pull: { pendingPortfolioPhotos: { url } } }
      : { $pull: { portfolioPhotos: url } };
    const profile = await WorkerProfile.findOneAndUpdate(
      { userId: req.user.id },
      update,
      { new: true }
    );
    deleteByUrl(url).catch(() => {});
    res.json({ success: true, data: profile, message: 'Photo removed' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// POST /workers/featured-request — worker submits a featured listing request
router.post('/featured-request', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const { period, paymentMethod, paymentRef, notes } = req.body;

    const PRICES = { '1_week': 500, '2_weeks': 900, '1_month': 1500 };
    if (!PRICES[period]) return res.status(400).json({ success: false, data: null, message: 'Invalid period' });

    const existing = await FeaturedRequest.findOne({ workerId: req.user.id, status: 'pending' });
    if (existing) return res.status(409).json({ success: false, data: null, message: 'You already have a pending featured request' });

    const request = await FeaturedRequest.create({
      workerId: req.user.id,
      period,
      amount: PRICES[period],
      paymentMethod,
      paymentRef: paymentRef || '',
      notes: notes || '',
    });

    res.status(201).json({ success: true, data: request, message: 'Request submitted — admin will review within 24 hours' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /workers/featured-request/my — worker checks their own latest request
router.get('/featured-request/my', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const [request, profile] = await Promise.all([
      FeaturedRequest.findOne({ workerId: req.user.id }).sort({ requestedAt: -1 }),
      WorkerProfile.findOne({ userId: req.user.id }).select('featuredUntil'),
    ]);
    res.json({ success: true, data: { request, featuredUntil: profile?.featuredUntil || null }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /profile/portfolio/paid — portfolio upload for paid plan only
router.put('/profile/portfolio/paid', authenticateToken, requireRole('worker'), upload.array('photos', 8), async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!isPaidPlan(profile)) {
      return res.status(403).json({ success: false, data: null, message: 'Portfolio upload requires a Pro or Elite plan' });
    }
    if (!req.files?.length) return res.status(400).json({ success: false, data: null, message: 'No files uploaded' });

    const MAX_PHOTOS = 12;
    const current = (profile.portfolioPhotos?.length || 0) + (profile.pendingPortfolioPhotos?.length || 0);
    if (current + req.files.length > MAX_PHOTOS) {
      return res.status(400).json({ success: false, data: null, message: `Maximum ${MAX_PHOTOS} portfolio photos allowed` });
    }

    const newPhotos = req.files.map((f) => ({ url: fileUrl(f), uploadedAt: new Date() }));
    await WorkerProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $push: { pendingPortfolioPhotos: { $each: newPhotos } } }
    );
    res.json({ success: true, data: null, message: 'Photos submitted for review' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// ── Offers — CRUD ────────────────────────────────────────────────────────────

// POST /workers/offers — create offer (paid only)
router.post('/offers', authenticateToken, requireRole('worker'), upload.array('photos', 4), async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!isPaidPlan(profile)) {
      return res.status(403).json({ success: false, data: null, message: 'Service offers require a Pro or Elite plan' });
    }

    const count = await WorkerOffer.countDocuments({ workerId: profile._id, isActive: true });
    const MAX_OFFERS = profile.subscriptionPlan === 'elite' ? 10 : 5;
    if (count >= MAX_OFFERS) {
      return res.status(400).json({ success: false, data: null, message: `Maximum ${MAX_OFFERS} active offers allowed on your plan` });
    }

    const { title, description, priceMin, priceMax, deliveryDays } = req.body;
    if (!title || !priceMin) return res.status(400).json({ success: false, data: null, message: 'Title and minimum price are required' });

    const photos = (req.files || []).map(fileUrl);

    const offer = await WorkerOffer.create({
      workerId: profile._id,
      title: title.trim(),
      description: description?.trim() || '',
      priceMin: Number(priceMin),
      priceMax: priceMax ? Number(priceMax) : undefined,
      deliveryDays: deliveryDays ? Number(deliveryDays) : undefined,
      photos,
    });

    res.status(201).json({ success: true, data: offer, message: 'Offer created' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /workers/offers/my — worker's own offers
router.get('/offers/my', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ success: false, data: null, message: 'Profile not found' });
    const offers = await WorkerOffer.find({ workerId: profile._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { offers, isPaid: isPaidPlan(profile), plan: profile.subscriptionPlan }, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /workers/offers/:id — update offer
router.put('/offers/:id', authenticateToken, requireRole('worker'), upload.array('photos', 4), async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!isPaidPlan(profile)) return res.status(403).json({ success: false, data: null, message: 'Paid plan required' });

    const offer = await WorkerOffer.findOne({ _id: req.params.id, workerId: profile._id });
    if (!offer) return res.status(404).json({ success: false, data: null, message: 'Offer not found' });

    const { title, description, priceMin, priceMax, deliveryDays, isActive, removePhotos } = req.body;
    if (title)       offer.title       = title.trim();
    if (description !== undefined) offer.description = description.trim();
    if (priceMin)    offer.priceMin    = Number(priceMin);
    if (priceMax)    offer.priceMax    = priceMax ? Number(priceMax) : undefined;
    if (deliveryDays !== undefined) offer.deliveryDays = deliveryDays ? Number(deliveryDays) : undefined;
    if (isActive !== undefined) offer.isActive = isActive === 'true' || isActive === true;

    if (removePhotos) {
      const toRemove = Array.isArray(removePhotos) ? removePhotos : [removePhotos];
      offer.photos = offer.photos.filter((p) => !toRemove.includes(p));
    }
    if (req.files?.length) {
      const newPhotos = req.files.map(fileUrl);
      offer.photos = [...offer.photos, ...newPhotos].slice(0, 4);
    }

    await offer.save();
    res.json({ success: true, data: offer, message: 'Offer updated' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// DELETE /workers/offers/:id
router.delete('/offers/:id', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    const offer = await WorkerOffer.findOneAndDelete({ _id: req.params.id, workerId: profile._id });
    if (!offer) return res.status(404).json({ success: false, data: null, message: 'Offer not found' });
    (offer.photos || []).forEach((url) => deleteByUrl(url).catch(() => {}));
    res.json({ success: true, data: null, message: 'Offer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /workers/:id/offers — public: active offers for a worker
router.get('/:id/offers', async (req, res) => {
  try {
    const profile = await WorkerProfile.findOne({ userId: req.params.id }).select('_id subscriptionPlan subscriptionExpiry');
    if (!profile) return res.json({ success: true, data: [], message: 'OK' });
    if (!isPaidPlan(profile)) return res.json({ success: true, data: [], message: 'OK' });
    const offers = await WorkerOffer.find({ workerId: profile._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: offers, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

export default router;
