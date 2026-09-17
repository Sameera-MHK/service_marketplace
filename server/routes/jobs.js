import express from 'express';
import Job from '../models/Job.js';
import Notification from '../models/Notification.js';
import WorkerProfile from '../models/WorkerProfile.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { recalculateScore } from '../services/scoreService.js';
import { flagJob, checkWorkerFlags } from '../services/flagService.js';
import { canReceiveLead, incrementLeadCount } from '../services/subscriptionService.js';
import { upload, fileUrl } from '../middleware/upload.js';
import {
  sendSMS,
  smsNewJob,
  smsDepositPaid,
  smsJobCompleted,
  smsDisputeOpened,
} from '../services/smsService.js';

const router = express.Router();

async function notify(userId, type, message, jobId) {
  await Notification.create({ userId, type, message, jobId });
}

// POST / — client creates job
router.post('/', authenticateToken, requireRole('client'), upload.array('photos', 5), async (req, res) => {
  try {
    const { category, title, description, district, address, scheduledDate, agreedRate, workerId } = req.body;
    const photos = req.files ? req.files.map((f) => fileUrl(f)) : [];

    if (workerId) {
      const leadCheck = await canReceiveLead(workerId);
      if (!leadCheck.allowed) {
        return res.status(403).json({ success: false, data: null, message: leadCheck.reason });
      }
    }

    const deposit = agreedRate ? Math.round(agreedRate * 0.3) : 0;
    const job = await Job.create({
      clientId: req.user.id,
      workerId: workerId || null,
      category,
      title,
      description,
      photos,
      location: { district, address },
      scheduledDate,
      agreedRate: agreedRate ? Number(agreedRate) : undefined,
      depositAmount: deposit,
      remainingAmount: agreedRate ? Number(agreedRate) - deposit : undefined,
    });

    if (workerId) {
      await notify(workerId, 'new_lead', `New job request: ${title}`, job._id);
      await incrementLeadCount(workerId);

      const [workerUser, client] = await Promise.all([
        User.findById(workerId).select('name phone'),
        User.findById(req.user.id).select('name'),
      ]);
      const dateStr = scheduledDate
        ? new Date(scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : 'TBC';
      if (workerUser?.phone) {
        sendSMS(workerUser.phone, smsNewJob(workerUser.name, title, client?.name || 'A client', dateStr))
          .catch(() => {});
      }
    }

    res.status(201).json({ success: true, data: job, message: 'Job created' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET / — list jobs for logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'client') filter.clientId = req.user.id;
    else if (req.user.role === 'worker') filter.workerId = req.user.id;

    const jobs = await Job.find(filter)
      .populate('clientId', 'name profilePhoto location')
      .populate('workerId', 'name profilePhoto')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: jobs, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('clientId', 'name profilePhoto phone location')
      .populate('workerId', 'name profilePhoto phone');
    if (!job) return res.status(404).json({ success: false, data: null, message: 'Job not found' });
    res.json({ success: true, data: job, message: 'OK' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /:id/accept — worker accepts
router.put('/:id/accept', authenticateToken, requireRole('worker'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, data: null, message: 'Job not found' });
    if (String(job.workerId) !== req.user.id) {
      return res.status(403).json({ success: false, data: null, message: 'Not your job' });
    }

    job.status = 'accepted';
    await job.save();

    await notify(job.clientId, 'job_accepted', `Worker accepted your job: ${job.title}`, job._id);
    res.json({ success: true, data: job, message: 'Job accepted' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /:id/deposit-paid
router.put('/:id/deposit-paid', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, data: null, message: 'Job not found' });
    if (String(job.clientId) !== req.user.id) {
      return res.status(403).json({ success: false, data: null, message: 'Not your job' });
    }

    job.depositPaid = true;
    job.status = 'in_progress';
    await job.save();

    if (job.workerId) {
      await notify(job.workerId, 'deposit_received', `Deposit received for: ${job.title}`, job._id);

      const workerUser = await User.findById(job.workerId).select('name phone');
      if (workerUser?.phone) {
        sendSMS(workerUser.phone, smsDepositPaid(workerUser.name, job.title, job.depositAmount || 0))
          .catch(() => {});
      }
    }

    res.json({ success: true, data: job, message: 'Deposit marked as paid' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /:id/complete — worker marks complete
router.put('/:id/complete', authenticateToken, requireRole('worker'), upload.array('completionPhotos', 5), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, data: null, message: 'Job not found' });
    if (String(job.workerId) !== req.user.id) {
      return res.status(403).json({ success: false, data: null, message: 'Not your job' });
    }

    if (req.files && req.files.length > 0) {
      job.completionPhotos = req.files.map((f) => fileUrl(f));
    }
    job.status = 'completed';
    await job.save();

    await notify(job.clientId, 'job_completed', `Worker marked job complete: ${job.title}`, job._id);

    const clientUser = await User.findById(job.clientId).select('name phone');
    if (clientUser?.phone) {
      sendSMS(clientUser.phone, smsJobCompleted(clientUser.name, job.title))
        .catch(() => {});
    }

    res.json({ success: true, data: job, message: 'Job marked complete' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /:id/confirm-complete — client confirms
router.put('/:id/confirm-complete', authenticateToken, requireRole('client'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, data: null, message: 'Job not found' });
    if (String(job.clientId) !== req.user.id) {
      return res.status(403).json({ success: false, data: null, message: 'Not your job' });
    }

    job.finalPaid = true;
    job.status = 'completed';
    await job.save();

    if (job.workerId) {
      await recalculateScore(job.workerId);
    }

    res.json({ success: true, data: job, message: 'Completion confirmed and escrow released' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /:id/rate — both parties rate
router.put('/:id/rate', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, data: null, message: 'Job not found' });

    const { rating, review } = req.body;

    if (String(job.clientId) === req.user.id) {
      job.clientRating = Number(rating);
      job.clientReview = review;
    } else if (String(job.workerId) === req.user.id) {
      job.workerRating = Number(rating);
      job.workerReview = review;
    } else {
      return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    }

    await job.save();

    if (job.workerId) {
      await recalculateScore(job.workerId);
    }

    res.json({ success: true, data: job, message: 'Rating submitted' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /:id/dispute — open dispute
router.put('/:id/dispute', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, data: null, message: 'Job not found' });

    const isParty =
      String(job.clientId) === req.user.id || String(job.workerId) === req.user.id;
    if (!isParty) return res.status(403).json({ success: false, data: null, message: 'Forbidden' });

    job.status = 'disputed';
    job.disputeReason = req.body.reason;
    job.disputeOutcome = 'pending';
    await job.save();

    await flagJob(job._id, req.body.reason || 'Dispute opened');

    const otherId =
      String(job.clientId) === req.user.id ? job.workerId : job.clientId;
    if (otherId) {
      await notify(otherId, 'dispute_opened', `A dispute was opened on job: ${job.title}`, job._id);
    }

    const [clientUser, workerUser] = await Promise.all([
      User.findById(job.clientId).select('name phone'),
      User.findById(job.workerId).select('name phone'),
    ]);
    if (clientUser?.phone) sendSMS(clientUser.phone, smsDisputeOpened(clientUser.name, job.title)).catch(() => {});
    if (workerUser?.phone) sendSMS(workerUser.phone, smsDisputeOpened(workerUser.name, job.title)).catch(() => {});

    res.json({ success: true, data: job, message: 'Dispute opened' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// PUT /:id/resolve-dispute — admin resolves
router.put('/:id/resolve-dispute', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, data: null, message: 'Job not found' });

    const { outcome } = req.body;
    job.disputeOutcome = outcome;
    job.status = 'completed';
    await job.save();

    if (job.workerId) {
      await recalculateScore(job.workerId);
    }

    res.json({ success: true, data: job, message: 'Dispute resolved' });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

export default router;
