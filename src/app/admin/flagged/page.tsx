'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface FlaggedEntry {
  _id: string;
  userId: {
    name: string;
    email: string;
    college?: string;
  };
  eventId: {
    title: string;
    date: string;
    venue: string;
    category: string;
  };
  registrationId: string;
  anomalyScore: number;
  createdAt: string;
}

export default function AdminFlaggedPage() {
  const { data: session, status } = useSession();
  const [flagged, setFlagged] = useState<FlaggedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/admin/flagged')
        .then(r => r.json())
        .then(d => {
          setFlagged(d.flagged || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  async function handleOverride(registrationId: string) {
    try {
      const res = await fetch('/api/admin/flagged', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      setFlagged(prev => prev.filter(f => f.registrationId !== registrationId));
      toast.success('Check-in approved successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve check-in');
    }
  }

  function getScoreBadge(score: number) {
    if (score < 0.6) return { color: '#22c55e', label: 'Low' };
    if (score < 0.8) return { color: '#f59e0b', label: 'Medium' };
    return { color: '#ef4444', label: 'High' };
  }

  if (loading) return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-surface2 animate-pulse rounded-2xl" />
        <div>
          <div className="w-52 h-7 bg-surface2 animate-pulse rounded-lg mb-2" />
          <div className="w-72 h-4 bg-surface2 animate-pulse rounded" />
        </div>
      </div>
      <div className="h-80 bg-surface2 animate-pulse rounded-2xl" />
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Flagged <span className="text-accent">Check-ins</span>
          </h1>
          <p className="text-muted-foreground">Review suspicious activity flagged by the ML model</p>
        </div>
      </div>

      {flagged.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={48} className="text-accent mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No suspicious check-ins</h3>
          <p className="text-muted-foreground">All clear — no flagged activity detected</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-dark-card">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Event</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map((entry) => {
                const badge = getScoreBadge(entry.anomalyScore);
                return (
                  <tr key={entry._id} className="border-b border-border/50 hover:bg-dark-border/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{entry.userId?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{entry.userId?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{entry.eventId?.title || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{entry.eventId?.venue}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: `${badge.color}20`, color: badge.color }}
                      >
                        <AlertTriangle size={12} /> 
                        {entry.anomalyScore.toFixed(3)} ({badge.label})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOverride(entry.registrationId)}
                        className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
                      >
                        <ShieldCheck size={14} /> Approve
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
