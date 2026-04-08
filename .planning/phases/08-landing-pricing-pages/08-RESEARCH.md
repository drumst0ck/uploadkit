# Phase 8: Landing & Pricing Pages - Research

**Researched:** 2026-04-07
**Domain:** Next.js 16 App Router — marketing site, syntax highlighting, live component preview, CSS animations, SEO
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dark + gradient aesthetic — dark background (#0a0a0b), subtle gradient mesh accents, indigo/blue glow effects. Vercel/Linear tech-forward style.
- **D-02:** Typography: Satoshi for headings (geometric, modern), Inter for body text. Strong tech identity.
- **D-03:** Hero: large headline + animated code snippet showing 3-line integration. "5GB free forever" badge. Two CTAs: "Get started free" + "View docs".
- **D-04:** Shiki for syntax highlighting (build-time SSG). Zero client JS for code blocks. Best performance.
- **D-05:** Live rendered component preview — actually render UploadButton/UploadDropzone/UploadModal next to the code. Interactive, imports @uploadkit/react. Dark/light toggle for the preview.
- **D-06:** Monthly/yearly toggle as a switch with "Save 20%" badge next to "Yearly" label. Promotional style.
- **D-07:** 4 equal tier cards side by side: Free, Pro ($15/mo), Team ($35/mo), Enterprise ("Contact Sales"). Pro card highlighted as "Most Popular".
- **D-08:** CSS transitions + IntersectionObserver for scroll-triggered animations. No JS animation library. Lighthouse 90+ target.
- **D-09:** Static pre-designed OG images in /public — one for homepage, one for pricing page. Simple and fast.

### Claude's Discretion
- Gradient mesh implementation details
- Feature grid icon design (inline SVG vs lucide)
- Competitor comparison table wording (subtle, "Others" not named)
- Component showcase interactive design
- Footer layout and link structure
- Noise texture implementation (CSS vs image)
- Specific Shiki theme selection
- Navigation header design (sticky, transparent, etc.)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAND-01 | Hero section with headline, subheadline, CTAs, animated code snippet, "5GB free" badge | Shiki singleton + CSS keyframe animation; next/font for zero-CLS fonts |
| LAND-02 | Interactive code demo with tabs (Next.js, React, API) and live component preview | Shiki codeToHtml in async Server Component; client island for tab state + live preview |
| LAND-03 | Features grid (3x2) — managed storage, BYOS, components, type-safety, direct uploads, dashboard | Pure CSS Grid + IntersectionObserver stagger; inline SVG for icons (zero dependency) |
| LAND-04 | Competitor comparison table (subtle, "Others" not named) | Semantic `<table>` with sticky header; CSS-only checkmark/x icons |
| LAND-05 | Component showcase with interactive demos (UploadButton, UploadDropzone, UploadModal) + dark/light toggle | Client island with `data-theme` toggling; imports @uploadkit/react + styles.css |
| LAND-06 | Pricing preview (3 cards: Free/Pro/Team) with CTA to /pricing | Static data from TIER_LIMITS; links to /pricing |
| LAND-07 | Footer with links (Docs, GitHub, Twitter, Discord, Status) | Static HTML/CSS; semantic `<footer>` |
| LAND-08 | Motion animations (entrance stagger, hover effects, scroll-triggered) | IntersectionObserver + CSS `@keyframes`; `prefers-reduced-motion` guard |
| LAND-09 | Responsive (375px, 768px, 1024px, 1440px) + dark mode | Tailwind v4 responsive utilities; `prefers-color-scheme` + `[data-theme]` |
| LAND-10 | SEO (metadata, OG images, structured data) | Next.js `export const metadata`; static `/public/opengraph-image.png`; JSON-LD via `<script type="application/ld+json">` |
| PRICE-01 | Pricing table with monthly/yearly toggle (20% annual discount) | Client island with `useState` for toggle; CSS switch; yearly prices = monthly × 0.8 |
| PRICE-02 | Four tiers: Free, Pro ($15/mo), Team ($35/mo), Enterprise (contact) | Authoritative data: TIER_LIMITS + GSD §5.3 |
| PRICE-03 | Feature comparison matrix with all tier differences | `<table>` with sticky first column; data from TIER_LIMITS + GSD §5.3 |
| PRICE-04 | Overage pricing section ($0.02/GB storage, $0.01/GB BW, $0.001/upload) | Static copy from GSD §5.3; no dynamic data needed |
</phase_requirements>

---

## Summary

Phase 8 builds the public marketing site (`apps/web`) from a mostly-empty Next.js 16 App Router skeleton. The page stub (`page.tsx`) and layout (`layout.tsx`) exist but have no content. The globals.css already imports the shared Tailwind v4 base via `@uploadkit/config/tailwind/base.css`, which provides the design token foundation (`--color-surface: #0a0a0b`, `--color-accent: #6366f1`, etc.) — but the base tokens use Geist fonts and must be extended/overridden for Satoshi + Inter.

The site is fully static: no auth, no API calls at render time. Shiki performs syntax highlighting at build time inside async React Server Components. The live component preview and pricing toggle are the only client islands (`"use client"`). Everything else — hero, features grid, comparison table, footer — is pure server-rendered HTML + CSS. This architecture trivially achieves Lighthouse 90+ because it ships almost no JavaScript.

**Primary recommendation:** Build sections as isolated Server Component modules, add one shared `useIntersection` custom hook (client) for scroll animations, and use a Shiki singleton cached at module scope across builds.

---

## Authoritative Data Sources (Tier Limits)

**CRITICAL: The GSD document (§5.3) and `TIER_LIMITS` in `packages/shared/src/constants.ts` differ. `constants.ts` is code-of-record.** Use `constants.ts` values for all pricing copy.

| Tier | Storage | Bandwidth | Max file | Uploads/mo | Projects | File routes |
|------|---------|-----------|----------|------------|----------|-------------|
| Free | 5 GB | 2 GB | 4 MB | 1,000 | 2 | 3 [ASSUMED from GSD §5.3] |
| Pro ($15/mo) | 100 GB | 200 GB | 512 MB | 50,000 | 10 | 10 [ASSUMED from GSD §5.3] |
| Team ($35/mo) | 1 TB | 2 TB | 5 GB | 500,000 | 50 | Unlimited [ASSUMED from GSD §5.3] |
| Enterprise | Unlimited | Unlimited | 10 GB | Unlimited | Unlimited | Unlimited [ASSUMED] |

Fields not in `TIER_LIMITS` (file routes, team members, analytics, support tier, webhooks, SLA, SOC 2, custom CDN) come from GSD §5.3 `[ASSUMED]` — cross-check before writing copy.

---

## Standard Stack

### Core (already in apps/web/package.json)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.3 [VERIFIED: npm registry] | App Router framework | Project standard |
| react | latest | UI | Project standard |
| tailwindcss | latest (v4) | Utility CSS | Project standard |
| @uploadkit/ui | workspace:* | Internal shared components | Project standard |

### New dependencies to add
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| shiki | 4.0.2 [VERIFIED: npm registry] | Build-time syntax highlighting | Zero client JS; async Server Component only |
| @fontsource-variable/inter | 5.2.8 [VERIFIED: npm registry] | Inter variable font (body) | Self-hosted, no Google DNS; or use next/font/google |

### Font loading strategy (Satoshi)
Satoshi is **not available on npm/Fontsource** [VERIFIED: npm 404 for @fontsource/satoshi]. Two valid approaches:

**Option A — next/font/local (recommended):**
Download Satoshi `.woff2` files from Fontshare (fontshare.com/fonts/satoshi, free for commercial use [ASSUMED — verify license]), place in `apps/web/public/fonts/`, load via `next/font/local` in `layout.tsx`. Zero FOUT, automatic size-adjust preloading.

**Option B — Fontshare CDN @import:**
`@import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap')` in globals.css. Simpler but adds third-party DNS lookup (minor LCP impact).

**Recommendation:** Option A (`next/font/local`) — consistent with project's `output: 'standalone'` Docker setup and `prefers-color-scheme` dark mode first-class treatment. Avoids external DNS at render time.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shiki | highlight.js / prism | Shiki is locked decision D-04; better token-level theming |
| next/font/local | Google Fonts CDN | Privacy + no external roundtrip; mandatory for Docker standalone |
| IntersectionObserver | Framer Motion / GSAP | Locked decision D-08; no extra JS |
| Static OG | next/og dynamic | Locked decision D-09; static is simpler and faster |

**Installation:**
```bash
pnpm add shiki @fontsource-variable/inter --filter @uploadkit/web
# If using next/font/local for Satoshi: download .woff2 from fontshare, no npm install
```

---

## Architecture Patterns

### Recommended Page Structure
```
apps/web/src/
├── app/
│   ├── layout.tsx           # Root layout: fonts, dark mode, metadata defaults
│   ├── globals.css          # Existing; extend with Satoshi @font-face + page tokens
│   ├── page.tsx             # Homepage: composes section Server Components
│   ├── pricing/
│   │   └── page.tsx         # Pricing page
│   ├── opengraph-image.png  # Static OG for homepage (Next.js file convention)
│   └── pricing/
│       └── opengraph-image.png  # Static OG for pricing
├── components/
│   ├── nav/
│   │   └── navbar.tsx       # Server Component; sticky transparent → opaque on scroll (CSS only or thin client)
│   ├── hero/
│   │   ├── hero.tsx         # Server Component
│   │   └── hero-code.tsx    # async Server Component — Shiki highlight, dangerouslySetInnerHTML
│   ├── code-demo/
│   │   ├── code-demo.tsx    # Outer Server Component
│   │   └── code-demo-client.tsx  # "use client" — tab state + live preview island
│   ├── features/
│   │   └── features-grid.tsx    # Server Component
│   ├── comparison/
│   │   └── comparison-table.tsx # Server Component
│   ├── showcase/
│   │   └── component-showcase.tsx # "use client" — renders @uploadkit/react components
│   ├── pricing-preview/
│   │   └── pricing-preview.tsx  # Server Component (3 cards, links to /pricing)
│   ├── pricing/
│   │   ├── pricing-toggle.tsx   # "use client" — monthly/yearly switch
│   │   ├── tier-card.tsx        # Server Component (receives price prop from toggle)
│   │   └── comparison-matrix.tsx # Server Component
│   └── footer/
│       └── footer.tsx           # Server Component
├── lib/
│   ├── shiki.ts             # Singleton highlighter module (cached Promise)
│   └── tier-data.ts         # Formatted tier data from @uploadkit/shared constants
└── hooks/
    └── use-intersection.ts  # "use client" — IntersectionObserver hook
```

### Pattern 1: Shiki Singleton at Module Scope
**What:** Cache the `createHighlighter` Promise at module level so Next.js build process creates it once, reuses across all RSC renders.
**When to use:** Every code block component in the site.

```typescript
// Source: https://shiki.style/packages/next
// apps/web/src/lib/shiki.ts
import { createHighlighter } from 'shiki'

// Singleton — awaited lazily per call, Promise created once
const highlighterPromise = createHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: ['typescript', 'tsx', 'bash', 'json'],
})

export async function highlight(code: string, lang: string, theme = 'github-dark') {
  const highlighter = await highlighterPromise
  return highlighter.codeToHtml(code, { lang, theme })
}
```

```typescript
// apps/web/src/components/hero/hero-code.tsx
import { highlight } from '@/lib/shiki'

export default async function HeroCode({ code }: { code: string }) {
  const html = await highlight(code, 'typescript')
  return (
    <div
      className="hero-code"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

### Pattern 2: Client Island for Interactive Sections
**What:** Server Component renders the static shell; one thin `"use client"` child handles interactive state.
**When to use:** Code demo tabs, pricing toggle, component showcase dark/light toggle.

```typescript
// Source: Next.js App Router Client Component Islands pattern
// apps/web/src/components/code-demo/code-demo-client.tsx
'use client'

import { useState } from 'react'
import { UploadKitProvider, UploadButton } from '@uploadkit/react'
import '@uploadkit/react/styles.css'

type Tab = 'nextjs' | 'react' | 'api'

interface CodeDemoClientProps {
  // Pre-rendered HTML from Shiki passed from Server Component parent
  nextjsHtml: string
  reactHtml: string
  apiHtml: string
}

export function CodeDemoClient({ nextjsHtml, reactHtml, apiHtml }: CodeDemoClientProps) {
  const [tab, setTab] = useState<Tab>('nextjs')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  
  const htmlMap = { nextjs: nextjsHtml, react: reactHtml, api: apiHtml }

  return (
    <div className="code-demo-wrapper">
      <div className="code-pane" dangerouslySetInnerHTML={{ __html: htmlMap[tab] }} />
      <div className="preview-pane" data-theme={theme}>
        <UploadKitProvider apiKey="demo">
          <UploadButton endpoint="demoUploader" />
        </UploadKitProvider>
      </div>
    </div>
  )
}
```

### Pattern 3: IntersectionObserver Scroll Animations
**What:** CSS class toggling on element entry; pure CSS `@keyframes`, no JS animation library.
**When to use:** Section entrance animations, stagger grids.

```typescript
// apps/web/src/hooks/use-intersection.ts
'use client'
import { useEffect, useRef } from 'react'

export function useIntersection(className = 'in-view', options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        ref.current?.classList.add(className)
        observer.disconnect()
      }
    }, { threshold: 0.15, ...options })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [className])
  return ref
}
```

```css
/* Section entrance — opacity + translate */
.animate-section {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 600ms ease-out, transform 600ms ease-out;
}
.animate-section.in-view {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger children */
.stagger-grid > * { transition-delay: calc(var(--index, 0) * 80ms); }

/* Reduced motion — always disabled */
@media (prefers-reduced-motion: reduce) {
  .animate-section,
  .animate-section.in-view {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

**Important:** Because `useIntersection` is a client hook, sections using it must be thin `"use client"` wrappers or the animation class must be applied via a lightweight shared utility component. To keep sections as Server Components, an alternative is a single `<AnimationObserver>` client component that runs document-level IntersectionObserver on all `[data-animate]` elements — no individual "use client" needed per section.

### Pattern 4: Pricing Toggle (Client Island)
**What:** A `"use client"` toggle that updates prices displayed in otherwise-static tier cards.

```typescript
'use client'
import { useState } from 'react'

const PRICES = {
  pro:  { monthly: 15,  yearly: 12  },  // $15/mo or $12/mo billed annually
  team: { monthly: 35,  yearly: 28  },  // $35/mo or $28/mo billed annually
}

export function PricingToggle() {
  const [yearly, setYearly] = useState(false)
  return (
    <div>
      <label className="toggle-switch">
        <span>Monthly</span>
        <input type="checkbox" checked={yearly} onChange={e => setYearly(e.target.checked)} />
        <span className="switch-track" />
        <span>Yearly</span>
        {yearly && <span className="badge-save">Save 20%</span>}
      </label>
      {/* Pass billing period down via context or props */}
    </div>
  )
}
```

### Pattern 5: next/font/local for Satoshi
**What:** Self-hosted variable font with automatic preloading and zero layout shift.

```typescript
// apps/web/src/app/layout.tsx
import localFont from 'next/font/local'
import { Inter } from 'next/font/google'

const satoshi = localFont({
  src: [
    { path: '../fonts/Satoshi-Regular.woff2', weight: '400' },
    { path: '../fonts/Satoshi-Medium.woff2',  weight: '500' },
    { path: '../fonts/Satoshi-Bold.woff2',    weight: '700' },
    { path: '../fonts/Satoshi-Black.woff2',   weight: '900' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${satoshi.variable} ${inter.variable}`} data-theme="dark">
      <body>{children}</body>
    </html>
  )
}
```

```css
/* globals.css — add after base import */
@import "@uploadkit/config/tailwind/base.css";

