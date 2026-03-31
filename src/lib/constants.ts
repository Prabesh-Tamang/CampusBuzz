// Anomaly detection thresholds
export const ANOMALY_WARN_THRESHOLD = 0.6;
export const ANOMALY_BLOCK_THRESHOLD = 0.8;

// ML model training
export const MIN_TRAINING_SAMPLES = 20;
export const RETRAIN_INTERVAL = 100;

// Waitlist priority scoring
export const WAITLIST_HOUR_DISCOUNT_MS = 3_600_000;

// Recommendations
export const RECOMMENDATION_TOP_K = 5;

// Cache
export const CACHE_TTL_MS = 3_600_000;

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 30;

// Event categories
export const EVENT_CATEGORIES = [
  'Technical',
  'Cultural',
  'Sports',
  'Workshop',
  'Seminar',
  'Hackathon',
  'Other',
] as const;

// Payment providers
export const PAYMENT_PROVIDERS = ['esewa', 'khalti'] as const;

// Registration ID prefix
export const REGISTRATION_ID_PREFIX = 'CP-';
