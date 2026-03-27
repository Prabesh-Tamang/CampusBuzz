'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Zap, LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const isAdmin = (session?.user)?.role === 'admin';

  return (
    <nav className="sticky top-0 z-50 bg-[#050d0c]/85 backdrop-blur-xl border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between h-[68px]">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-teal-950 fill-teal-950" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              College<span className="text-teal-400">Pulse</span>
            </span>
          </Link>

          {/* Right Section */}
          <div className="flex items-center gap-2">

            <Link href="/events" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg hover:text-white">
              Events
            </Link>

            {isAdmin && (
              <Link href="/dashboard" className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg hover:text-white">
                <LayoutDashboard size={16} /> Dashboard
              </Link>
            )}

            {session ? (
              <div className="flex items-center gap-2 ml-2">

                {/* User Box */}
                <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-xs font-bold text-teal-950">
                    {session.user?.name?.[0]?.toUpperCase()}
                  </div>

                  <span className="text-sm font-semibold">
                    {session.user?.name?.split(' ')[0]}
                  </span>

                  {isAdmin && (
                    <span className="text-[10px] font-bold text-teal-400 bg-teal-400/15 px-1.5 py-[2px] rounded">
                      ADMIN
                    </span>
                  )}
                </div>

                {/* Logout */}
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1 px-4 py-2 text-sm btn-ghost"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>

            ) : (
              <div className="flex gap-2 ml-2">
                <Link href="/auth/login">
                  <button className="px-5 py-2 text-sm btn-ghost">Login</button>
                </Link>
                <Link href="/auth/signup">
                  <button className="px-5 py-2 text-sm btn-primary">Sign Up</button>
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}