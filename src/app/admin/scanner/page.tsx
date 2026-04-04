'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { HiCheckCircle, HiXCircle, HiQrcode, HiRefresh, HiCheck } from 'react-icons/hi'

export default function ScannerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [manualCode, setManualCode] = useState('')
  const [loading, setLoading] = useState(false)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') router.push('/events')
  }, [status])

  useEffect(() => {
    if (!scanning) return

    let html5QrCode: any = null

    const initScanner = async () => {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode')
        html5QrCode = new Html5QrcodeScanner(
          'qr-reader',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        )
        html5QrCode.render(
          async (decodedText: string) => {
            await html5QrCode.clear()
            setScanning(false)
            await processQR(decodedText)
          },
          (error: any) => {}
        )
      } catch (err) {
        console.error('Scanner init error:', err)
        toast.error('Camera scanner not available. Use manual input.')
        setScanning(false)
      }
    }

    initScanner()

    return () => {
      if (html5QrCode) {
        html5QrCode.clear().catch(() => {})
      }
    }
  }, [scanning])

  const processQR = async (qrData: string) => {
    setLoading(true)
    try {
      // QR data is JSON: {"registrationId":"CP-...","eventId":"...","userId":"..."}
      // Extract registrationId — also handle plain CP-... strings
      let registrationId = qrData.trim()
      if (registrationId.startsWith('{')) {
        try {
          const parsed = JSON.parse(registrationId)
          registrationId = parsed.registrationId || registrationId
        } catch {
          // not valid JSON — use as-is
        }
      }

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ success: false, message: data.error, checkedInAt: data.checkedInAt })
      } else {
        setResult({ success: true, ...data })
        if (data.success) toast.success(` ✅ ${data.registration?.attendeeName} checked in!`)
      }
    } catch {
      toast.error('Failed to process QR code')
    } finally {
      setLoading(false)
    }
  }

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    await processQR(manualCode)
  }

  return (
    <div className="min-h-screen">
      <div className="pb-16 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm mb-6 transition-colors">
            ← Back to Dashboard
          </button>
          <h1 className="font-display font-extrabold text-4xl mb-2">
            QR <span className="gradient-text">Scanner</span>
          </h1>
          <p className="text-gray-400 mb-8">Scan attendee QR codes for event check-in</p>

          {/* Scanner Area */}
          {!scanning ? (
            <div className="gradient-border p-8 text-center mb-6">
              <div className="w-24 h-24 bg-pulse-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <HiQrcode className="text-5xl text-pulse-400" />
              </div>
              <h2 className="font-display font-bold text-2xl mb-2">Ready to Scan</h2>
              <p className="text-gray-400 mb-6">Click below to start the camera scanner</p>
              <button
                onClick={() => { setResult(null); setScanning(true) }}
                className="px-8 py-4 bg-pulse-600 hover:bg-pulse-500 text-white font-bold rounded-xl transition-all glow-blue"
              >
                📷 Start Camera Scanner
              </button>
            </div>
          ) : (
            <div className="gradient-border p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-xl">Scanning...</h2>
                <button onClick={() => setScanning(false)} className="text-gray-400 hover:text-white text-sm">
                  Stop
                </button>
              </div>
              <div id="qr-reader" className="rounded-xl overflow-hidden" />
            </div>
          )}

          {/* Manual Input */}
          <div className="card p-6 mb-6">
            <h2 className="font-bold text-lg text-white mb-1">Manual Entry</h2>
            <p className="text-gray-400 text-sm mb-4">Paste the Registration ID</p>
            <form onSubmit={handleManual} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="CP-XXXXXXXXXXXXXXXX"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                className="input w-full font-mono text-sm"
                style={{ letterSpacing: '0.02em' }}
              />
              <button
                type="submit"
                disabled={loading || !manualCode.trim()}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                ) : (
                  '✅ Check In'
                )}
              </button>
            </form>
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`gradient-border p-6 border-2 ${
                  result.success ? 'border-green-500/50' : 'border-red-500/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {result.success
                    ? <HiCheckCircle className="text-4xl text-green-400" />
                    : <HiXCircle className="text-4xl text-red-400" />
                  }
                  <div>
                    <h3 className={`font-display font-bold text-xl ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                      {result.success ? 'Check-in Successful!' : 'Check-in Failed'}
                    </h3>
                    <p className="text-gray-400 text-sm">{result.message}</p>
                  </div>
                </div>

                {result.registration && (
                  <div className="bg-dark-card rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white font-semibold">{result.registration.attendeeName}</span>
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{result.registration.attendeeEmail}</span>
                      <span className="text-gray-400">Event:</span>
                      <span className="text-white">{result.registration.eventTitle}</span>
                      <span className="text-gray-400">Reg ID:</span>
                      <span className="text-white font-mono text-xs">{result.registration.registrationId}</span>
                      {result.anomalyScore !== null && result.anomalyScore !== undefined && (
                        <>
                          <span className="text-gray-400">Risk Score:</span>
                          <span className={`font-semibold ${result.anomalyScore >= 0.8 ? 'text-red-400' : result.anomalyScore >= 0.6 ? 'text-amber-400' : 'text-green-400'}`}>
                            {result.anomalyScore.toFixed(3)} {result.anomalyScore >= 0.8 ? '🚫 High' : result.anomalyScore >= 0.6 ? '⚠️ Medium' : '✅ Low'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setResult(null); setManualCode('') }}
                  className="mt-4 w-full py-2.5 glass hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <HiRefresh /> Scan Another
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
