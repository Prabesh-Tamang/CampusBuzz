'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Zap, LogOut, LayoutDashboard, ScanLine, Menu, X, Plus, Calendar, CreditCard } from 'lucide-react';

interface NavbarProps {
  showAdminLinks?: boolean;
}

export default function Navbar({ showAdminLinks = true }: NavbarProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isAdmin = (session?.user)?.role === 'admin';

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#050d0c]/85 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center justify-between h-[68px]">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 no-underline">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Zap size={18} className="text-teal-950 fill-teal-950" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                Campus<span className="text-teal-400">Buzz</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">

              {isAdmin && showAdminLinks && (
                <>
                  <Link href="/admin/events/new" className="px-4 py-2 text-sm font-semibold bg-teal-500 text-[#042f2e] rounded-lg hover:bg-teal-400 transition flex items-center gap-2">
                    <Plus size={16} /> New Event
                  </Link>
                  
                  <Link href="/admin" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg hover:text-white transition flex items-center gap-2">
                    <Calendar size={16} /> Manage Events
                  </Link>
                  
                  <Link href="/admin/scanner" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg hover:text-white transition flex items-center gap-2">
                    <ScanLine size={16} /> Scanner
                  </Link>
                  
                  <Link href="/admin" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg hover:text-white transition flex items-center gap-2">
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                  
                  <Link href="/admin/payments" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg hover:text-white transition flex items-center gap-2">
                    <CreditCard size={16} /> Payments
                  </Link>
                </>
              )}

              {!isAdmin && session && (
                <Link href="/my-payments" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg hover:text-white transition flex items-center gap-2">
                  <CreditCard size={16} /> My Payments
                </Link>
              )}

              {session ? (
                <div className="flex items-center gap-2 ml-4">
                  {/* User Box */}
                  <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-1.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-xs font-bold text-teal-950">
                      {session.user?.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {session.user?.name?.split(' ')[0]}
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] font-bold text-teal-400 bg-teal-400/10 px-1.5 py-[2px] rounded border border-teal-400/20">
                        ADMIN
                      </span>
                    )}
                  </div>

                  {/* Logout */}
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-1 px-4 py-2 text-sm btn-ghost"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 ml-4">
                  <Link href="/auth/login">
                    <button className="px-5 py-2 text-sm btn-ghost">Login</button>
                  </Link>
                  <Link href="/auth/signup">
                    <button className="px-5 py-2 text-sm btn-primary">Sign Up</button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-2">
                {isAdmin && showAdminLinks && (
                  <>
                    <Link href="/admin/events/new" className="px-4 py-2 text-sm font-semibold text-teal-400 rounded-lg">
                      + New Event
                    </Link>
                    <Link href="/admin" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg">
                      Manage Events
                    </Link>
                    <Link href="/admin/scanner" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg">
                      Scanner
                    </Link>
                    <Link href="/admin" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg">
                      Dashboard
                    </Link>
                    <Link href="/admin/payments" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg">
                      Payments
                    </Link>
                  </>
                )}

                {!isAdmin && session && (
                  <Link href="/my-payments" className="px-4 py-2 text-sm font-semibold text-gray-400 rounded-lg">
                    My Payments
                  </Link>
                )}

                {session && (
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="px-4 py-2 text-sm font-semibold text-left text-gray-400 rounded-lg hover:text-white"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card p-8 max-w-sm mx-4 text-center">
            <h3 className="text-xl font-bold text-white mb-3">Sign Out?</h3>
            <p className="text-muted-foreground mb-6">Are you sure you want to sign out of your account?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="btn-ghost px-6"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="btn-primary px-6"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
