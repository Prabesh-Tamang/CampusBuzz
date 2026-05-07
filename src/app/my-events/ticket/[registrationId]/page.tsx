import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import Registration from '@/models/Registration';
import Event from '@/models/Event';
import { format } from 'date-fns';
import PrintButton from './PrintButton';

export default async function TicketPage({
  params,
}: {
  params: { registrationId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');
  if (session.user.role === 'admin') redirect('/admin/dashboard');

  await connectDB();

  const registration = await Registration.findOne({
    registrationId: params.registrationId,
    userId: session.user.id,
  }).lean();

  // Allow access if: confirmed (free event) OR has a paymentId (paid event)
  const reg = registration as any;
  if (!reg || !reg.qrCode || (!reg.confirmed && !reg.paymentId)) {
    notFound();
  }

  const event = await Event.findById(reg.eventId).lean();
  if (!event) notFound();

  const ev = event as any;

  return (
    <>
      {/* Controls — hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-10 flex gap-3">
        <PrintButton />
        <a
          href="/my-events"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Back
        </a>
      </div>

      <div className="min-h-screen bg-white flex items-center justify-center p-8 print:p-4 print:flex print:items-start print:justify-center">
        <div className="w-full max-w-xs border-2 border-gray-200 rounded-2xl overflow-hidden shadow-xl print:shadow-none print:rounded-none print:border-black">
          {/* Header */}
          <div className="bg-teal-600 text-white p-6 text-center">
            <p className="text-xs font-medium opacity-70 mb-1 tracking-widest uppercase">
              CampusBuzz
            </p>
            <h1 className="text-lg font-bold leading-tight">{ev.title}</h1>
          </div>

          {/* Event info */}
          <div className="p-5 bg-white space-y-3">
            {[
              { label: 'Date', value: format(new Date(ev.date), 'MMM d, yyyy') },
              { label: 'Time', value: format(new Date(ev.date), 'h:mm a') },
              { label: 'Venue', value: ev.venue },
              { label: 'Attendee', value: session.user.name ?? 'Student' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm gap-4">
                <span className="text-gray-500 shrink-0">{label}</span>
                <span className="font-medium text-gray-900 text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Tear line */}
          <div className="relative border-t-2 border-dashed border-gray-300 mx-4">
            <div className="absolute -left-7 -top-3.5 w-7 h-7 rounded-full bg-gray-50 border-2 border-gray-200" />
            <div className="absolute -right-7 -top-3.5 w-7 h-7 rounded-full bg-gray-50 border-2 border-gray-200" />
          </div>

          {/* QR Code */}
          <div className="p-5 bg-white text-center">
            <p className="text-xs text-gray-400 mb-4">
              Scan at entrance for check-in
            </p>
            <div className="inline-block bg-white p-3 border-2 border-gray-100 rounded-xl shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reg.qrCode}
                alt="Entry QR Code"
                className="w-48 h-48 print:w-44 print:h-44"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 font-mono tracking-wider">
              {reg.registrationId}
            </p>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-5 py-3 text-center border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Non-transferable · Valid for one entry only
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { margin: 0; background: white; }
        }
      `}</style>
    </>
  );
}
