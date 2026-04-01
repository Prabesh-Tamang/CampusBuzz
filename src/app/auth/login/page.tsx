'use client';
import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warming, setWarming] = useState(true);

  // Pre-warm the auth endpoint so the first login isn't slow
  useEffect(() => {
    fetch('/api/auth/csrf').finally(() => setWarming(false));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      if ((session?.user as any)?.role === 'admin') {
        // Admin is logged in but on student login page — sign them out silently
        signOut({ redirect: false });
      } else {
        router.push('/events');
      }
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="grid-bg min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/events',
      });

      if (!res) {
        toast.error('No response from server. Please try again.');
        setLoading(false);
        return;
      }

      if (res.error) {
        // res.error = 'CredentialsSignin' means wrong password/email
        toast.error('Invalid email or password');
        setLoading(false);
        return;
      }

      if (res.ok) {
        // Fetch session to get role
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();

        if (sessionData?.user?.role === 'admin') {
          // Admin tried student login — sign out and show error
          await signOut({ redirect: false });
          toast.error('Invalid permission');
          setLoading(false);
          return;
        }

        toast.success('Welcome back!');
        router.push('/events');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="grid-bg min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 no-underline mb-6">
            <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center">
              <Zap size={22} className="text-[#042f2e] fill-[#042f2e]" />
            </div>
            <span className="text-2xl font-extrabold text-white">Campus<span className="text-accent">Buzz</span></span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Welcome back</h1>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>

        <div className="card p-9">
          {warming && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 justify-center">
              <Loader2 size={12} className="animate-spin" />
              Connecting to server...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email</label>
              <input
                className="input w-full"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Password</label>
              <div className="relative">
                <input
                  className="input w-full pr-11"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full text-base py-3.5 flex items-center justify-center gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>
          <p className="text-center mt-6 text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="font-bold text-accent no-underline hover:underline">Sign up</Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
            <ArrowLeft size={15} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
