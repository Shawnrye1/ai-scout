"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { signIn, signUp } from "./actions";
import { ActionState } from "@/lib/auth/middleware";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function Login({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const priceId = searchParams.get("priceId");
  const inviteId = searchParams.get("inviteId");
  const [rememberMe, setRememberMe] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === "signin" ? signIn : signUp,
    { error: "" },
  );

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-[440px]">
        {/* Logo - above the card */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="text-2xl font-bold text-[#0f2d52]">
            AI Scout
          </Link>
        </div>

        {/* White card container */}
        <div className="bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-200">
          {/* Card header - inside the card */}
          <div className="px-6 pt-8 pb-6 sm:px-8">
            <h1 className="text-center text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              {mode === "signin"
                ? "Log in to your account"
                : "Create an account"}
            </h1>
            <p className="mt-2 text-center text-base text-gray-500">
              {mode === "signin"
                ? "Welcome back! Please enter your details."
                : "Start analyzing game film with AI."}
            </p>
          </div>

          {/* Form section */}
          <div className="px-6 pb-8 sm:px-8">
            <form className="space-y-5" action={formAction}>
              <input type="hidden" name="redirect" value={redirect || ""} />
              <input type="hidden" name="priceId" value={priceId || ""} />
              <input type="hidden" name="inviteId" value={inviteId || ""} />

              {/* Email Field */}
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
                    defaultValue={state.email}
                    required
                    maxLength={50}
                    className="block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-[#0f2d52] focus:ring-[#0f2d52] text-base py-2.5 px-3.5"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <Label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </Label>
                <div className="mt-1.5">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    defaultValue={state.password}
                    required
                    minLength={8}
                    maxLength={100}
                    className="block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-[#0f2d52] focus:ring-[#0f2d52] text-base py-2.5 px-3.5"
                    placeholder={
                      mode === "signin" ? "••••••••" : "Create a password"
                    }
                  />
                </div>
                {mode === "signup" && (
                  <p className="mt-1.5 text-sm text-gray-500">
                    Must be at least 8 characters.
                  </p>
                )}
              </div>

              {/* Remember me + Forgot password (sign in only) */}
              {mode === "signin" && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) =>
                        setRememberMe(checked as boolean)
                      }
                      className="border-gray-300 data-[state=checked]:bg-[#0f2d52] data-[state=checked]:border-[#0f2d52] focus:ring-[#0f2d52]"
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      Remember for 30 days
                    </Label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-[#0f2d52] hover:text-[#1a4a7a]"
                  >
                    Forgot password
                  </Link>
                </div>
              )}

              {/* Error message */}
              {state?.error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {state.error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full rounded-lg bg-[#0f2d52] py-2.5 text-base font-semibold text-white shadow-sm hover:bg-[#1a4a7a] focus:outline-none focus:ring-2 focus:ring-[#0f2d52] focus:ring-offset-2 disabled:opacity-50"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Loading...
                  </>
                ) : mode === "signin" ? (
                  "Sign in"
                ) : (
                  "Get started"
                )}
              </Button>

              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
                onClick={() => {
                  // TODO: Implement Google OAuth
                  console.log("Google sign in clicked");
                }}
              >
                <GoogleIcon className="mr-2 h-5 w-5" />
                Sign {mode === "signin" ? "in" : "up"} with Google
              </Button>
            </form>
          </div>
        </div>

        {/* Footer link - outside the card */}
        <p className="mt-6 text-center text-sm text-gray-600">
          {mode === "signin" ? (
            <>
              Don't have an account?{" "}
              <Link
                href={`/sign-up${redirect ? `?redirect=${redirect}` : ""}${
                  priceId ? `&priceId=${priceId}` : ""
                }`}
                className="font-semibold text-[#0f2d52] hover:text-[#1a4a7a]"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href={`/sign-in${redirect ? `?redirect=${redirect}` : ""}${
                  priceId ? `&priceId=${priceId}` : ""
                }`}
                className="font-semibold text-[#0f2d52] hover:text-[#1a4a7a]"
              >
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
