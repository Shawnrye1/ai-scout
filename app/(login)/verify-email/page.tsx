'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CircleIcon, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { verifyEmail } from '../actions';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    const verify = async () => {
      const formData = new FormData();
      formData.append('token', token);
      const result = await verifyEmail({ error: '' }, formData);

      if (result.success) {
        setStatus('success');
        setMessage(result.success);
      } else if (result.error) {
        setStatus('error');
        setMessage(result.error);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 text-orange-500 animate-spin" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Verifying your email...</h3>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Email verified!</h3>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
              >
                Go to Dashboard
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Verification failed</h3>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <div className="mt-6 space-y-2">
              <Link
                href="/dashboard"
                className="block text-sm font-medium text-orange-600 hover:text-orange-500"
              >
                Go to Dashboard
              </Link>
              <p className="text-sm text-gray-500">
                You can request a new verification email from your account settings.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <Loader2 className="mx-auto h-12 w-12 text-orange-500 animate-spin" />
            <p className="mt-4 text-gray-500">Loading...</p>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
