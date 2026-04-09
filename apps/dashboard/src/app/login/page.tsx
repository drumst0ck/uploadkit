import { redirect } from 'next/navigation';
import { auth, signIn } from '../../../auth';

// Force dynamic rendering — auth() reads the session cookie at runtime;
// static prerendering would always see an unauthenticated state.
export const dynamic = 'force-dynamic';

// ─── Server Actions ───────────────────────────────────────────────────────────

async function signInWithGitHub() {
  'use server';
  await signIn('github', { redirectTo: '/dashboard' });
}

async function signInWithGoogle() {
  'use server';
  await signIn('google', { redirectTo: '/dashboard' });
}

async function signInWithEmail(formData: FormData) {
  'use server';
  const email = formData.get('email') as string;
  await signIn('resend', { email, redirectTo: '/dashboard' });
}

// ─── Error messages map ───────────────────────────────────────────────────────

function getErrorMessage(error: string | undefined): string | null {
  if (!error) return null;
  switch (error) {
    case 'OAuthSignin':
    case 'OAuthCallback':
      return 'There was a problem signing in with your provider. Please try again.';
    case 'EmailSignin':
      return 'Could not send the magic link email. Please try again.';
    case 'Verification':
      return 'The magic link has expired. Please request a new one.';
    default:
      return 'An authentication error occurred. Please try again.';
  }
}

// ─── Page component ───────────────────────────────────────────────────────────

interface LoginPageProps {
  searchParams: Promise<{ mode?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Redirect already-authenticated users to dashboard
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  const params = await searchParams;
  const isSignUp = params.mode === 'signup';
  const errorMessage = getErrorMessage(params.error);

  const heading = isSignUp ? 'Create your account' : 'Sign in to your account';
  const emailCTA = isSignUp ? 'Continue with email' : 'Send magic link';

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            UploadKit
          </span>
          <p className="mt-2 text-sm text-muted-foreground">{heading}</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-2xl">
          {/* Error banner */}
          {errorMessage && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Social providers — primary auth path (D-03) */}
          <div className="flex flex-col gap-3">
            {/* GitHub */}
            <form action={signInWithGitHub}>
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border bg-[#1c1c1e] text-sm font-medium text-foreground transition-colors hover:bg-[#252528] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141416]"
              >
                {/* GitHub Octicon SVG */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                Sign in with GitHub
              </button>
            </form>

            {/* Google */}
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border bg-[#1c1c1e] text-sm font-medium text-foreground transition-colors hover:bg-[#252528] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141416]"
              >
                {/* Google G logo SVG */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
            </form>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-accent" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-accent" />
          </div>

          {/* Email magic link form */}
          <form action={signInWithEmail} className="flex flex-col gap-3">
            <div>
              {/* Visually hidden label for accessibility */}
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="h-11 w-full rounded-lg border border-border bg-[#1c1c1e] px-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              type="submit"
              className="h-11 w-full rounded-lg bg-indigo-500 text-sm font-medium text-foreground transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141416]"
            >
              {emailCTA}
            </button>
          </form>
        </div>

        {/* Sign-in / Sign-up mode toggle (D-01) — cosmetic only */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <a
                href="/login"
                className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Sign in
              </a>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <a
                href="/login?mode=signup"
                className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Sign up
              </a>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
