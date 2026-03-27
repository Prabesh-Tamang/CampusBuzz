
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Eye, EyeOff } from 'lucide-react';
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
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Account created! Please log in.');
      router.push('/auth/login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        {/* Header/Logo Section */}
        <div className="mb-10 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2.5 no-underline">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700">
              <Zap size={22} className="fill-[#042f2e] text-[#042f2e]" />
            </div>
            <span className="text-2xl font-extrabold text-white">
              College<span className="text-accent">Pulse</span>
            </span>
          </Link>
          <h1 className="mb-2 text-3xl font-extrabold text-white">Create account</h1>
          <p className="text-sm text-muted-foreground">Join CollegePulse for free</p>
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
                placeholder="Full Name"
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
                placeholder="ABC@gmail.com"
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
                placeholder="XYZ College"
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
                  className="input w-full pr-11"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
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