import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{backgroundColor: 'var(--otto-gray-900)'}}>
      <div className="w-full max-w-md text-center">
        <div className="border rounded-xl p-8" style={{backgroundColor: 'var(--otto-gray-800)', borderColor: 'var(--otto-gray-700)'}}>
          <h1 className="text-xl font-bold text-white">Password reset unavailable</h1>
          <div className="my-5 rounded-md border border-amber-800 bg-amber-900/30 p-3 text-sm text-amber-200">
            The Enterprise Platform auth service is temporarily unreachable, so reset tokens cannot be validated right now.
          </div>
          <p className="text-sm leading-6 text-gray-300">
            Use the primary OttoServ login if you already know your password. If you need account recovery, contact the operator/admin channel.
          </p>
          <Link href="/login" className="mt-5 inline-flex w-full justify-center rounded-md bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
            Back to OttoServ Login
          </Link>
        </div>
      </div>
    </div>
  );
}
