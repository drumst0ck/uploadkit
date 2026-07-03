import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from './logo';

interface LegalPageProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function LegalPage({ title, description, children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/login"
            aria-label="UploadKit home"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Logo size={30} />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Back to sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-24">
        <aside className="lg:sticky lg:top-12 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
            Legal
          </p>
          <nav aria-label="Legal pages" className="mt-5 flex gap-5 text-sm lg:flex-col lg:gap-3">
            <Link className="text-muted-foreground hover:text-foreground" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/terms">
              Terms of Service
            </Link>
          </nav>
        </aside>

        <article className="min-w-0">
          <header className="border-b border-border pb-10">
            <p className="text-sm text-muted-foreground">Effective July 3, 2026</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p>
          </header>
          <div className="legal-content mt-10 space-y-10 text-[15px] leading-7 text-muted-foreground">
            {children}
          </div>
        </article>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 UploadKit. All rights reserved.</span>
          <a className="hover:text-foreground" href="mailto:support@uploadkit.dev">
            support@uploadkit.dev
          </a>
        </div>
      </footer>
    </main>
  );
}
