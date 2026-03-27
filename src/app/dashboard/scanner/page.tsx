'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { ArrowLeft, QrCode, CheckCircle, XCircle, Camera, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

interface CheckInResult {
  success: boolean;
  message: string;
  studentName?: string;
  eventName?: string;
  alreadyCheckedIn?: boolean;
}

export default function ScannerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [manualId, setManualId] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<{ stop?: () => void } | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated') {
      const isAdmin = (session?.user as { role?: string })?.role === 'admin';
      if (!isAdmin) router.push('/events');
    }
    return () => {
      if (scannerRef.current?.stop) scannerRef.current.stop();
    };
  }, [status]);

  async function processQR(data: string) {
    setLoading(true);
    setResult(null);
    try {
      let registrationId = data;
      // Try to parse JSON QR data
      try {
        const parsed = JSON.parse(data);
        if (parsed.registrationId) registrationId = parsed.registrationId;
      } catch {}

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      });
      const json = await res.json();

      if (res.ok) {
        const reg = json.registration;
        setResult({
          success: true,
          message: 'Check-in successful!',
          studentName: reg.userId?.name || 'Student',
          eventName: reg.eventId?.title || 'Event',
        });
        toast.success('✅ Checked in successfully!');
      } else if (res.status === 400 && json.error === 'Already checked in') {
        setResult({ success: false, message: 'Already checked in!', alreadyCheckedIn: true });
        toast.error('Already checked in');
      } else {
        setResult({ success: false, message: json.error || 'Invalid QR code' });
        toast.error('Invalid QR code');
      }
    } catch {
      setResult({ success: false, message: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  }

  async function startScanner() {
    setScanning(true);
    setResult(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          html5QrCode.stop();
          setScanning(false);
          processQR(decodedText);
        },
        () => {}
      );
    } catch {
      toast.error('Camera not available. Use manual entry.');
      setScanning(false);
    }
  }

  function stopScanner() {
    if (scannerRef.current && typeof (scannerRef.current as { stop?: () => void }).stop === 'function') {
      (scannerRef.current as { stop: () => void }).stop();
    }
    setScanning(false);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualId.trim()) return;
    processQR(manualId.trim());
    setManualId('');
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 32, fontSize: 14, fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, background: 'rgba(20,184,166,0.15)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <QrCode size={36} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>QR Scanner</h1>
          <p style={{ color: 'var(--text-muted)' }}>Scan student QR codes for event check-in</p>
        </div>

        {/* Result */}
        {result && (
          <div className="card" style={{
            padding: 28,
            marginBottom: 28,
            borderColor: result.success ? 'rgba(20,184,166,0.5)' : result.alreadyCheckedIn ? 'rgba(245,158,11,0.5)' : 'rgba(244,63,94,0.5)',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: 16 }}>
              {result.success ? (
                <CheckCircle size={48} color="var(--accent)" style={{ margin: '0 auto' }} />
              ) : (
                <XCircle size={48} color={result.alreadyCheckedIn ? '#f59e0b' : '#f43f5e'} style={{ margin: '0 auto' }} />
              )}
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: result.success ? 'var(--accent)' : result.alreadyCheckedIn ? '#f59e0b' : '#f43f5e' }}>
              {result.message}
            </h3>
            {result.studentName && (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                <strong style={{ color: 'var(--text)' }}>{result.studentName}</strong> → {result.eventName}
              </p>
            )}
            <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => setResult(null)}>Scan Another</button>
          </div>
        )}

        {/* Camera Scanner */}
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={20} color="var(--accent)" /> Camera Scanner
          </h3>

          <div ref={scannerDivRef}>
            <div id="qr-reader" style={{ width: '100%', borderRadius: 12, overflow: 'hidden', background: 'var(--surface2)' }} />
          </div>

          {!scanning ? (
            <button className="btn-primary" style={{ width: '100%', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={startScanner} disabled={loading}>
              <Camera size={18} /> Start Camera
            </button>
          ) : (
            <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={stopScanner}>
              Stop Camera
            </button>
          )}
        </div>

        {/* Manual Entry */}
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={20} color="var(--accent)" /> Manual Entry
          </h3>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 12 }}>
            <input
              className="input"
              placeholder="Enter Registration ID (e.g. CP-XXXXX-XXXX)"
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              style={{ flex: 1, fontFamily: 'Space Mono, monospace', fontSize: 13 }}
            />
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={loading || !manualId.trim()}>
              {loading ? '...' : 'Check In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
