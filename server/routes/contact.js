import express from 'express';
import ContactMessage from '../models/ContactMessage.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, topic, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    }

    await ContactMessage.create({ name, email, topic: topic || 'general', message });

    res.status(201).json({ success: true, message: 'Message received. We\'ll get back to you soon!' });
  } catch (err) {
    console.error('Contact POST error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }

    const { page = 1, limit = 30, unread } = req.query;
    const filter = {};
    if (unread === 'true') filter.isRead = false;

    const [messages, total] = await Promise.all([
      ContactMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      ContactMessage.countDocuments(filter),
    ]);

    res.json({ success: true, data: { messages, total, page: Number(page) } });
  } catch (err) {
    console.error('Contact GET error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }

    const { isRead, adminNote } = req.body;
    const update = {};
    if (isRead !== undefined) update.isRead = isRead;
    if (adminNote !== undefined) update.adminNote = adminNote;

    const msg = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!msg) return res.status(404).json({ success: false, message: 'Not found.' });

    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

export default router;
