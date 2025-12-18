'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../actions';
import { ActionState } from '@/lib/auth/middleware';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPassword,
    { error: '' }
  );

  if (!token) {
    return (
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Invalid reset link</h3>
          <p className="mt-2 text-sm text-gray-500">This password reset link is invalid or has expired.</p>
          <div className="mt-6">
            <Link
              href="/forgot-password"
              className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-500"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {state?.success ? (
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Password reset successful</h3>
            <p className="mt-2 text-sm text-gray-500">{state.success}</p>
            <div className="mt-6">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <form className="space-y-6" action={formAction}>
          <input type="hidden" name="token" value={token} />

          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New password
            </Label>
            <div className="mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter new password"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm new password
            </Label>
            <div className="mt-1">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          {state?.error && (
            <div className="text-red-500 text-sm">{state.error}</div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </Button>
          </div>

          <div className="text-center">
            <Link
              href="/sign-in"
              className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-500"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set new password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your new password below
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
