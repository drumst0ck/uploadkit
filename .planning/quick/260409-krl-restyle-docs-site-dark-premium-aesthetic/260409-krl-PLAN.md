---
phase: quick-260409-krl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/docs/src/fonts/Satoshi-Regular.woff2
  - apps/docs/src/fonts/Satoshi-Medium.woff2
  - apps/docs/src/fonts/Satoshi-Bold.woff2
  - apps/docs/src/fonts/Satoshi-Black.woff2
  - apps/docs/src/lib/fonts.ts
  - apps/docs/src/app/layout.tsx
  - apps/docs/src/app/global.css
  - apps/docs/src/lib/layout.shared.tsx
  - apps/docs/public/favicon.svg
autonomous: true
requirements: []
must_haves:
  truths:
    - "Docs site renders with near-black background (#0a0a0b) and white foreground in dark mode"
    - "Satoshi font is applied to all headings; Inter to body text"
    - "Indigo (#6366f1) accent visible on active sidebar links, inline code, and links"
    - "Code blocks have #0d1117 background with subtle border"
    - "Favicon matches apps/web (uploadkit SVG)"
    - "Build completes with zero errors"
  artifacts:
    - path: "apps/docs/src/fonts/Satoshi-Regular.woff2"
      provides: "Satoshi font — regular weight"
    - path: "apps/docs/src/lib/fonts.ts"
      provides: "localFont + Inter font exports with CSS variables"
    - path: "apps/docs/src/app/layout.tsx"
      provides: "Root layout with dark mode forced, font vars on <html>"
    - path: "apps/docs/src/app/global.css"
      provides: "fumadocs token overrides for UploadKit palette"
    - path: "apps/docs/public/favicon.svg"
      provides: "UploadKit favicon"
  key_links:
    - from: "apps/docs/src/lib/fonts.ts"
      to: "apps/docs/src/app/layout.tsx"
      via: "named import of satoshi and inter"
      pattern: "import.*fonts"
    - from: "apps/docs/src/app/global.css"
      to: "fumadocs-ui dark tokens"
      via: ".dark { --color-fd-* } overrides after @import"
      pattern: "--color-fd-background"
---

<objective>
Restyle the docs site from stock fumadocs neutral to UploadKit's dark premium aesthetic.

