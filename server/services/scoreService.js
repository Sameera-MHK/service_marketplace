import WorkerProfile from '../models/WorkerProfile.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import { checkWorkerFlags } from './flagService.js';

const PLATFORM_MEAN_RATING = 4.2;
const BAYESIAN_THRESHOLD = 30;
const DECAY_LAMBDA = 0.003;

function daysAgo(date) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

export async function recalculateScore(workerId) {
  const profile = await WorkerProfile.findOne({ userId: workerId }).populate('userId');
  if (!profile) return;

  const user = await User.findById(workerId);

  if (profile.fraudFlag) {
    profile.skillScore = 0;
    profile.scoreBand = 'suspended';
    profile.isSuspended = true;
    await profile.save();
    return;
  }

  const allJobs = await Job.find({ workerId });
  const completedJobs = allJobs.filter((j) => j.status === 'completed');
  const workerCancelledJobs = allJobs.filter((j) => j.status === 'cancelled');

  // 1. Completion score
  const total = completedJobs.length + workerCancelledJobs.length;
  const completionRate = total === 0 ? 1 : completedJobs.length / total;
  const completionScore = Math.round(completionRate * 100);

  // 2. Rating score (Bayesian with time decay)
  const ratedJobs = completedJobs.filter((j) => j.workerRating != null);
  let ratingScore = 50;
  if (ratedJobs.length > 0) {
    const weights = ratedJobs.map((j) => Math.exp(-DECAY_LAMBDA * daysAgo(j.createdAt)));
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const weightedMean = ratedJobs.reduce((sum, j, i) => sum + j.workerRating * weights[i], 0) / weightSum;
    const v = ratedJobs.length;
    const bayesianAdj =
      (v * weightedMean + BAYESIAN_THRESHOLD * PLATFORM_MEAN_RATING) / (v + BAYESIAN_THRESHOLD);
    ratingScore = Math.round(((bayesianAdj - 1) / 4) * 100);
  }

  // 3. Responsiveness score
  const responseTime = profile.avgResponseTimeMinutes || 60;
  const responsivenessScore = Math.max(0, Math.round(100 - (responseTime / 60) * 20));

  // 4. Dispute score
  const disputesLostByWorker = allJobs.filter(
    (j) => j.disputeOutcome === 'client_favour'
  ).length;
  const disputeRate = completedJobs.length === 0 ? 0 : disputesLostByWorker / completedJobs.length;
  const disputeScore = Math.max(0, Math.round(100 - disputeRate * 500));

  // 5. Trust score
  let trustScore = 0;
  if (user && user.idVerified) trustScore += 50;
  if (profile.tradeCertification) trustScore += 30;
  if (profile.referredByHighScoreWorker) trustScore += 20;
  trustScore = Math.min(100, trustScore);

  // 6. Final score
  let skillScore = Math.round(
    completionScore * 0.3 +
      ratingScore * 0.25 +
      responsivenessScore * 0.2 +
      disputeScore * 0.15 +
      trustScore * 0.1
  );

  // 7. ID cap
  if (!user || !user.idVerified) {
    skillScore = Math.min(skillScore, 70);
  }

  // 8. Hard overrides
  const recentDisputesLost = allJobs.filter(
    (j) =>
      j.disputeOutcome === 'client_favour' &&
      daysAgo(j.createdAt) <= 30
  ).length;
  if (recentDisputesLost >= 2) {
    profile.isSuspended = true;
    profile.suspensionReason = '2+ disputes lost in last 30 days';
    skillScore = Math.min(skillScore, 34);
  }

  // 9. Assign band
  let scoreBand;
  if (profile.isSuspended || skillScore <= 34) scoreBand = 'suspended';
  else if (skillScore <= 54) scoreBand = 'probation';
  else if (skillScore <= 74) scoreBand = 'rising';
  else if (skillScore <= 89) scoreBand = 'trusted';
  else scoreBand = 'elite';

  profile.skillScore = skillScore;
  profile.scoreBand = scoreBand;
  profile.scoreBreakdown = {
    completionScore,
    ratingScore,
    responsivenessScore,
    disputeScore,
    trustScore,
  };
  profile.totalJobsCompleted = completedJobs.length;
  profile.disputeCount = disputesLostByWorker;

  await profile.save();
  await checkWorkerFlags(workerId);
  return profile;
}
