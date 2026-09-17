import WorkerProfile from '../models/WorkerProfile.js';
import { PLANS } from '../config/plans.js';

async function checkAndResetLeads(profile) {
  const now = new Date();
  const resetDate = new Date(profile.leadsResetDate);
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
    profile.leadsThisMonth = 0;
    profile.leadsResetDate = now;
    await profile.save();
  }
}

export async function checkExpiredSubscriptions() {
  const now = new Date();
  const expired = await WorkerProfile.find({
    subscriptionPlan: { $in: ['pro', 'elite'] },
    subscriptionExpiry: { $lt: now },
  });
  for (const profile of expired) {
    profile.subscriptionPlan = 'free';
    profile.subscriptionExpiry = null;
    await profile.save();
  }
}

export async function canReceiveLead(workerId) {
  const profile = await WorkerProfile.findOne({ userId: workerId });
  if (!profile) return { allowed: false, reason: 'Worker not found' };

  await checkAndResetLeads(profile);

  if (['pro', 'elite'].includes(profile.subscriptionPlan) && profile.subscriptionExpiry) {
    if (new Date() > new Date(profile.subscriptionExpiry)) {
      profile.subscriptionPlan = 'free';
      profile.subscriptionExpiry = null;
      await profile.save();
    }
  }

  const plan = PLANS[profile.subscriptionPlan] || PLANS.free;
  if (plan.leadLimit !== Infinity && profile.leadsThisMonth >= plan.leadLimit) {
    return {
      allowed: false,
      reason: `Free plan limit reached (${plan.leadLimit} leads/month). Upgrade to Pro for unlimited leads.`,
    };
  }

  return { allowed: true, profile };
}

export async function incrementLeadCount(workerId) {
  await WorkerProfile.findOneAndUpdate({ userId: workerId }, { $inc: { leadsThisMonth: 1 } });
}