/* Override font tokens for this app */
@theme {
  --font-display: var(--font-satoshi), system-ui, sans-serif;
  --font-body: var(--font-inter), system-ui, sans-serif;
}
```

### Pattern 6: SEO — Metadata + OG + JSON-LD
**What:** Next.js file-convention OG images + metadata export + JSON-LD structured data.

```typescript
// apps/web/src/app/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UploadKit — File Uploads for Developers. Done right.',
  description: 'Add beautiful, type-safe file uploads to your app in minutes. Generous free tier, BYOS, premium React components. No vendor lock-in.',
  openGraph: {
    title: 'UploadKit',
    description: 'File uploads as a service. 5GB free forever.',
    images: ['/og/home.png'],   // static file in public/og/
    url: 'https://uploadkit.dev',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og/home.png'],
  },
}
```

```typescript
// JSON-LD structured data (SoftwareApplication)
function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'UploadKit',
    applicationCategory: 'DeveloperApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: 'https://uploadkit.dev',
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}
```

**OG image placement:** Put static PNG files in `apps/web/public/og/home.png` and `apps/web/public/og/pricing.png`. Reference as `/og/home.png` in metadata. (Next.js file-convention `opengraph-image.png` in app/ directories also works but requires moving files there — either approach is correct. Using `/public/og/` is simpler and explicit.)

### Anti-Patterns to Avoid
- **Calling `createHighlighter()` inside every render:** Creates a new WASM instance per request. Use the module-level singleton.
- **Importing @uploadkit/react in a Server Component:** It uses `useState`, `useRef`, etc. — will throw. Always gate behind `"use client"` boundary.
- **Using `dangerouslySetInnerHTML` without sanitizing user content:** The code snippets are hardcoded strings, not user input — this is safe here. Document this distinction.
- **Using Tailwind `dark:` prefix without `darkMode: 'class'` or `data-theme`:** The project uses `[data-theme="dark"]` selector (established in packages/react/styles.css and packages/config). Do not mix Tailwind `prefers-color-scheme` media queries with attribute-based dark mode.
- **Missing `transpilePackages` for @uploadkit/react:** The web app must add `@uploadkit/react` (and optionally `@uploadkit/core`) to `transpilePackages` in `next.config.ts` since they ship ESM-only workspace packages. Currently only `@uploadkit/ui` is listed — this will need updating.
- **Pricing data hardcoded in component JSX:** Put tier data in `apps/web/src/lib/tier-data.ts`, importing from `@uploadkit/shared` constants. Ensures pricing display stays in sync with enforcement code.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Syntax highlighting | Custom regex highlighter | `shiki` (codeToHtml) | Token-level accuracy, 200+ languages, theme consistency |
| Font loading | Manual `<link>` tags | `next/font/local` or `next/font/google` | Automatic preload, size-adjust, zero layout shift |
| Intersection detection | `scroll` event listeners | `IntersectionObserver` API (native) | Main-thread safe, built-in browser API |
| CSS toggle state | JS class manipulation | `data-*` attributes + CSS `[data-theme]` | No React state needed for simple toggles |
| Pricing arithmetic | Custom discount logic | Inline `price * 0.8` with comment | Simple enough; no library needed |

**Key insight:** This phase is almost entirely static content. The temptation to reach for animation libraries (Framer Motion, GSAP) or data libraries (React Query) should be resisted — the performance budget is tight (Lighthouse 90+) and the content doesn't require them.

---

## Common Pitfalls

### Pitfall 1: Shiki WASM in Edge Runtime
**What goes wrong:** If any route is deployed to Vercel Edge Runtime, Shiki's lazy WASM import will fail with a module resolution error.
**Why it happens:** Edge Runtime doesn't support dynamic `require()` / lazy WASM loading.
**How to avoid:** Ensure `apps/web` uses Node.js Serverless Runtime (default for Next.js on Vercel). Do not add `export const runtime = 'edge'` to any page that uses Shiki.
**Warning signs:** Build succeeds but runtime error `Cannot find module 'shiki/wasm'` in production logs.

### Pitfall 2: @uploadkit/react not in transpilePackages
**What goes wrong:** Next.js fails to compile workspace packages that ship ESM with internal barrel imports.
**Why it happens:** `apps/web/next.config.ts` currently only transpiles `@uploadkit/ui`. The live component preview imports `@uploadkit/react`.
**How to avoid:** Add `'@uploadkit/react'`, `'@uploadkit/core'`, `'@uploadkit/shared'` to `transpilePackages`.
**Warning signs:** `SyntaxError: Cannot use import statement in a module` at build time.

### Pitfall 3: Dark Mode Flicker (FOUC)
**What goes wrong:** Page flashes white on first load in dark mode before CSS takes effect.
**Why it happens:** `<html data-theme="dark">` is hardcoded but React hydration can momentarily reset attributes. Alternatively, if `prefers-color-scheme` is used without the explicit attribute, SSR and client may disagree.
**How to avoid:** Set `data-theme="dark"` directly on `<html>` in `layout.tsx` (server-rendered, no flicker). The site is dark-by-default (D-01), so no system preference detection is needed — the attribute is constant.
**Warning signs:** Brief white flash on page load, especially on first visit or hard refresh.

### Pitfall 4: IntersectionObserver SSR
**What goes wrong:** `useIntersection` hook runs in a Server Component, throwing `window is not defined`.
**Why it happens:** IntersectionObserver is a browser API; hooks with `useEffect` require client context.
**How to avoid:** Any component using `useIntersection` must be a Client Component (`"use client"`). Use the document-level observer pattern (single `<AnimationObserver>` client component) to minimize client JS boundary count.
**Warning signs:** `ReferenceError: IntersectionObserver is not defined` during build.

### Pitfall 5: Tier Data Drift
**What goes wrong:** Pricing page shows limits that don't match what the API enforces.
**Why it happens:** GSD §5.3 (the document) and `constants.ts` (the code) already diverge on several numbers (e.g., GSD says Free = 10GB bandwidth, code says 2GB; GSD says Free max file = 16MB, code says 4MB).
**How to avoid:** Import `TIER_LIMITS` from `@uploadkit/shared/constants` directly in `tier-data.ts`. Never hardcode limit numbers in component JSX.
**Warning signs:** Manual QA shows discrepancy between "what we advertise" and "what API rejects."

### Pitfall 6: Shiki dangerouslySetInnerHTML and Tailwind Preflight
**What goes wrong:** Shiki's rendered `<pre><code>` gets overridden by Tailwind's preflight CSS (margin, padding resets), making code blocks look unstyled.
**Why it happens:** Tailwind v4 preflight zeros out `<pre>` and `<code>` styles.
**How to avoid:** Wrap the `dangerouslySetInnerHTML` div in a class that scopes reset styles, or use Shiki themes with explicit `background-color` and apply `not-prose` / a containing class that restores `<pre>` defaults.

---

## Gradient Mesh Implementation (Claude's Discretion)

Recommend: **Pure CSS radial gradient composition** (no SVG, no canvas, no external lib).

```css
/* Gradient mesh via stacked radial gradients on a pseudo-element */
.gradient-mesh {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 80% 60% at 20% 10%, rgba(99, 102, 241, 0.15) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 80% 80%, rgba(59, 130, 246, 0.10) 0%, transparent 50%),
    radial-gradient(ellipse 40% 40% at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 40%);
}
```

**Noise texture:** Recommend CSS SVG filter approach (zero-byte overhead):
```css
.noise::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* base64 noise SVG */
  opacity: 0.03;
  pointer-events: none;
}
```

**Glow effects** (per Pixel Architect CLAUDE.md pattern):
```css
.glow-accent {
  box-shadow: 0 0 80px -20px rgba(99, 102, 241, 0.4);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| prism.js / highlight.js | Shiki (TextMate grammars, WASM) | ~2022 | Token-level accuracy, theming |
| Google Fonts `<link>` | `next/font/google` or `/local` | Next.js 13 | Zero FOUT, no external DNS |
| Scroll event listeners | IntersectionObserver API | ~2019, now universal | Off-main-thread, battery safe |
| Static OG images only | `next/og` (ImageResponse) | Next.js 13.3 | Dynamic OG from code — locked decision chose static |
| `pages/` Router metadata | `export const metadata` (App Router) | Next.js 13 | Co-located, type-safe |

**Deprecated/outdated:**
- `rehype-shiki`: Works but not needed for this site (no MDX pages). Use `shiki` directly.
- `next-themes`: Useful for toggle UX but project uses static `data-theme="dark"` — unnecessary dependency for a dark-by-default site with no preference toggle.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Satoshi available from Fontshare for free commercial use | Standard Stack | Legal exposure if commercial restriction exists; verify Fontshare license before using |
| A2 | GSD §5.3 feature table values (file routes per tier, team members, analytics tier, webhooks, SLA, SOC 2) are correct marketing copy | Authoritative Data | Pricing page would show incorrect feature comparison — cross-check with team |
| A3 | Pro = $15/mo, Team = $35/mo (GSD §5.3); yearly = 20% off (D-06) | Pricing | Wrong prices displayed; verify against Stripe product config from Phase 7 |
| A4 | `output: 'standalone'` in next.config.ts does not conflict with static OG images in /public | Architecture | OG images might not be included in standalone output; verify with `next build` |
| A5 | `apps/web` will be deployed to Vercel Serverless (not Edge), so Shiki WASM works | Standard Stack | If Edge deployed, Shiki breaks; requires `shiki/bundle/web` instead |

---

## Open Questions

1. **Stripe price IDs for CTA links**
   - What we know: CTAs link to `app.uploadkit.dev/login` or `/dashboard/billing`
   - What's unclear: Should the "Get started free" CTA pre-select a plan, or just go to signup?
   - Recommendation: Link to `app.uploadkit.dev/login` without plan pre-selection for MVP. Add `?plan=pro` query param wiring in Phase 7 if needed.

2. **OG image dimensions and design**
   - What we know: Static PNGs in /public (D-09). Standard OG = 1200×630px.
   - What's unclear: Are designed PNGs part of this phase's deliverables, or placeholder?
   - Recommendation: Create minimal branded OG images (dark bg + UploadKit wordmark + tagline) using Canvas/Figma; export as PNG. Simple enough to include in phase.

3. **Navigation: sticky vs. transparent**
   - What we know: Claude's discretion.
   - Recommendation: Transparent on scroll start → opaque + `backdrop-filter: blur` on scroll (classic Vercel pattern). Achievable with pure CSS `position: sticky` + scroll-linked class via a single `"use client"` nav wrapper or CSS `scroll-driven-animations` (no JS needed in Chrome 115+, partial support in Safari 18+). Use JS fallback for broad support.

---

## Environment Availability

Step 2.6: No external services needed (no database, no CMS, no external API at build time). Shiki runs during Next.js build. Fonts loaded from local files.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js build | Yes | 22.22.0 | — |
| pnpm | Package manager | Yes | 10.26.2 | — |
| next build | Static generation | Yes (next 16.2.3) | 16.2.3 | — |
| Satoshi .woff2 | Typography | Must download | — | Use system-ui or Inter only |
| shiki | Syntax highlighting | Not yet installed | 4.0.2 latest | — |

**Missing dependencies with no fallback:**
- Satoshi font files — must be manually downloaded from Fontshare before Wave 1 begins.

**Missing dependencies with fallback:**
- None (shiki is installable; Inter is on Google Fonts CDN as fallback).

---

## Validation Architecture

`nyquist_validation: true` — validation section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in apps/web (no jest.config, no vitest.config, no test scripts in package.json) |
| Config file | None — Wave 0 must establish |
| Quick run command | `pnpm --filter @uploadkit/web typecheck` (TypeScript check as proxy) |
| Full suite command | `pnpm --filter @uploadkit/web build` (full static build validates all RSC, metadata, shiki) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAND-01 | Hero renders with headline + badge + CTAs | smoke (build) | `pnpm --filter @uploadkit/web build` | ❌ Wave 0 |
| LAND-02 | Code demo tabs + live preview render without error | smoke (build) | `pnpm --filter @uploadkit/web build` | ❌ Wave 0 |
| LAND-03 | Features grid 6-item render | smoke (build) | `pnpm --filter @uploadkit/web build` | ❌ Wave 0 |
| LAND-04 | Comparison table renders | smoke (build) | `pnpm --filter @uploadkit/web build` | ❌ Wave 0 |
| LAND-05 | Component showcase renders @uploadkit/react components | smoke (build) | `pnpm --filter @uploadkit/web build` | ❌ Wave 0 |
| LAND-06 | Pricing preview 3 cards render with correct tier data | smoke (build) | `pnpm --filter @uploadkit/web build` | ❌ Wave 0 |
| LAND-07 | Footer renders with all required links | smoke (build) | `pnpm --filter @uploadkit/web build` | ❌ Wave 0 |
| LAND-08 | Animations use prefers-reduced-motion guard | manual | Visual inspect + Lighthouse audit | — |
| LAND-09 | Responsive breakpoints | manual | Browser DevTools + Lighthouse mobile | — |
| LAND-10 | Metadata + OG tags present in HTML | smoke (build output) | `pnpm --filter @uploadkit/web build && grep -r "og:image" .next/` | ❌ Wave 0 |
| PRICE-01 | Pricing toggle changes displayed prices correctly | manual | Visual QA | — |
| PRICE-02 | 4 tier cards render with correct prices | smoke (build) | `pnpm --filter @uploadkit/web build` | ❌ Wave 0 |
| PRICE-03 | Feature comparison matrix shows all rows | smoke (build) | `pnpm --filter @uploadkit/web build` | ❌ Wave 0 |
| PRICE-04 | Overage pricing section present | smoke (build) | `pnpm --filter @uploadkit/web build` | ❌ Wave 0 |

**Primary validation gate:** `pnpm --filter @uploadkit/web build` — a successful static build with no TypeScript errors is the strongest automated signal for this phase. All RSC paths execute at build time, so any Shiki errors, missing component props, or import failures surface here.

**Lighthouse audit:** Run manually after build using `pnpm --filter @uploadkit/web start` + Chrome DevTools Lighthouse. Target: Performance ≥ 90, Accessibility ≥ 90, SEO = 100.

### Sampling Rate
- **Per task commit:** `pnpm --filter @uploadkit/web typecheck`
- **Per wave merge:** `pnpm --filter @uploadkit/web build`
- **Phase gate:** Full build green + manual Lighthouse 90+ before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `next.config.ts` — add `@uploadkit/react`, `@uploadkit/core`, `@uploadkit/shared` to `transpilePackages`
- [ ] `apps/web/package.json` — add `shiki`, `@fontsource-variable/inter` dependencies
- [ ] `apps/web/src/app/fonts/` — download and add Satoshi `.woff2` files (Satoshi-Regular, Medium, Bold, Black)
- [ ] `apps/web/src/lib/shiki.ts` — singleton highlighter module
- [ ] `apps/web/src/lib/tier-data.ts` — formatted pricing data from @uploadkit/shared
- [ ] `apps/web/public/og/` — create directory; add `home.png` and `pricing.png` (1200×630)
- [ ] `apps/web/src/app/pricing/` — create route directory

---

## Security Domain

This phase is a public, read-only marketing site. No auth, no user data, no forms (CTAs are external links). Security surface is minimal.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth on landing pages |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Fully public |
| V5 Input Validation | Partial | No user input; `dangerouslySetInnerHTML` only for Shiki output (hardcoded strings, not user content) |
| V6 Cryptography | No | No secrets |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via dangerouslySetInnerHTML | Tampering | Code snippets are hardcoded strings — not user input. Document in code comments that this is intentional and safe. |
| Sensitive data in OG images | Information Disclosure | OG images are static, marketing-only content — no risk. |
| CSP headers | Tampering/Spoofing | Add `Content-Security-Policy` header in Next.js `headers()` config. Shiki inline styles may require `'unsafe-inline'` in `style-src` — or use Shiki `transformerStyleToClass` to move styles to classes. |

---

## Project Constraints (from CLAUDE.md)

These directives from the Pixel Architect design philosophy apply to all implementation in this phase:

1. **Dark backgrounds with depth** — Never flat `#0a0a0b` alone; add noise texture (CSS SVG filter or inline data URI) and gradient mesh.
2. **Borders with transparency** — Use `1px solid rgba(255,255,255,0.06)` not `border: 1px solid #333`.
3. **Glow effects on accent elements** — `box-shadow: 0 0 80px -20px var(--color-accent)` on highlighted cards (Pro tier card, CTAs).
4. **Typography** — Satoshi for headings with negative `letter-spacing` at large sizes; Inter for body at `line-height: 1.6–1.8`.
5. **Spacing system** — 4px base unit. All spacing values multiples of 4.
6. **Hover states** — Never color-only changes; include `transform: translateY(-2px)` or scale on interactive cards.
7. **Motion**: 200–300ms `ease-out` for all transitions. No JS animation library (D-08 confirms this).
8. **Accessibility** — `focus-visible` on all interactive elements; `aria-labels`; `prefers-reduced-motion` disables all keyframe animations.
9. **CSS custom properties** — All themeable values (colors, radii, spacing) via CSS variables.
10. **Semantic HTML** — `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>` throughout.
11. **Mobile-first** — All responsive CSS written mobile-first with `min-width` breakpoints.

---

## Sources

### Primary (HIGH confidence)
- `packages/shared/src/constants.ts` — Authoritative TIER_LIMITS data [VERIFIED: read in session]
- `apps/web/package.json` — Existing web app dependencies [VERIFIED: read in session]
- `apps/web/src/app/layout.tsx`, `page.tsx`, `globals.css`, `next.config.ts` — Current web app state [VERIFIED: read in session]
- `packages/config/tailwind/base.css` — Shared Tailwind v4 token foundation [VERIFIED: read in session]
- `packages/react/src/styles.css` — Component theming system, dark mode patterns [VERIFIED: read in session]
- `packages/react/src/index.ts` — @uploadkit/react public exports [VERIFIED: read in session]
- npm registry — shiki@4.0.2, next@16.2.3, @fontsource-variable/inter@5.2.8, next-themes@0.4.6 [VERIFIED: npm view in session]
- https://shiki.style/packages/next — Shiki Next.js integration, singleton pattern, Server Component usage [CITED: official Shiki docs]
- https://nextjs.org/docs/app/getting-started/metadata-and-og-images — Next.js metadata + OG conventions [CITED: official Next.js docs]

### Secondary (MEDIUM confidence)
- UPLOADKIT-GSD.md §5.1–5.3 — Page structure, section list, pricing table [read in session; considered authoritative for marketing copy but superseded by constants.ts for limits]
- .planning/phases/08-landing-pricing-pages/08-CONTEXT.md — All locked decisions D-01 through D-09 [read in session]
- Shiki official docs (WebFetch) — confirmed `createHighlighter` singleton pattern, `codeToHtml` async Server Component usage, Edge Runtime limitation

### Tertiary (LOW confidence)
- WebSearch: Satoshi font npm status — confirmed @fontsource/satoshi does not exist on npm; Fontshare is the source
- WebSearch: IntersectionObserver performance — confirmed async, off-main-thread, Lighthouse-safe

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm registry; Shiki patterns confirmed via official docs
- Architecture: HIGH — established patterns from prior phases (RSC islands, client boundaries); Shiki singleton confirmed
- Pitfalls: HIGH — transpilePackages gap is a known codebase-specific issue (verified in next.config.ts); tier data drift verified by comparing constants.ts vs GSD §5.3
- Pricing data: MEDIUM — constants.ts verified; feature table supplementary fields (routes, members, etc.) from GSD §5.3 [ASSUMED]
- Font strategy: MEDIUM — next/font/local pattern is well-documented; Satoshi Fontshare license [ASSUMED]

**Research date:** 2026-04-07
**Valid until:** 2026-06-01 (Shiki and Next.js APIs stable; font availability stable)
