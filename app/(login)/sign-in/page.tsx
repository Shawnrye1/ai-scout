import { Suspense } from 'react';
import { Zap } from 'lucide-react';
import Link from 'next/link';
import { LoginForm } from '@/components/ui/login-form';

function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Zap className="size-4" />
    </div>
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
              <Logo className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground" />
              Outreach Engine
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <LoginForm />
            </div>
          </div>
        </div>

        {/* Right side - Motivational image/message */}
        <div className="relative hidden bg-muted lg:block">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/90 via-neutral-900/70 to-neutral-800/90" />

          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Content */}
          <div className="relative flex h-full flex-col items-center justify-center p-12 text-white">
            <div className="max-w-md text-center">
              {/* Icon */}
              <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Zap className="size-8 text-white" />
              </div>

              {/* Quote */}
              <blockquote className="mb-6">
                <p className="text-2xl font-medium leading-relaxed">
                  "The best time to plant a tree was 20 years ago. The second best time is now."
                </p>
              </blockquote>

              <p className="text-lg text-white/70">
                — Chinese Proverb
              </p>

              {/* Stats or features */}
              <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
                <div>
                  <div className="text-2xl font-bold">Email</div>
                  <div className="text-sm text-white/60">Outreach</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">Phone</div>
                  <div className="text-sm text-white/60">AI Calls</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">SMS</div>
                  <div className="text-sm text-white/60">Messaging</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
