import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{backgroundColor: 'var(--otto-gray-900)'}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
            OttoServ
          </Link>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-medium">Enterprise Platform</p>
          <h1 className="text-xl font-bold text-white mt-5">Password reset unavailable</h1>
          <p className="text-gray-400 text-sm mt-1">The platform auth service is temporarily unreachable.</p>
        </div>

        <div className="border rounded-xl p-8" style={{backgroundColor: 'var(--otto-gray-800)', borderColor: 'var(--otto-gray-700)'}}>
          <div className="mb-5 rounded-md border border-amber-800 bg-amber-900/30 p-3 text-sm text-amber-200">
            Password reset is temporarily unavailable because the Enterprise Platform auth service is not reachable. No reset request was sent.
          </div>
          <p className="text-sm leading-6 text-gray-300">
            Use the primary OttoServ login if you know your password. If you need a reset, contact the operator/admin channel so the platform account can be recovered without creating a parallel login.
          </p>
          <Link href="/login" className="mt-5 inline-flex w-full justify-center rounded-md bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
            Back to OttoServ Login
          </Link>
        </div>
      </div>
    </div>
  );
}