Purpose: The docs site is the first thing developers see after the landing page. Stock fumadocs destroys brand perception — it must look like it belongs to the same product as uploadkit.dev.
Output: Dark docs site with indigo accent, Satoshi/Inter fonts, polished code blocks, and UploadKit favicon.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<interfaces>
<!-- fumadocs v16.7.10 CSS variable system — confirmed from node_modules -->
<!--
Variable names live in fumadocs-ui/css/lib/default-colors.css.
They are declared inside Tailwind v4 @theme {} blocks (light) and .dark {} class (dark).
To override: declare .dark { --color-fd-* } AFTER the @import lines in global.css.
This is the documented fumadocs override pattern (same approach as neutral.css which
overrides --color-fd-muted/secondary/muted-foreground on .dark #nd-sidebar).

Dark-mode defaults (what we're overriding):
  --color-fd-background: hsl(0, 0%, 7.04%)     → #0a0a0b
  --color-fd-foreground: hsl(0, 0%, 92%)        → #fafafa
  --color-fd-muted: hsl(0, 0%, 12.9%)           → #1e1e22
  --color-fd-muted-foreground: hsla(0,0%,70%,0.8) → #a1a1aa
  --color-fd-popover: hsl(0, 0%, 11.6%)         → #141416
  --color-fd-popover-foreground: hsl(0, 0%, 86.9%) → #fafafa
  --color-fd-card: hsl(0, 0%, 9.8%)             → #141416
  --color-fd-card-foreground: hsl(0, 0%, 98%)   → #fafafa
  --color-fd-border: hsla(0,0%,40%,20%)          → rgba(255,255,255,0.06)
  --color-fd-primary: hsl(0, 0%, 98%)           → #6366f1  ← KEY: this drives active states
  --color-fd-primary-foreground: hsl(0, 0%, 9%) → #ffffff
  --color-fd-secondary: hsl(0, 0%, 12.9%)       → #1e1e22
  --color-fd-accent: hsla(0,0%,40.9%,30%)       → #6366f1 at 15% opacity
  --color-fd-ring: hsl(0, 0%, 54.9%)            → #6366f1

apps/web font pattern (already established):
  // apps/web/src/lib/fonts.ts
  import localFont from 'next/font/local'
  import { Inter } from 'next/font/google'
  export const satoshi = localFont({
    src: [
      { path: '../fonts/Satoshi-Regular.woff2', weight: '400', style: 'normal' },
      { path: '../fonts/Satoshi-Medium.woff2',  weight: '500', style: 'normal' },
      { path: '../fonts/Satoshi-Bold.woff2',    weight: '700', style: 'normal' },
      { path: '../fonts/Satoshi-Black.woff2',   weight: '900', style: 'normal' },
    ],
    variable: '--font-satoshi',
    display: 'swap',
  })
  export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

apps/web layout pattern:
  import { satoshi, inter } from '@/lib/fonts'
  <html lang="en" data-theme="dark" className={`${satoshi.variable} ${inter.variable}`}>
    <body className="antialiased">{children}</body>
  </html>

fumadocs RootProvider (from apps/docs/src/app/layout.tsx):
  import { RootProvider } from 'fumadocs-ui/provider/next'
  // RootProvider handles theme context — adding className="dark" to <html> forces dark mode
-->
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Fonts, layout.tsx, and global.css overhaul</name>
  <files>
    apps/docs/src/fonts/Satoshi-Regular.woff2
    apps/docs/src/fonts/Satoshi-Medium.woff2
    apps/docs/src/fonts/Satoshi-Bold.woff2
    apps/docs/src/fonts/Satoshi-Black.woff2
    apps/docs/src/lib/fonts.ts
    apps/docs/src/app/layout.tsx
    apps/docs/src/app/global.css
  </files>
  <action>
**Step A — Copy Satoshi font files:**
```bash
mkdir -p apps/docs/src/fonts
cp apps/web/src/fonts/Satoshi-Regular.woff2 apps/docs/src/fonts/
cp apps/web/src/fonts/Satoshi-Medium.woff2  apps/docs/src/fonts/
cp apps/web/src/fonts/Satoshi-Bold.woff2    apps/docs/src/fonts/
cp apps/web/src/fonts/Satoshi-Black.woff2   apps/docs/src/fonts/
```

**Step B — Create `apps/docs/src/lib/fonts.ts`:**
Mirror exactly from `apps/web/src/lib/fonts.ts`. Font file paths are relative to `fonts.ts` location, so `../fonts/Satoshi-*.woff2` resolves correctly from `src/lib/` to `src/fonts/`.

```typescript
import localFont from 'next/font/local'
import { Inter } from 'next/font/google'

export const satoshi = localFont({
  src: [
    { path: '../fonts/Satoshi-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/Satoshi-Medium.woff2',  weight: '500', style: 'normal' },
    { path: '../fonts/Satoshi-Bold.woff2',    weight: '700', style: 'normal' },
    { path: '../fonts/Satoshi-Black.woff2',   weight: '900', style: 'normal' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
```

**Step C — Rewrite `apps/docs/src/app/layout.tsx`:**
Keep `RootProvider` from fumadocs. Add `className="dark"` to `<html>` to force dark mode (fumadocs reads this class). Add font variables. Add `antialiased` to body. Add favicon metadata.

```typescript
import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { satoshi, inter } from '@/lib/fonts';
import './global.css';

export const metadata: Metadata = {
  title: 'UploadKit Docs',
  description: 'UploadKit documentation — file upload as a service for developers.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${satoshi.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
```

**Step D — Rewrite `apps/docs/src/app/global.css`:**
Keep the three fumadocs @import lines first (order is critical — overrides must come after). Then add `.dark {}` block with UploadKit palette overrides. The `.dark` selector matches the class we added to `<html>`.

Note on fumadocs v16 variable system: `default-colors.css` declares dark overrides inside a `.dark {}` block. Redeclaring the same variables inside a later `.dark {}` block in our CSS will win via cascade (last declaration wins). This is the same pattern fumadocs uses in `neutral.css`.

```css
@import 'tailwindcss';
@import 'fumadocs-ui/css/neutral.css';
@import 'fumadocs-ui/css/preset.css';

/* ─── UploadKit Brand Overrides ─────────────────────── */
/* Override fumadocs dark-mode tokens with UploadKit palette.
   Variables confirmed from fumadocs-ui@16.7.10/css/lib/default-colors.css.
   Must appear after @import lines so cascade order wins. */

.dark {
  --color-fd-background: #0a0a0b;
  --color-fd-foreground: #fafafa;
  --color-fd-card: #141416;
  --color-fd-card-foreground: #fafafa;
  --color-fd-popover: #141416;
  --color-fd-popover-foreground: #fafafa;
  --color-fd-primary: #6366f1;
  --color-fd-primary-foreground: #ffffff;
  --color-fd-secondary: #1e1e22;
  --color-fd-secondary-foreground: #fafafa;
  --color-fd-muted: #1e1e22;
  --color-fd-muted-foreground: #a1a1aa;
  --color-fd-accent: rgba(99, 102, 241, 0.15);
  --color-fd-accent-foreground: #ffffff;
  --color-fd-border: rgba(255, 255, 255, 0.06);
  --color-fd-ring: #6366f1;
}

/* ─── Typography ─────────────────────────────────────── */
body {
  font-family: var(--font-inter, system-ui, sans-serif);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-satoshi, system-ui, sans-serif);
  letter-spacing: -0.02em;
}

/* ─── Code blocks ────────────────────────────────────── */
/* Darker background than fumadocs default, matching GitHub dark */
pre {
  background: #0d1117 !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  border-radius: 12px !important;
}

/* Inline code — indigo tint */
:not(pre) > code {
  background: rgba(99, 102, 241, 0.12) !important;
  color: #a5b4fc !important;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.875em;
}

/* ─── Links ──────────────────────────────────────────── */
.prose a {
  color: #818cf8;
  text-decoration: none;
  transition: color 0.15s ease;
}

.prose a:hover {
  color: #6366f1;
  text-decoration: underline;
}

/* ─── Tables ─────────────────────────────────────────── */
th {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

td, th {
  padding: 0.75rem 1rem;
}

/* ─── Scrollbar ──────────────────────────────────────── */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
```
  </action>
  <verify>
    <automated>cd /Users/drumstock/Developer/GitHub/uploadkit && ls apps/docs/src/fonts/Satoshi-*.woff2 && node -e "require('fs').readFileSync('apps/docs/src/lib/fonts.ts')" 2>/dev/null && echo "Files OK"</automated>
  </verify>
  <done>
    - 4 Satoshi woff2 files exist in apps/docs/src/fonts/
    - apps/docs/src/lib/fonts.ts exports satoshi and inter with CSS variables
    - apps/docs/src/app/layout.tsx has className="dark" on html, font variables, antialiased, favicon metadata
    - apps/docs/src/app/global.css has .dark {} block with all --color-fd-* overrides after the @import lines
  </done>
</task>

<task type="auto">
  <name>Task 2: Logo, favicon, and build verification</name>
  <files>
    apps/docs/src/lib/layout.shared.tsx
    apps/docs/public/favicon.svg
  </files>
  <action>
**Step A — Copy favicon:**
```bash
mkdir -p apps/docs/public
cp apps/web/public/favicon.svg apps/docs/public/favicon.svg
```

**Step B — Update `apps/docs/src/lib/layout.shared.tsx`:**
Replace the plain text nav title with an inline SVG logo that matches the UploadKit brand. The SVG should be simple — the "UK" wordmark or the uploadkit arrow-in-box mark used on the web app.

Read `apps/web/public/favicon.svg` first to understand the mark shape, then adapt it as an inline SVG for the nav title (max 28px height, white fill on dark).

Replace the nav.title string with a React element using the SVG mark + "UploadKit" text. Also add a link back to the marketing site and update the GitHub URL to the correct org/repo.

```tsx
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

function UploadKitLogo() {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Inline SVG mark — same shape as favicon.svg but 20x20 */}
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* EXECUTOR: Read apps/web/public/favicon.svg and reproduce its path data here at 32x32 viewBox, fill="currentColor" */}
      </svg>
      <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em' }}>
        UploadKit
      </span>
    </span>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <UploadKitLogo />,
      url: 'https://uploadkit.dev',
    },
    githubUrl: 'https://github.com/uploadkit/uploadkit',
    links: [
      { text: 'Docs', url: '/docs', active: 'nested-url' },
      { text: 'uploadkit.dev', url: 'https://uploadkit.dev' },
    ],
  };
}
```

**Important:** After reading `apps/web/public/favicon.svg`, fill in the actual SVG path data for the UploadKitLogo component. Do not leave the comment placeholder in the final file.

The file extension is `.tsx` not `.ts` — it already is `layout.shared.tsx`, keep that.

**Step C — Build verification:**
```bash
cd /Users/drumstock/Developer/GitHub/uploadkit && pnpm turbo build --filter=@uploadkit/docs 2>&1 | tail -30
```

If the build fails:
- Check for TypeScript errors in the new layout files
- If `.dark {}` overrides cause Tailwind v4 parse errors, wrap them in `@layer base { .dark { ... } }` — Tailwind v4 CSS-first config sometimes requires layer context for class-based overrides
- If `localFont` path resolution fails, verify the relative path from `src/lib/fonts.ts` to `src/fonts/`
- If RootProvider theme conflicts with forced `className="dark"`, add `defaultTheme="dark"` prop to RootProvider: `<RootProvider theme={{ defaultTheme: 'dark' }}>`
  </action>
  <verify>
    <automated>cd /Users/drumstock/Developer/GitHub/uploadkit && pnpm turbo build --filter=@uploadkit/docs 2>&1 | grep -E "(error|Error|BUILD|success|Route)" | tail -20</automated>
  </verify>
  <done>
    - apps/docs/public/favicon.svg exists (copy of web favicon)
    - apps/docs/src/lib/layout.shared.tsx renders inline SVG logo + "UploadKit" text in nav
    - `pnpm turbo build --filter=@uploadkit/docs` exits 0 with no TypeScript or CSS errors
  </done>
</task>

</tasks>

<verification>
After both tasks:
1. `ls apps/docs/src/fonts/` shows 4 Satoshi woff2 files
2. `ls apps/docs/public/favicon.svg` exists
3. `pnpm turbo build --filter=@uploadkit/docs` exits 0
4. Run `pnpm --filter=@uploadkit/docs dev` and visit http://localhost:3003/docs — background should be near-black, headings in Satoshi, active sidebar link indigo, inline code with indigo tint
</verification>

<success_criteria>
- Dark premium aesthetic applied: near-black surface, indigo accent, Satoshi headings
- Zero fumadocs functionality broken (sidebar, search, TOC, code blocks all work)
- Build passes with no errors
- Favicon matches uploadkit.dev
</success_criteria>

<output>
After completion, create `.planning/quick/260409-krl-restyle-docs-site-dark-premium-aesthetic/260409-krl-SUMMARY.md`
</output>
