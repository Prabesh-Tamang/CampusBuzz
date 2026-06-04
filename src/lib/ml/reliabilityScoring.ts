import User from '@/models/User';
import Registration from '@/models/Registration';
import Waitlist from '@/models/Waitlist';
import { IsolationForest } from './isolationForest';
import connectDB from '@/lib/mongodb';
import {
  MODEL_PARAMS,
  MIN_EVENTS_FOR_SCORE,
  MIN_EVENTS_FOR_TRAINING,
  MIN_USERS_FOR_TRAINING,
  RETRAIN_AFTER_UPDATES,
  ISOLATION_FOREST_TREES,
  ISOLATION_FOREST_SAMPLE,
} from './constants';

export type EngagementTier = 'champion' | 'regular' | 'new' | 'unreliable';

export interface ReliabilityMetrics {
  attendanceRate: number;
  waitlistAbandonRate: number;
  bulkRegistrationScore: number;
  cancellationRate: number;
  recentAttendanceRate: number;
  confirmationResponseHours: number;
  waitlistConversionRate: number;
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

export async function computeMetrics(userId: string, retentionDays: number = 30): Promise<ReliabilityMetrics> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  const [
    totalRegistrations,
    totalConfirmed,
    totalCheckedIn,
    activeUnconfirmed,
    totalWaitlistPromotions,
    abandonedWaitlists,
    explicitCancellations,
    last5Regs,
    acceptedPromotions,
  ] = await Promise.all([
    Registration.countDocuments({ userId }),
    Registration.countDocuments({ userId, confirmed: true }),
    Registration.countDocuments({ userId, checkedIn: true }),
    Registration.countDocuments({
      userId,
      confirmed: false,
      createdAt: { $gte: cutoff },
    }),
    Registration.countDocuments({ userId, promotedFromWaitlist: true }),
    Waitlist.countDocuments({ userId, abandonedAt: { $ne: null } }),
    Registration.countDocuments({ userId, cancelledAt: { $ne: null } }),
    Registration.find({ userId, confirmed: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('checkedIn confirmedAt confirmationEmailSentAt')
      .lean(),
    Registration.countDocuments({ userId, promotedFromWaitlist: true, confirmed: true }),
  ]);

  const attendanceRate = totalConfirmed > 0 ? totalCheckedIn / totalConfirmed : 0;
  const waitlistAbandonRate = totalWaitlistPromotions > 0 ? abandonedWaitlists / totalWaitlistPromotions : 0;

  // Recent attendance rate (last 5 confirmed registrations)
  const recentAttendanceRate = last5Regs.length > 0
    ? last5Regs.filter((r: any) => r.checkedIn).length / last5Regs.length
    : attendanceRate;

  // Average confirmation response time (hours from email sent to confirmed)
  const responseTimes = last5Regs
    .filter((r: any) => r.confirmedAt && r.confirmationEmailSentAt)
    .map((r: any) =>
      (new Date(r.confirmedAt).getTime() - new Date(r.confirmationEmailSentAt).getTime()) / 3_600_000
    );
  const avgResponseHours = responseTimes.length > 0
    ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
    : 12;

  return {
    attendanceRate:            Math.min(Math.round(attendanceRate * 100) / 100, 1),
    waitlistAbandonRate:       Math.min(Math.round(waitlistAbandonRate * 100) / 100, 1),
    bulkRegistrationScore:     Math.min(activeUnconfirmed, 10),
    cancellationRate:          totalRegistrations > 0 ? explicitCancellations / totalRegistrations : 0,
    recentAttendanceRate:      Math.min(Math.round(recentAttendanceRate * 100) / 100, 1),
    confirmationResponseHours: Math.min(avgResponseHours, 48),
    waitlistConversionRate:    totalWaitlistPromotions > 0 ? acceptedPromotions / totalWaitlistPromotions : 1,
    totalRegistrations,
  };
}

let reliabilityModel: IsolationForest | null = null;
let reliabilityModelTrained = false;
let reliabilityTrainingCount = 0;

export async function trainReliabilityModel(): Promise<void> {
  await connectDB();

  const users = await User.find({ role: 'student' }, '_id').lean() as { _id: import('mongoose').Types.ObjectId }[];

  if (users.length < MIN_USERS_FOR_TRAINING) {
    console.log('[ReliabilityIF] Not enough students to train — need ' + MIN_USERS_FOR_TRAINING + '+, have', users.length);
    return;
  }

  const featureVectors: number[][] = [];

  for (const user of users) {
    try {
      const metrics = await computeMetrics(user._id.toString());
      if (metrics.totalRegistrations < MIN_EVENTS_FOR_TRAINING) continue;

      featureVectors.push([
        metrics.attendanceRate,
        metrics.waitlistAbandonRate,
        Math.min(metrics.bulkRegistrationScore / 10, 1),
        metrics.cancellationRate,
        metrics.recentAttendanceRate,
        Math.min(metrics.confirmationResponseHours / 48, 1),
        1 - metrics.waitlistConversionRate,
      ]);
    } catch {
      // Skip users that fail
    }
  }

  if (featureVectors.length < MIN_USERS_FOR_TRAINING) {
    console.log('[ReliabilityIF] Not enough data points to train — need ' + MIN_USERS_FOR_TRAINING + '+, have', featureVectors.length);
    return;
  }

  reliabilityModel = new IsolationForest(ISOLATION_FOREST_TREES, ISOLATION_FOREST_SAMPLE);
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

  if (totalRegistrations < MIN_EVENTS_FOR_SCORE) return 'new';

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
  if (metrics.totalRegistrations < MIN_EVENTS_FOR_SCORE) return 0;

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
  const prevUser = await User.findById(userId).select('reliabilityScore engagementTier').lean();
  const prevTier = (prevUser as any)?.engagementTier ?? 'new';
  const retentionDays = MODEL_PARAMS.RETENTION_DAYS[prevTier] ?? 30;
  const metrics = await computeMetrics(userId, retentionDays);

  let anomalyScore = 0;

  if (isReliabilityModelReady() && metrics.totalRegistrations >= MIN_EVENTS_FOR_SCORE) {
    try {
      anomalyScore = reliabilityModel!.anomalyScore([
        metrics.attendanceRate,
        metrics.waitlistAbandonRate,
        Math.min(metrics.bulkRegistrationScore / 10, 1),
        metrics.cancellationRate,
        metrics.recentAttendanceRate,
        Math.min(metrics.confirmationResponseHours / 48, 1),
        1 - metrics.waitlistConversionRate,
      ]);
    } catch (err) {
      console.error('[ReliabilityIF] Scoring failed:', err);
      anomalyScore = 0;
    }
  }

  const tier = classifyTier(metrics, anomalyScore);
  const score = computeScore(metrics, anomalyScore);
  const benefits = getTierBenefits(tier);

  const prevScore = (prevUser as any)?.reliabilityScore ?? 0;
  const scoreDiff = Math.abs((score ?? 0) - prevScore);

  const historyEntry = {
    score: score ?? 0,
    tier,
    reason: buildScoreChangeReason(tier, metrics),
    changedAt: new Date(),
  };

  await User.findByIdAndUpdate(userId, {
    engagementTier: tier,
    reliabilityScore: metrics.totalRegistrations >= MIN_EVENTS_FOR_SCORE ? score : null,
    $push: {
      scoreHistory: {
        $each: [historyEntry],
        $position: 0,
        $slice: 20,
      },
    },
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

function buildScoreChangeReason(
  tier: string,
  metrics: ReliabilityMetrics
): string {
  if (metrics.attendanceRate >= 0.7) return 'Attendance rate above 70%';
  if (metrics.attendanceRate < 0.25) return 'Attendance rate below 25%';
  if (metrics.waitlistAbandonRate >= 0.5) return 'High waitlist abandonment rate';
  if (metrics.bulkRegistrationScore >= 6) return 'Too many unconfirmed registrations';
  if (metrics.cancellationRate >= 0.4) return 'High cancellation rate';
  if (metrics.recentAttendanceRate >= 0.8) return 'Strong recent attendance';
  if (metrics.waitlistConversionRate < 0.5) return 'Low waitlist acceptance rate';
  return `Reliability recalculated — tier: ${tier}`;
}

export function maybeRetrain(): void {
  updatesSinceRetrain++;
  if (updatesSinceRetrain >= RETRAIN_AFTER_UPDATES) {
    updatesSinceRetrain = 0;
    void trainReliabilityModel().catch(err =>
      console.error('[ReliabilityIF] Retrain failed:', err)
    );
  }
}
