'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Clock, CheckCircle, Trophy } from 'lucide-react';
import TierBadge from './TierBadge';

interface ReliabilityData {
  tier: 'champion' | 'regular' | 'new' | 'unreliable';
  score: number | null;
  metrics: {
    totalRegistered: number;
    totalAttended: number;
    attendanceRate: number;
    waitlistAbandonRate: number;
    bulkRegistrationScore: number;
  };
  benefits: {
    confirmationWindowHours: number;
    waitlistMultiplier: number;
    waitlistPenaltyHours?: number;
  };
  improvementTip: string;
  modelActive: boolean;
}

function MetricBar({
  label,
  value,
  good,
}: {
  label: string;
  value: number;
  good: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className={good ? 'text-teal-400' : 'text-orange-400'}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            good ? 'bg-teal-500' : 'bg-orange-500'
          }`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function ReliabilityCard() {
  const [data, setData] = useState<ReliabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/reliability')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-40 mb-4" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="h-16 bg-white/5 rounded-xl" />
          <div className="h-16 bg-white/5 rounded-xl" />
        </div>
        <div className="h-2 bg-white/5 rounded-full mb-2" />
        <div className="h-2 bg-white/5 rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  const isNew = data.tier === 'new';
  const isChampion = data.tier === 'champion';
  const isUnreliable = data.tier === 'unreliable';

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-teal-400" />
          <h3 className="text-sm font-medium text-white">Your Reliability Profile</h3>
        </div>
        <TierBadge tier={data.tier} size="sm" audience="student" />
      </div>

      {/* Score bar — only when not new and score exists */}
      {!isNew && data.score !== null && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">Reliability score</span>
            <span className="text-white font-medium">{data.score}/100</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isChampion ? 'bg-amber-400' :
                isUnreliable ? 'bg-orange-500' : 'bg-teal-500'
              }`}
              style={{ width: `${data.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {data.metrics.totalRegistered}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Registered</div>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
          <div className={`text-2xl font-bold ${isChampion ? 'text-amber-400' : 'text-teal-400'}`}>
            {data.metrics.totalAttended}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Attended</div>
        </div>
      </div>

      {/* Metric bars — only when not new */}
      {!isNew && (
        <div className="space-y-3 mb-4">
          <MetricBar
            label="Attendance rate"
            value={data.metrics.attendanceRate}
            good={data.metrics.attendanceRate >= 50}
          />
          {data.metrics.waitlistAbandonRate > 0 && (
            <MetricBar
              label="Waitlist reliability"
              value={100 - data.metrics.waitlistAbandonRate}
              good={data.metrics.waitlistAbandonRate < 30}
            />
          )}
        </div>
      )}

      {/* Benefits */}
      <div className="p-3 bg-white/[0.03] rounded-xl mb-3">
        <p className="text-xs font-medium text-gray-400 mb-2">Your current benefits:</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <Clock size={11} className="text-gray-500" />
            <span className="text-gray-400">
              {data.benefits.confirmationWindowHours}h to confirm free event spots
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Trophy size={11} className="text-gray-500" />
            <span className="text-gray-400">
              {data.benefits.waitlistMultiplier > 0
                ? `${data.benefits.waitlistMultiplier}× priority bonus on waitlists`
                : isUnreliable
                  ? 'No waitlist priority bonus'
                  : 'No waitlist bonus yet — attend events to earn one'}
            </span>
          </div>
        </div>
      </div>

      {/* New tier — progress bar toward 3 events */}
      {isNew && (
        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl mb-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={13} className="text-blue-400" />
            <span className="text-xs font-medium text-blue-400">Getting started</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((data.metrics.totalAttended / 3) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {data.metrics.totalAttended}/3 events attended to unlock your score
          </p>
        </div>
      )}

      {/* Improvement tip */}
      {data.improvementTip && (
        <div className={`p-3 rounded-xl border ${
          isUnreliable
            ? 'bg-orange-500/5 border-orange-500/10'
            : isChampion
              ? 'bg-amber-500/5 border-amber-500/10'
              : 'bg-teal-500/5 border-teal-500/10'
        }`}>
          <p
            className="text-xs leading-relaxed"
            style={{
              color: isUnreliable ? '#fb923c' : isChampion ? '#fbbf24' : '#2dd4bf',
            }}
          >
            {data.improvementTip}
          </p>
        </div>
      )}
    </div>
  );
}
