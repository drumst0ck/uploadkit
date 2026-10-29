import { redirect } from 'next/navigation';
import { auth, signIn } from '../../../auth';
import { Logo } from '../../components/logo';
import { parsePlanIntent, postLoginRedirect } from '../../lib/plan-intent';

// Force dynamic rendering — auth() reads the session cookie at runtime;
// static prerendering would always see an unauthenticated state.
export const dynamic = 'force-dynamic';

// ─── Server Actions ───────────────────────────────────────────────────────────

// The `plan` form field is client-controlled: it is re-validated here and only
// mapped to a fixed internal path (see lib/plan-intent.ts).
function redirectFromForm(formData: FormData): string {
  return postLoginRedirect(parsePlanIntent(formData.get('plan')));
}

async function signInWithGitHub(formData: FormData) {
  'use server';
  await signIn('github', { redirectTo: redirectFromForm(formData) });
}

async function signInWithGoogle(formData: FormData) {
  'use server';
  await signIn('google', { redirectTo: redirectFromForm(formData) });
}

async function signInWithEmail(formData: FormData) {
  'use server';
  const email = formData.get('email') as string;
  await signIn('resend', { email, redirectTo: redirectFromForm(formData) });
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
  searchParams: Promise<{ mode?: string; error?: string; plan?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Redirect already-authenticated users to dashboard
  const params = await searchParams;
  const plan = parsePlanIntent(params.plan);

  const session = await auth();
  if (session?.user) redirect(postLoginRedirect(plan));

  const isSignUp = params.mode === 'signup';
  const errorMessage = getErrorMessage(params.error);

  const heading = isSignUp ? 'Create your account' : 'Sign in to your account';
  const emailCTA = isSignUp ? 'Continue with email' : 'Send magic link';

  const secondary =
    'flex h-11 w-full items-center justify-center gap-3 rounded-full border border-border bg-transparent text-[15px] font-medium text-foreground transition-colors hover:bg-accent';

  return (
    <main className="min-h-screen bg-background px-6 py-16 md:px-16 lg:pl-[22vw]">
      <div className="w-full max-w-[400px]">
        <a href="https://uploadkit.dev" className="inline-flex" aria-label="UploadKit home">
          <Logo />
        </a>

        <h1 className="mt-16 text-[32px] font-medium leading-[1.1] tracking-[-0.02em] text-foreground">
          {heading}
        </h1>
        <p className="mt-3 text-[17px] leading-normal text-muted-foreground">
          {isSignUp
            ? 'Free plan included: 5 GB storage, no card required.'
            : 'Use the provider you signed up with.'}
        </p>

        {errorMessage && (
          <p role="alert" className="mt-8 rounded-md bg-card px-4 py-3 text-sm text-foreground">
            <span className="font-medium text-[var(--pd-color-status-danger,#ff6369)]">Error. </span>
            {errorMessage}
          </p>
        )}

        <div className="mt-10 flex flex-col gap-3">
          <form action={signInWithGitHub}>
            {plan && <input type="hidden" name="plan" value={plan} />}
            <button type="submit" className={secondary}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </form>

          <form action={signInWithGoogle}>
            {plan && <input type="hidden" name="plan" value={plan} />}
            <button type="submit" className={secondary}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </form>
        </div>

        <form action={signInWithEmail} className="mt-10 flex flex-col gap-3">
          {plan && <input type="hidden" name="plan" value={plan} />}
          <label htmlFor="email" className="text-sm text-muted-foreground">
            Or get a sign-in link by email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className="h-11 w-full rounded-full border border-border bg-card px-5 text-[15px] text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="h-11 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-transform hover:-translate-y-px active:translate-y-px motion-reduce:transform-none"
          >
            {emailCTA}
          </button>
        </form>

        <p className="mt-10 text-sm text-muted-foreground">
          {isSignUp ? 'Already have an account? ' : 'New to UploadKit? '}
          <a
            href={
              isSignUp
                ? plan ? `/login?plan=${plan}` : '/login'
                : plan ? `/login?mode=signup&plan=${plan}` : '/login?mode=signup'
            }
            className="text-foreground underline underline-offset-4"
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </a>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          By continuing, you agree to the{' '}
          <a href="/terms" className="underline underline-offset-4 hover:text-foreground">Terms of Service</a>{' '}
          and the{' '}
          <a href="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}
