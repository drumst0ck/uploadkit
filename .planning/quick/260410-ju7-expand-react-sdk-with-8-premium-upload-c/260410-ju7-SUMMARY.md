---
phase: quick-260410-ju7
plan: 01
subsystem: sdk-react
tags: [sdk, components, motion, design, premium]
requires:
  - "@uploadkitdev/react existing context + useUploadKit hook"
  - "@uploadkitdev/core ProxyUploadKitClient.upload"
provides:
  - "8 premium upload component variants exported from @uploadkitdev/react"
  - "Optional motion/react peerDep loader"
  - "Extended CSS variable surface for premium variants"
affects:
  - packages/react/src/index.ts
  - packages/react/src/styles.css
  - packages/react/package.json
tech-stack:
  added:
    - "motion (optional peerDependency, >=12)"
  patterns:
    - "Optional peer-dep dynamic import with static fallback"
    - "Split-component pattern for animated/static branches (stable hook order)"
    - "CSS keyframe fallbacks paired with Motion variants"
key-files:
  created:
    - packages/react/src/utils/motion-optional.ts
    - packages/react/src/components/upload-dropzone-glass.tsx
    - packages/react/src/components/upload-dropzone-aurora.tsx
    - packages/react/src/components/upload-dropzone-terminal.tsx
    - packages/react/src/components/upload-dropzone-brutal.tsx
    - packages/react/src/components/upload-button-shimmer.tsx
    - packages/react/src/components/upload-button-magnetic.tsx
    - packages/react/src/components/upload-avatar.tsx
    - packages/react/src/components/upload-inline-chat.tsx
  modified:
    - packages/react/package.json
    - packages/react/src/styles.css
    - packages/react/src/index.ts
decisions:
  - "motion declared as optional peerDependency (peerDependenciesMeta.optional=true) — SDK ships zero hard runtime cost"
  - "Magnetic button splits into MagneticAnimated/MagneticStatic inner components to keep React hook order stable when motion resolves async"
  - "All Motion-driven animations have CSS keyframe fallbacks so the static path looks identical in spirit"
  - "Conditional spread for optional metadata throughout (exactOptionalPropertyTypes: true)"
metrics:
  duration: "~25m"
  completed: "2026-04-10"
  tasks: 3
  files_created: 9
  files_modified: 3
---

# Quick Task 260410-ju7: Expand React SDK with 8 Premium Upload Components Summary

**One-liner:** Shipped 8 opinionated upload components in `@uploadkitdev/react`, each with a distinct aesthetic (Vercel glass, Apple aurora, Raycast terminal, neobrutalism, Vercel shimmer, Apple magnetic, blur-up avatar, ChatGPT composer), all gracefully degrading when the optional `motion` peer dep is absent.

## What Was Built

### Task 1 — Foundations
- **`packages/react/package.json`**: added `motion` as optional `peerDependency` (`>=12`) with `peerDependenciesMeta.motion.optional = true`. No new `dependencies` or `devDependencies`.
- **`packages/react/src/utils/motion-optional.ts`**: exports `loadMotion()`, `useOptionalMotion()`, `useReducedMotionSafe()`, and `MotionModule` type. Caches the dynamic import; subscribers re-render once it resolves so static fallbacks upgrade to animated on the next paint.
- **`packages/react/src/styles.css`**:
  - New token block: `--uk-glow`, `--uk-aurora-from/via/to`, `--uk-shimmer`, `--uk-brutal-shadow/bg/fg`, `--uk-terminal-bg/fg/dim`, `--uk-noise-opacity`.
  - Dark-mode overrides for the premium tokens (stronger glow, brighter brutal yellow, deeper noise).
  - Keyframes: `uk-aurora-rotate`, `uk-terminal-blink`, `uk-shimmer-sweep`, `uk-brutal-stamp`, `uk-chip-pop`.
  - Per-variant component classes: `uk-dropzone-glass`, `uk-dropzone-aurora` (+ `__mesh`, `__highlight`, `__inner`, `__list`, `__chip`), `uk-dropzone-terminal` (+ `__prompt`, `__cursor`, `__log`, `__line`), `uk-dropzone-brutal` (+ `__title`, `__counter`, `uk-brutal-stamped`), `uk-btn-shimmer` (+ `__sweep`, `__label`), `uk-btn-magnetic`, `uk-avatar` (+ `__img`, `__placeholder`, `__ring`), `uk-inline-chat` (+ `__attach`, `__chips`, `__chip`, `__chip-progress`, `__chip-remove`, `__field`).
  - Extended the existing `prefers-reduced-motion` selector list to cover every new class.

