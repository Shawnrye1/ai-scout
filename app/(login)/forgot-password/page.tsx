'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../actions';
import { ActionState } from '@/lib/auth/middleware';

function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" fill="#0f2d52" />
      <path
        d="M20 10L28 26H12L20 10Z"
        fill="white"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    forgotPassword,
    { error: '' }
  );

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-100">

      <div className="sm:mx-auto sm:w-full sm:max-w-[440px]">
        {/* Logo - above the card */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Logo className="h-12 w-12" />
          </Link>
        </div>

        {/* White card container */}
        <div className="bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-200">
          {state?.success ? (
            <div className="px-6 py-8 sm:px-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Check your email</h3>
                <p className="mt-2 text-sm text-gray-500">{state.success}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Card header */}
              <div className="px-6 pt-8 pb-6 sm:px-8">
                <h1 className="text-center text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
                  Reset your password
                </h1>
                <p className="mt-2 text-center text-base text-gray-500">
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              {/* Form section */}
              <div className="px-6 pb-8 sm:px-8">
                <form className="space-y-5" action={formAction}>
                  <div>
                    <Label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email
                    </Label>
                    <div className="mt-1.5">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={50}
                        className="block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-[#0f2d52] focus:ring-[#0f2d52] text-base py-2.5 px-3.5"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  {state?.error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                      {state.error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full rounded-lg bg-[#0f2d52] py-2.5 text-base font-semibold text-white shadow-sm hover:bg-[#1a4a7a] focus:outline-none focus:ring-2 focus:ring-[#0f2d52] focus:ring-offset-2 disabled:opacity-50"
                    disabled={pending}
                  >
                    {pending ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Sending...
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Footer link - outside the card */}
        <p className="mt-6 text-center text-sm text-gray-600">
          <Link
            href="/sign-in"
            className="inline-flex items-center font-semibold text-[#0f2d52] hover:text-[#1a4a7a]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
