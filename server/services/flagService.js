import WorkerProfile from '../models/WorkerProfile.js';
import User from '../models/User.js';
import Job from '../models/Job.js';

export async function checkWorkerFlags(workerId) {
  const [profile, user] = await Promise.all([
    WorkerProfile.findOne({ userId: workerId }),
    User.findById(workerId),
  ]);
  if (!profile) return;

  const jobs = await Job.find({ workerId });
  const flagReasons = [];

  if (profile.isSuspended) {
    flagReasons.push({
      type: 'auto_suspended',
      reason: profile.suspensionReason || 'Score dropped below threshold',
    });
  }

  if (!user?.idVerified) {
    flagReasons.push({ type: 'nic_pending', reason: 'ID verification pending' });
  }

  const cancelCount = jobs.filter((j) => j.status === 'cancelled').length;
  if (cancelCount >= 3) {
    flagReasons.push({ type: 'high_cancellation', reason: `${cancelCount} job cancellations recorded` });
  }

  if (profile.fraudFlag) {
    flagReasons.push({ type: 'fraud', reason: 'Fraud flag raised' });
  }

  profile.flagged = flagReasons.length > 0;
  profile.flagReasons = flagReasons;
  await profile.save();
}

export async function flagJob(jobId, reason) {
  await Job.findByIdAndUpdate(jobId, { flagged: true, flagReason: reason });
}

export async function clearWorkerFlag(workerId) {
  await WorkerProfile.findOneAndUpdate(
    { userId: workerId },
    { flagged: false, flagReasons: [] }
  );
}
