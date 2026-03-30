'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      
      toast.success('Account created! Please log in.');
      router.push('/auth/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        {/* Header/Logo Section */}
        <div className="mb-10 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2.5 no-underline">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700">
              <Zap size={22} className="fill-[#042f2e] text-[#042f2e]" />
            </div>
            <span className="text-2xl font-extrabold text-white">
              Campus<span className="text-accent">Buzz</span>
            </span>
          </Link>
          <h1 className="mb-2 text-3xl font-extrabold text-white">Create account</h1>
          <p className="text-sm text-muted-foreground">Join CampusBuzz for free</p>
        </div>

        {/* Form Card */}
        <div className="card p-9 shadow-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
            {/* Full Name */}
            <div>
              <label className="mb-2 block text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <input
                name="name"
                type="text"
                placeholder="Enter your full name"
                className="input w-full"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                College Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="your.email@college.edu"
                className="input w-full"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* College Name */}
            <div>
              <label className="mb-2 block text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                College Name (Optional)
              </label>
              <input
                name="college"
                type="text"
                placeholder="Your college name"
                className="input w-full"
                value={form.college}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  className="input w-full"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition p-1"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-1 w-full py-3.5 text-base font-semibold disabled:opacity-70"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          {/* Footer Link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-bold text-accent no-underline hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
