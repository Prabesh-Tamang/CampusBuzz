import User from '@/models/User';
import Registration from '@/models/Registration';
import Waitlist from '@/models/Waitlist';
import { IsolationForest } from './isolationForest';
import connectDB from '@/lib/mongodb';

export type EngagementTier = 'champion' | 'regular' | 'new' | 'unreliable';

export interface ReliabilityMetrics {
  attendanceRate: number;
  waitlistAbandonRate: number;
  bulkRegistrationScore: number;
  totalRegistrations: number;
}

export interface ReliabilityResult {
  tier: EngagementTier;
  score: number;
  anomalyScore: number;
  metrics: ReliabilityMetrics;
  confirmationWindowHours: number;
  waitlistMultiplier: number;
}

export async function computeMetrics(userId: string): Promise<ReliabilityMetrics> {
  const now = new Date();

  const [
    totalRegistrations,
    totalConfirmed,
    totalCheckedIn,
    activeUnconfirmed,
    totalWaitlistPromotions,
    abandonedWaitlists,
  ] = await Promise.all([
    Registration.countDocuments({ userId }),
    Registration.countDocuments({ userId, confirmed: true }),
    Registration.countDocuments({ userId, checkedIn: true }),
    Registration.countDocuments({
      userId,
      confirmed: false,
      createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
    }),
    Registration.countDocuments({ userId, promotedFromWaitlist: true }),
    Waitlist.countDocuments({
      userId,
      abandonedAt: { $ne: null },
    }),
  ]);

  const attendanceRate = totalConfirmed > 0
    ? totalCheckedIn / totalConfirmed
    : 0;

  const waitlistAbandonRate = totalWaitlistPromotions > 0
    ? abandonedWaitlists / totalWaitlistPromotions
    : 0;

  return {
    attendanceRate: Math.min(Math.round(attendanceRate * 100) / 100, 1),
    waitlistAbandonRate: Math.min(Math.round(waitlistAbandonRate * 100) / 100, 1),
    bulkRegistrationScore: Math.min(activeUnconfirmed, 10),
    totalRegistrations,
  };
}

let reliabilityModel: IsolationForest | null = null;
let reliabilityModelTrained = false;
let reliabilityTrainingCount = 0;

export async function trainReliabilityModel(): Promise<void> {
  await connectDB();

  const users = await User.find({ role: 'student' }, '_id').lean() as { _id: import('mongoose').Types.ObjectId }[];

  if (users.length < 10) {
    console.log('[ReliabilityIF] Not enough students to train — need 10+, have', users.length);
    return;
  }

  const featureVectors: number[][] = [];

  for (const user of users) {
    try {
      const metrics = await computeMetrics(user._id.toString());
      if (metrics.totalRegistrations < 2) continue;

      featureVectors.push([
        metrics.attendanceRate,
        metrics.waitlistAbandonRate,
        Math.min(metrics.bulkRegistrationScore / 10, 1),
      ]);
    } catch {
      // Skip users that fail
    }
  }

  if (featureVectors.length < 10) {
    console.log('[ReliabilityIF] Not enough data points to train — need 10+, have', featureVectors.length);
    return;
  }

  reliabilityModel = new IsolationForest(100, 256);
  reliabilityModel.train(featureVectors);
  reliabilityModelTrained = true;
  reliabilityTrainingCount = featureVectors.length;

  console.log('[ReliabilityIF] Trained on', featureVectors.length, 'students');
}

export function isReliabilityModelReady(): boolean {
  return reliabilityModelTrained && reliabilityModel !== null;
}

export function getReliabilityModelStats() {
  return {
    trained: reliabilityModelTrained,
    trainingCount: reliabilityTrainingCount,
  };
}

function classifyTier(
  metrics: ReliabilityMetrics,
  anomalyScore: number
): EngagementTier {
  const { attendanceRate, waitlistAbandonRate, bulkRegistrationScore, totalRegistrations } = metrics;

  if (totalRegistrations < 3) return 'new';

  if (
    attendanceRate < 0.25 ||
    waitlistAbandonRate >= 0.5 ||
    bulkRegistrationScore >= 6 ||
    anomalyScore >= 0.7
  ) {
    return 'unreliable';
  }

  if (
    attendanceRate >= 0.70 &&
    waitlistAbandonRate < 0.20 &&
    bulkRegistrationScore <= 2 &&
    anomalyScore < 0.3
  ) {
    return 'champion';
  }

  return 'regular';
}

function computeScore(metrics: ReliabilityMetrics, anomalyScore: number): number {
  if (metrics.totalRegistrations < 3) return 0;

  const attendanceComponent = metrics.attendanceRate * 60;
  const waitlistComponent = (1 - metrics.waitlistAbandonRate) * 25;
  const mlComponent = (1 - anomalyScore) * 15;

  return Math.round(Math.min(attendanceComponent + waitlistComponent + mlComponent, 100));
}

export function getTierBenefits(tier: EngagementTier): {
  confirmationWindowHours: number;
  waitlistMultiplier: number;
  waitlistPenaltyHours: number;
} {
  switch (tier) {
    case 'champion':
      return { confirmationWindowHours: 48, waitlistMultiplier: 2, waitlistPenaltyHours: 0 };
    case 'regular':
      return { confirmationWindowHours: 24, waitlistMultiplier: 1, waitlistPenaltyHours: 0 };
    case 'new':
      return { confirmationWindowHours: 24, waitlistMultiplier: 0, waitlistPenaltyHours: 0 };
    case 'unreliable':
      return { confirmationWindowHours: 12, waitlistMultiplier: 0, waitlistPenaltyHours: 2 };
  }
}

export async function updateStudentReliability(userId: string): Promise<ReliabilityResult> {
  const metrics = await computeMetrics(userId);

  let anomalyScore = 0;

  if (isReliabilityModelReady() && metrics.totalRegistrations >= 3) {
    try {
      anomalyScore = reliabilityModel!.anomalyScore([
        metrics.attendanceRate,
        metrics.waitlistAbandonRate,
        Math.min(metrics.bulkRegistrationScore / 10, 1),
      ]);
    } catch (err) {
      console.error('[ReliabilityIF] Scoring failed:', err);
      anomalyScore = 0;
    }
  }

  const tier = classifyTier(metrics, anomalyScore);
  const score = computeScore(metrics, anomalyScore);
  const benefits = getTierBenefits(tier);

  void User.findByIdAndUpdate(userId, {
    engagementTier: tier,
    reliabilityScore: metrics.totalRegistrations >= 3 ? score : null,
  }).catch(err => console.error('[Reliability] Failed to save tier:', err));

  return {
    tier,
    score,
    anomalyScore: Math.round(anomalyScore * 1000) / 1000,
    metrics,
    confirmationWindowHours: benefits.confirmationWindowHours,
    waitlistMultiplier: benefits.waitlistMultiplier,
  };
}

let updatesSinceRetrain = 0;
const RETRAIN_AFTER = 50;

export function maybeRetrain(): void {
  updatesSinceRetrain++;
  if (updatesSinceRetrain >= RETRAIN_AFTER) {
    updatesSinceRetrain = 0;
    void trainReliabilityModel().catch(err =>
      console.error('[ReliabilityIF] Retrain failed:', err)
    );
  }
}
