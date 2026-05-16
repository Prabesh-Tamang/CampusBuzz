interface FlagFeatures {
  hourOfDay?: number;
  daysSinceReg?: number;
  totalRegistrations?: number;
  checkinRate?: number;
  minutesRelativeToStart?: number;
  sameCategoryCount?: number;
  attendanceRate?: number;
  waitlistAbandonRate?: number;
  bulkRegistrationScore?: number;
}

const reasonCache = new Map<string, string>();

export async function generateFlagReason(
  features: number[],
  anomalyScore: number,
  severity: 'flagged' | 'blocked',
  registrationId?: string
): Promise<string> {
  if (registrationId && reasonCache.has(registrationId)) {
    return reasonCache.get(registrationId)!;
  }

  if (!process.env.GEMINI_API_KEY) {
    return severity === 'blocked'
      ? `Anomaly score ${(anomalyScore * 100).toFixed(0)}% — multiple suspicious patterns detected`
      : `Anomaly score ${(anomalyScore * 100).toFixed(0)}% — unusual check-in pattern`;
  }

  try {
    const featureDescriptions = buildFeatureDescriptions(features, anomalyScore);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a campus event security system. A check-in was ${severity === 'blocked' ? 'BLOCKED' : 'FLAGGED'} with anomaly score ${(anomalyScore * 100).toFixed(0)}%.

Data: ${featureDescriptions}

Write a ${severity === 'blocked' ? 'firm but professional' : 'friendly but clear'} one-sentence reason for the admin explaining why this was flagged. Be specific about the suspicious pattern. Be slightly sarcastic and witty but professional. Do not use jargon. Maximum 25 words.`,
            }],
          }],
        }),
      }
    );

    if (!response.ok) throw new Error('API call failed');

    const data = await response.json();
    const reason = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'Unusual pattern detected.';

    if (registrationId) {
      reasonCache.set(registrationId, reason);
      setTimeout(() => reasonCache.delete(registrationId!), 60 * 60 * 1000);
    }

    return reason;
  } catch (err) {
    console.error('[FlagReasoning] AI reason generation failed:', err);
    return `Anomaly score ${(anomalyScore * 100).toFixed(0)}% — pattern deviates from normal behaviour`;
  }
}

function buildFeatureDescriptions(features: number[], score: number): string {
  const descriptions: string[] = [];

  if (features[0] !== undefined) {
    const hour = Math.round(features[0] * 24);
    if (hour < 6 || hour > 22) descriptions.push(`Check-in at unusual hour (${hour}:00)`);
  }
  if (features[1] !== undefined && features[1] < 0.01) {
    descriptions.push('Registered less than 15 minutes ago');
  }
  if (features[3] !== undefined && features[3] < 0.2) {
    descriptions.push('Very low historical attendance rate');
  }
  if (features[4] !== undefined && Math.abs(features[4]) > 120) {
    descriptions.push(`Check-in ${features[4] > 0 ? 'very late' : 'very early'} relative to event time`);
  }

  return descriptions.length > 0
    ? descriptions.join(', ')
    : `Overall anomaly score: ${(score * 100).toFixed(0)}%`;
}
