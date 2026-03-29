'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn('credentials', { 
        email, 
        password, 
        redirect: false,
      });
      
      if (res?.error) {
        toast.error('Invalid email or password');
        setLoading(false);
      } else if (res?.ok) {
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} className="grid-bg">
      <div style={{ width: '100%', maxWidth: 420 }}>
        
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #14b8a6, #0d9488)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} color="#042f2e" fill="#042f2e" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 800 }}>College<span style={{ color: 'var(--accent)' }}>Pulse</span></span>
          </Link>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px' }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Sign in to your account</p>
        </div>
        <div className="card" style={{ padding: 36 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input className="input" type="email" placeholder="you@college.edu" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  className="input" 
                  type={showPass ? 'text' : 'password'} 
                  placeholder="Enter password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  style={{ paddingRight: 50 }} 
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 4,
                    zIndex: 10,
                    display: 'flex',
                  }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: 16, padding: '14px 0' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
            Don't have an account? <Link href="/auth/signup" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