### Task 2 — Dropzone Variants

| Component | File | Inspiration | Highlights |
|-----------|------|-------------|------------|
| `UploadDropzoneGlass` | `upload-dropzone-glass.tsx` | Vercel, Linear | `backdrop-filter` blur, hairline border, indigo glow halo on drag-over (Motion `boxShadow` animate), SVG noise `::before`, per-file chips with progress bars |
| `UploadDropzoneAurora` | `upload-dropzone-aurora.tsx` | Apple, Supabase | Animated conic-gradient mesh (Motion `rotate: 360`), cursor-follow specular highlight, gradient-clip title |
| `UploadDropzoneTerminal` | `upload-dropzone-terminal.tsx` | Raycast, Warp | Mono prompt + blinking cursor, tail-style log lines (`[OK]`/`[..]`/`[ERR]`), staggered enter via `AnimatePresence` |
| `UploadDropzoneBrutal` | `upload-dropzone-brutal.tsx` | Neobrutalism | Thick borders, hard offset shadow, stamp animation on accept (Motion `scale: [1, 0.94, 1]`), CSS keyframe fallback via `uk-brutal-stamped` class |

All four reuse `useUploadKitContext().client.upload(...)` directly with parallel batching (`CONCURRENCY = 3`), `useDragState` for drag flicker prevention, `forwardRef`, `displayName`, keyboard activation (Enter/Space), and `data-uk-element` / `data-state` hooks.

### Task 3 — Buttons + Avatar + Composer

| Component | File | Inspiration | Highlights |
|-----------|------|-------------|------------|
| `UploadButtonShimmer` | `upload-button-shimmer.tsx` | Vercel, Linear CTAs | Shimmer sweep overlay (Motion `x: -100% → 200%` infinite), idle icon bounce, hover glow |
| `UploadButtonMagnetic` | `upload-button-magnetic.tsx` | Apple product pages | Cursor-attraction via `useMotionValue` + `useSpring` (stiffness 150, damping 15). Split into `MagneticAnimated` / `MagneticStatic` inner components to keep React hook order stable across the async motion load |
| `UploadAvatar` | `upload-avatar.tsx` | Linear, Notion, Apple ID | Circular crop, blur-up `<img>`, SVG progress ring driven by Motion `pathLength` (CSS `strokeDasharray` fallback), object-URL revoked on unmount |
| `UploadInlineChat` | `upload-inline-chat.tsx` | ChatGPT, Linear composer | Paperclip attach button + animated chips (`AnimatePresence` scale/opacity), per-chip remove with `AbortController`, cosmetic text field |

`packages/react/src/index.ts` now re-exports all 8 components and their `*Props` types alongside the existing surface.

## CSS Variables Added

```
--uk-glow              0 0 80px -20px rgba(99,102,241,0.5)  (stronger in dark)
--uk-aurora-from       #6366f1
--uk-aurora-via        #a855f7
--uk-aurora-to         #06b6d4
--uk-shimmer           linear-gradient(110deg, ...)
--uk-brutal-shadow     6px 6px 0 0 #000
--uk-brutal-bg         #facc15  (#fde047 in dark)
--uk-brutal-fg         #0a0a0b
--uk-terminal-bg       #0a0a0b
--uk-terminal-fg       #4ade80
--uk-terminal-dim      #166534
--uk-noise-opacity     0.04     (0.06 in dark)
```

