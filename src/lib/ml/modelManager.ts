import { IsolationForest } from './isolationForest';
import { extractFeatures } from './checkinFeatures';
import Registration from '@/models/Registration';
import { MIN_TRAINING_SAMPLES, RETRAIN_INTERVAL } from '@/lib/constants';

let model: IsolationForest | null = null;
let checkinsSinceRetrain = 0;
let trainingCount = 0;

export async function trainModel(): Promise<void> {
  const checkins = await Registration.find({ checkedIn: true, adminOverride: { $ne: true } })
    .populate('eventId', 'category date')
    .lean();

  const featureVectors: number[][] = [];

  for (const reg of checkins) {
    try {
      const event = reg.eventId as any;
      if (!event) continue;
      const features = await extractFeatures({
        userId: reg.userId.toString(),
        eventId: reg.eventId.toString(),
        eventCategory: event.category,
        eventDate: event.date,
        registrationCreatedAt: reg.createdAt,
        checkinTime: reg.checkedInAt!,
      });
      featureVectors.push(features);
    } catch {
      // Skip malformed records
    }
  }

  if (featureVectors.length < MIN_TRAINING_SAMPLES) {
    console.warn(`[IsolationForest] Only ${featureVectors.length} valid samples — skipping training (need ${MIN_TRAINING_SAMPLES})`);
    return;
  }

  model = new IsolationForest(100, 256);
  model.train(featureVectors);
  trainingCount = featureVectors.length;
  checkinsSinceRetrain = 0;
  console.log(`[IsolationForest] Trained on ${featureVectors.length} samples`);
}

export async function getModel(): Promise<IsolationForest | null> {
  if (!model) await trainModel();
  return model;
}

export function isModelReady(): boolean {
  return model !== null && model.isTrained && trainingCount >= MIN_TRAINING_SAMPLES;
}

export function recordCheckin(): void {
  checkinsSinceRetrain++;
  if (checkinsSinceRetrain >= RETRAIN_INTERVAL) {
    trainModel().catch(err =>
      console.error('[IsolationForest] Retrain failed:', err)
    );
  }
}

export function getModelStats() {
  return {
    trained: isModelReady(),
    trainingCount,
    checkinsSinceRetrain,
  };
}
