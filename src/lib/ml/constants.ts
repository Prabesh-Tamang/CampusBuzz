export const MODEL_PARAMS = {
  RETENTION_DAYS: {
    champion: 60,
    regular: 45,
    new: 30,
    unreliable: 15,
  } as Record<string, number>,
};

export const MIN_EVENTS_FOR_SCORE = 3;

export const MIN_EVENTS_FOR_TRAINING = 2;

export const MIN_USERS_FOR_TRAINING = 10;

export const RETRAIN_AFTER_UPDATES = 50;

export const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export const ISOLATION_FOREST_TREES = 100;

export const ISOLATION_FOREST_SAMPLE = 256;
