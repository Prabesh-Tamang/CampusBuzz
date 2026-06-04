'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Users, UserCheck, AlertTriangle } from 'lucide-react';
import TierBadge from '@/components/TierBadge';
import TitleSetter from '@/components/TitleSetter';

interface Student {
  _id: string;
  name: string;
  email: string;
  college: string;
  engagementTier: string;
  reliabilityScore: number | null;
  isBanned: boolean;
  createdAt: string;
  totalRegistrations: number;
  totalAttended: number;
}

export default function AdminStudentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'authenticated') {
      if ((session?.user as any)?.role !== 'admin') { router.push('/events'); return; }
      fetch('/api/admin/students')
        .then(r => r.json())
        .then(d => setStudents(d.students || []))
        .finally(() => setLoading(false));
    }
  }, [status, session, router]);

  const filtered = useMemo(() => {
    let result = students;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    if (tierFilter) {
      if (tierFilter === 'banned') {
        result = result.filter(s => s.isBanned);
      } else {
        result = result.filter(s => s.engagementTier === tierFilter);
      }
    }
    return result;
  }, [students, search, tierFilter]);

  const tiers = ['champion', 'regular', 'new', 'unreliable'];
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tiers.forEach(t => { counts[t] = students.filter(s => s.engagementTier === t).length; });
    counts['banned'] = students.filter(s => s.isBanned).length;
    return counts;
  }, [students]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="w-48 h-8 bg-surface2/50 animate-pulse rounded-lg mb-6" />
        <div className="w-full h-12 bg-surface2/30 animate-pulse rounded-xl mb-4" />
        <div className="flex gap-2 mb-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="w-24 h-8 bg-surface2/40 animate-pulse rounded-full" />)}
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="flex gap-4 p-4 bg-surface2/20 rounded-xl mb-2">
            <div className="w-10 h-10 bg-surface2/40 animate-pulse rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="w-40 h-4 bg-surface2/50 animate-pulse rounded" />
              <div className="w-24 h-3 bg-surface2/30 animate-pulse rounded" />
            </div>
            <div className="w-16 h-6 bg-surface2/40 animate-pulse rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <TitleSetter title="Students" />
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/30 to-emerald-500/20 flex items-center justify-center ring-1 ring-teal-500/30">
          <Users className="w-7 h-7 text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Students
          </h1>
          <p className="text-sm text-muted-foreground">{students.length} total students</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#1c2f2e] border border-white/15 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30"
        />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setTierFilter(null)}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${!tierFilter ? 'bg-teal-500/25 text-teal-400 border border-teal-500/40' : 'bg-[#1c2f2e] text-gray-300 hover:text-white border border-white/15'}`}
        >
          All ({students.length})
        </button>
        {tiers.map(t => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize ${tierFilter === t ? 'bg-teal-500/25 text-teal-400 border border-teal-500/40' : 'bg-[#1c2f2e] text-gray-300 hover:text-white border border-white/15'}`}
          >
            {t} ({tierCounts[t] || 0})
          </button>
        ))}
        <button
          onClick={() => setTierFilter('banned')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${tierFilter === 'banned' ? 'bg-red-500/25 text-red-400 border border-red-500/40' : 'bg-[#1c2f2e] text-gray-300 hover:text-white border border-white/15'}`}
        >
          <AlertTriangle size={12} className="inline mr-1" />
          Banned ({tierCounts['banned'] || 0})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <UserCheck size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No students found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(student => (
            <Link
              key={student._id}
              href={`/admin/students/${student._id}`}
              className="block card p-4 hover:border-teal-500/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-sm font-bold text-teal-400 flex-shrink-0">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">{student.name}</span>
                    {student.isBanned && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded">BANNED</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{student.email}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <TierBadge tier={student.engagementTier as 'champion' | 'regular' | 'new' | 'unreliable'} />
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{student.reliabilityScore ?? '—'}</div>
                    <div className="text-[10px] text-gray-500">/ 100</div>
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    <div>{student.totalRegistrations} reg</div>
                    <div>{student.totalAttended} att</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