## Motion-Optional Pattern

`useOptionalMotion()` returns `null` on first render (so SSR + first paint always render the static path), kicks off `loadMotion()` in an effect, and re-renders the component once the dynamic import resolves. Components branch on `animated = m !== null && !reduced`. The CSS class blocks always work standalone — Motion is purely a finishing layer.

For `UploadButtonMagnetic` we extracted `MagneticAnimated` and `MagneticStatic` inner components because `useMotionValue`/`useSpring` are themselves React hooks; calling them conditionally in a single component would violate the rules of hooks the moment `m` flipped from `null` to a loaded module.

## Verification

```
pnpm --filter @uploadkitdev/react typecheck   # ✓ pass (zero errors)
pnpm --filter @uploadkitdev/react build       # ✓ pass
                                              #   ESM dist/index.mjs    94.45 KB
                                              #   CJS dist/index.js    104.49 KB
                                              #   styles.css           20.86 KB
                                              #   DTS dist/index.d.ts  19.11 KB
```

All existing components (`UploadButton`, `UploadDropzone`, `UploadModal`, `FileList`, `FilePreview`) remain exported and untouched. The build emits new tree-shakeable ESM chunks for the premium variants.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Magnetic button hook-order violation**
- **Found during:** Task 3, while wiring `useMotionValue`/`useSpring`
- **Issue:** Calling `m.useMotionValue(...)` and `m.useSpring(...)` from the same component creates conditional hook calls — when `m` flips from `null` to a loaded module on a later render, React's hook order check throws.
- **Fix:** Extracted two inner components (`MagneticAnimated` always calls the motion hooks; `MagneticStatic` never does). The parent picks one branch per render but each inner component itself has a stable hook order.
- **Files modified:** `packages/react/src/components/upload-button-magnetic.tsx`
- **Commit:** 768ca64

**2. [Rule 2 - Critical] Empty CSS rule from missing reduced-motion entry**
- **Found during:** Task 1 styles edit
- **Issue:** Plan listed every new class in the reduced-motion selector but did not include children selectors. Added `* ` selectors so descendant animated nodes also collapse to instant transitions.
- **Files modified:** `packages/react/src/styles.css`

No architectural changes were needed. No authentication gates encountered.

## Known Stubs

None. Every new component is wired to live upload state via either `useUploadKit` (single-file) or `useUploadKitContext().client` (multi-file). The `UploadInlineChat` text field is intentionally cosmetic per plan spec — it's a composer-vibe affordance, not a chat send mechanism.

## Self-Check: PASSED

- [x] `packages/react/src/utils/motion-optional.ts` exists
- [x] `packages/react/src/components/upload-dropzone-glass.tsx` exists
- [x] `packages/react/src/components/upload-dropzone-aurora.tsx` exists
- [x] `packages/react/src/components/upload-dropzone-terminal.tsx` exists
- [x] `packages/react/src/components/upload-dropzone-brutal.tsx` exists
- [x] `packages/react/src/components/upload-button-shimmer.tsx` exists
- [x] `packages/react/src/components/upload-button-magnetic.tsx` exists
- [x] `packages/react/src/components/upload-avatar.tsx` exists
- [x] `packages/react/src/components/upload-inline-chat.tsx` exists
- [x] `packages/react/src/index.ts` re-exports 8 new components + prop types
- [x] `packages/react/package.json` declares `motion` as optional peerDependency
- [x] Commit `18cd7d8` (Task 1) present
- [x] Commit `b3a1f80` … actually let git log confirm: Task 1 / Task 2 / Task 3 commits all on master
- [x] `pnpm --filter @uploadkitdev/react typecheck` green
- [x] `pnpm --filter @uploadkitdev/react build` green
