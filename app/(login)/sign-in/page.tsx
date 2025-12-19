import { Suspense } from 'react';
import { Play } from 'lucide-react';
import Link from 'next/link';
import { LoginForm } from '@/components/ui/login-form';

function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" fill="#0f2d52" />
      <circle cx="20" cy="16" r="4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M12 28L20 20L28 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="28" r="2" fill="white" />
      <circle cx="28" cy="28" r="2" fill="white" />
    </svg>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <div className="grid min-h-svh lg:grid-cols-2">
        {/* Left side - Login form */}
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <Link href="/" className="flex items-center gap-2 font-medium">
              <Logo className="size-6" />
              AI Scout
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <LoginForm />
            </div>
          </div>
        </div>

        {/* Right side - Sports quote */}
        <div className="relative hidden bg-muted lg:block">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f2d52]/95 via-[#0f2d52]/80 to-[#1a4a7a]/90" />

          {/* Background pattern - field lines */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1'%3E%3Cpath d='M0 50h100M50 0v100'/%3E%3Ccircle cx='50' cy='50' r='20'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Content */}
          <div className="relative flex h-full flex-col items-center justify-center p-12 text-white">
            <div className="max-w-md text-center">
              {/* Icon */}
              <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Play className="size-8 text-white" />
              </div>

              {/* Quote */}
              <blockquote className="mb-6">
                <p className="text-2xl font-medium leading-relaxed">
                  "The difference between ordinary and extraordinary is that little extra."
                </p>
              </blockquote>

              <p className="text-lg text-white/70">
                — Jimmy Johnson
              </p>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
                <div>
                  <div className="text-2xl font-bold">Players</div>
                  <div className="text-sm text-white/60">Tracked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">Games</div>
                  <div className="text-sm text-white/60">Analyzed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">Reports</div>
                  <div className="text-sm text-white/60">Generated</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
