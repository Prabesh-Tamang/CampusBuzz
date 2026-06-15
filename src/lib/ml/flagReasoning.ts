const reasonCache = new Map<string, string>();

function buildFeatureDescriptions(features: number[]): string[] {
  const parts: string[] = [];

  if (features[0] !== undefined) {
    const hour = Math.round(features[0]);
    if (hour < 6 || hour > 22) parts.push(`Check-in at unusual hour (${hour}:00)`);
  }
  if (features[1] !== undefined && features[1] < 0.01) {
    parts.push('Registered moments before check-in');
  }
  if (features[3] !== undefined && features[3] < 0.2) {
    parts.push('Very low historical attendance rate');
  }
  if (features[4] !== undefined && Math.abs(features[4]) > 120) {
    parts.push(`Check-in ${features[4] > 0 ? 'very late' : 'very early'} relative to event time`);
  }

  return parts;
}

function buildStructuredReason(
  features: number[],
  anomalyScore: number,
  severity: 'flagged' | 'blocked'
): string {
  const flags = buildFeatureDescriptions(features);
  const prefix = severity === 'blocked' ? 'Blocked' : 'Flagged';

  if (flags.length > 0) {
    return `${prefix} — ${flags.join('; ')}`;
  }

  return `${prefix} — anomaly score ${(anomalyScore * 100).toFixed(0)}%`;
}

export async function generateFlagReason(
  features: number[],
  anomalyScore: number,
  severity: 'flagged' | 'blocked',
  registrationId?: string
): Promise<string> {
  if (registrationId && reasonCache.has(registrationId)) {
    return reasonCache.get(registrationId)!;
  }

  const reason = buildStructuredReason(features, anomalyScore, severity);

  if (registrationId) {
    reasonCache.set(registrationId, reason);
    setTimeout(() => reasonCache.delete(registrationId!), 60 * 60 * 1000);
  }

  return reason;
}
