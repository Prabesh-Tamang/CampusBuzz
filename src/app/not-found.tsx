import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-extrabold text-teal-500/20 mb-4 select-none">
          404
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3">
          Page not found
        </h1>
        <p className="text-gray-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500
                     text-white rounded-xl font-semibold transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
