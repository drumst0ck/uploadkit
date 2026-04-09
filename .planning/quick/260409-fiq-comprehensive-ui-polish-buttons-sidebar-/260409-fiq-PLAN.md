---
phase: quick
plan: 260409-fiq
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/ui/src/components/ui/button.tsx
  - packages/ui/src/components/ui/table.tsx
  - packages/ui/src/components/ui/input.tsx
  - apps/dashboard/src/components/layout/sidebar-nav.tsx
  - apps/dashboard/src/components/metric-card.tsx
  - apps/dashboard/src/components/api-keys-table.tsx
  - apps/dashboard/src/app/dashboard/projects/page.tsx
  - apps/dashboard/src/components/settings-form.tsx
  - apps/dashboard/src/app/dashboard/billing/page.tsx
  - apps/web/src/app/page.tsx
  - apps/web/src/components/nav/navbar.tsx
  - apps/dashboard/src/app/globals.css
  - apps/dashboard/src/components/charts/uploads-area-chart.tsx
autonomous: true
must_haves:
  truths:
    - "Button default variant renders with indigo-600 background, shadow, and hover glow"
    - "Table rows have subtle hover states and headers have uppercase tracking"
    - "Input fields show indigo focus ring instead of generic ring"
    - "Sidebar active link has indigo left border accent"
    - "Metric cards have icon wrappers, shadows, and hover lift"
    - "No ad-hoc indigo button overrides remain in dashboard pages"
    - "Landing hero CTAs have scale transforms and glow on hover"
    - "Feature cards lift on hover with shadow"
    - "Pricing CTA buttons have visible hover states"
    - "Dashboard muted-foreground contrast is improved"
  artifacts:
    - path: "packages/ui/src/components/ui/button.tsx"
      provides: "Premium dark-mode button variants with shadows and glow"
    - path: "packages/ui/src/components/ui/table.tsx"
      provides: "Refined table head, row, and cell styling"
    - path: "packages/ui/src/components/ui/input.tsx"
      provides: "Premium input with indigo focus ring"
    - path: "apps/dashboard/src/components/layout/sidebar-nav.tsx"
      provides: "Indigo accent active state with left border"
    - path: "apps/dashboard/src/components/metric-card.tsx"
      provides: "Card with icon wrapper, shadow, hover lift"
  key_links:
    - from: "packages/ui/src/components/ui/button.tsx"
      to: "all dashboard pages consuming <Button>"
      via: "cva default variant"
      pattern: "bg-indigo-600"
---

<objective>
Comprehensive UI polish pass across packages/ui primitives, dashboard components, and landing page to bring visual quality up to Linear/Vercel/Supabase level.

Purpose: The current UI uses stock shadcn styling with no visual depth, poor contrast, and missing hover states. This pass upgrades every interactive surface with premium dark-mode treatment: shadows, glows, transitions, and consistent indigo accent theming.

Output: Polished button/table/input primitives in packages/ui, refined dashboard sidebar/cards/empty states, and landing page CTAs with hover transforms.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/ui/src/components/ui/button.tsx
@packages/ui/src/components/ui/table.tsx
@packages/ui/src/components/ui/input.tsx
@apps/dashboard/src/components/layout/sidebar-nav.tsx
@apps/dashboard/src/components/metric-card.tsx
@apps/dashboard/src/components/api-keys-table.tsx
@apps/dashboard/src/app/dashboard/projects/page.tsx
@apps/dashboard/src/components/settings-form.tsx
@apps/dashboard/src/app/dashboard/billing/page.tsx
@apps/web/src/app/page.tsx
@apps/web/src/components/nav/navbar.tsx
@apps/dashboard/src/app/globals.css
@apps/dashboard/src/components/charts/uploads-area-chart.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Upgrade UI primitives + dashboard component styling</name>
  <files>
    packages/ui/src/components/ui/button.tsx
    packages/ui/src/components/ui/table.tsx
    packages/ui/src/components/ui/input.tsx
    apps/dashboard/src/components/layout/sidebar-nav.tsx
    apps/dashboard/src/components/metric-card.tsx
    apps/dashboard/src/components/api-keys-table.tsx
    apps/dashboard/src/app/dashboard/projects/page.tsx
    apps/dashboard/src/components/settings-form.tsx
    apps/dashboard/src/app/dashboard/billing/page.tsx
    apps/dashboard/src/app/globals.css
    apps/dashboard/src/components/charts/uploads-area-chart.tsx
  </files>
  <action>
**A. Button component** (`packages/ui/src/components/ui/button.tsx`):
Replace the entire `buttonVariants` cva call with premium dark-mode variants:

```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 active:bg-indigo-700',
        destructive:
          'bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/30 active:bg-red-700',
        outline:
          'border border-white/[0.10] bg-white/[0.03] text-zinc-300 shadow-sm hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15] active:bg-white/[0.08]',
        secondary:
          'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.10] hover:text-white active:bg-white/[0.12]',
        ghost: 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 active:bg-white/[0.08]',
        link: 'text-indigo-400 underline-offset-4 hover:underline hover:text-indigo-300',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-10 rounded-lg px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

**B. Table primitives** (`packages/ui/src/components/ui/table.tsx`):
- `TableRow`: Change className from `'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted'` to `'border-b border-white/[0.06] transition-colors hover:bg-white/[0.04] data-[state=selected]:bg-indigo-500/10'`
- `TableHead`: Change className from `'h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]'` to `'h-10 px-4 py-3 text-left align-middle bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-zinc-500 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]'`
- `TableCell`: Change className from `'p-2 align-middle ...'` to `'px-4 py-3 align-middle ...'` (keep the checkbox rules)

**C. Input primitive** (`packages/ui/src/components/ui/input.tsx`):
Replace the className string with: `'flex h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-sm text-zinc-200 shadow-sm transition-all duration-200 placeholder:text-zinc-600 hover:border-white/[0.12] focus-visible:outline-none focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50'`
Keep the `file:` variants from the original if they exist, append them.

**D. Sidebar nav active state** (`apps/dashboard/src/components/layout/sidebar-nav.tsx`):
In the `NavItemLink` component, update the Link className:
- Base classes: add `transition-all duration-150` (replace `transition-colors`)
- Active state: change from `'bg-white/[0.06] text-white'` to `'bg-indigo-500/10 text-white border-l-2 border-indigo-500 -ml-[1px]'`
- Inactive hover: change from `'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'` to `'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'`

**E. Metric cards** (`apps/dashboard/src/components/metric-card.tsx`):
- Card div: add `shadow-lg shadow-black/20` and change hover to `hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5`. Change `transition-colors` to `transition-all duration-200`.
- Icon: wrap the `{icon}` in `<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">` instead of the bare `<span className="text-zinc-600">`.
- Label: change from `text-zinc-500` to `text-zinc-400`.

**F. Remove ad-hoc button overrides** across dashboard:
- `apps/dashboard/src/components/api-keys-table.tsx` (~line 120): Remove `className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border-0"` from the Create API Key button. Keep `size="sm"` only.
- `apps/dashboard/src/app/dashboard/projects/page.tsx`: Remove `className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"` from both New project buttons. Just use `<Button className="gap-2">` (keep the gap for icon spacing).
- `apps/dashboard/src/components/settings-form.tsx` (~line 133-139): Replace the raw `<button>` submit with `<Button type="submit" disabled={isSaving || name.trim().length === 0}>{isSaving ? 'Saving...' : 'Save changes'}</Button>`. Import `Button` from `@uploadkit/ui` at the top.
- `apps/dashboard/src/app/dashboard/billing/page.tsx`: Replace the raw `<button>` elements for "Upgrade to Pro" (~line 139-144) and "Upgrade to Team" (~line 150-155) with `<Button type="submit">Upgrade to Pro</Button>` and `<Button type="submit" className="bg-violet-500 shadow-violet-500/20 hover:bg-violet-400 hover:shadow-violet-500/30">Upgrade to Team</Button>`. Replace "Manage Billing" button (~line 163-166) with `<Button type="submit" variant="outline">Manage Billing</Button>`. Import `Button` from `@uploadkit/ui`.

**G. Dashboard globals** (`apps/dashboard/src/app/globals.css`):
Change `--muted-foreground` from `#a1a1aa` to `#b4b4bd` for better dark-mode readability.

**H. Chart tooltip** (`apps/dashboard/src/components/charts/uploads-area-chart.tsx`):
In the `CustomTooltip` div, add `shadow-black/40 backdrop-blur-sm` to the existing className. The full className becomes: `'rounded-lg border border-white/[0.06] bg-[#141416]/90 px-3 py-2 text-xs text-white shadow-xl shadow-black/40 backdrop-blur-sm'`

**I. Empty states polish**:
- Projects page (`apps/dashboard/src/app/dashboard/projects/page.tsx`): Change the FolderOpen icon color from `text-zinc-600` to `text-zinc-500`. Add a subtle glow wrapper: wrap the icon in `<div className="mb-4 inline-flex"><FolderOpen className="h-10 w-10 text-zinc-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.15)]" .../></div>`.
  </action>
  <verify>
    <automated>cd /Users/drumstock/Developer/GitHub/uploadkit && pnpm turbo build --filter=@uploadkit/ui --filter=dashboard 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Button default variant is indigo-600 with shadow glow
    - Table rows have white/[0.06] borders, heads have uppercase tracking and bg
    - Input has indigo focus ring and hover border
    - Sidebar active links show indigo left-border accent
    - Metric cards have icon wrappers in indigo-500/10, shadow, hover lift
    - All ad-hoc button overrides removed from api-keys-table, projects page, settings form, billing page
    - globals.css muted-foreground bumped to #b4b4bd
    - Chart tooltip has backdrop-blur and deeper shadow
    - Empty state icons have subtle indigo glow
  </done>
</task>

<task type="auto">
  <name>Task 2: Landing page button/CTA and feature card polish</name>
  <files>
    apps/web/src/app/page.tsx
    apps/web/src/components/nav/navbar.tsx
  </files>
  <action>
**A. Hero CTA buttons** (`apps/web/src/app/page.tsx`):
- "Start Building" primary button (~line 128-137): Add `boxShadow: '0 0 20px -5px rgba(250,250,250,0.3)'` to the existing style object. Add to className: `hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_rgba(250,250,250,0.4)] active:scale-[0.98]`.
- "Read the Docs" secondary button (~line 138-149): Add `hover:bg-white/[0.06]` to the className.
- Copy install command button (~line 166-172): Replace `hover:opacity-70` with `hover:text-zinc-300 hover:bg-white/[0.06] rounded-md p-1 -m-1` in className. Keep the existing style and aria-label.

**B. Feature cards** (~line 261-288):
On the feature card div (the one with `className="flex flex-col gap-4 rounded-..."`), add to className: `transition-all duration-200 hover:border-white/[0.12] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30`.
Since the border is in the style attribute (`border: '1px solid rgba(255,255,255,0.06)'`), the hover:border-white/[0.12] won't override inline style. Instead, move the border from the `style` object to className: remove `border: '1px solid rgba(255,255,255,0.06)'` from style and add `border border-white/[0.06]` to className. Keep the `background` in style.

**C. Pricing CTA buttons** (~line 452-466):
For the featured tier CTA (the Link): add to className `hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30`. Move `background: '#6366f1', color: '#fff'` from style to Tailwind classes `bg-indigo-600 text-white` in className to enable hover.
For non-featured tier CTAs: add `hover:bg-white/[0.06] hover:border-white/[0.18]` to className. Move the border/color from style to className equivalents: `border border-white/[0.12] text-white` (replace inline style).

**D. Final CTA section** (~line 530-539):
On the "Get Started Free" Link, add `hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_rgba(250,250,250,0.4)] active:scale-[0.98]` to className. Add `boxShadow: '0 0 20px -5px rgba(250,250,250,0.3)'` to the style.

**E. Navbar** (`apps/web/src/components/nav/navbar.tsx`):
Nav links already have `transition-colors duration-200` -- confirmed, no change needed. 
Desktop "Get Started" button (~line 61-71): add `hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(250,250,250,0.25)]` to className.
  </action>
  <verify>
    <automated>cd /Users/drumstock/Developer/GitHub/uploadkit && pnpm turbo build --filter=web 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Hero "Start Building" has glow shadow and scale transform on hover
    - Hero "Read the Docs" has bg hover state
    - Copy button has visible hover state instead of opacity change
    - Feature cards lift on hover with shadow transition
    - Pricing CTAs have visible hover states with transitions
    - Final CTA has matching glow/scale treatment
    - Navbar "Get Started" has subtle scale hover
  </done>
</task>

<task type="checkpoint:human-verify" gate="soft">
  <what-built>Complete UI polish pass across packages/ui primitives (button, table, input), dashboard components (sidebar, metric cards, settings, billing, API keys, charts), and landing page (hero CTAs, feature cards, pricing buttons, navbar).</what-built>
  <how-to-verify>
    1. Run `pnpm dev --filter=dashboard` and open http://localhost:3001/dashboard
       - Verify buttons have indigo glow with shadow on hover
       - Verify sidebar active link has indigo left-border accent
       - Navigate to Projects - verify cards have hover lift animation
       - Navigate to Settings - verify "Save changes" uses standard Button component
       - Navigate to Billing - verify upgrade buttons use consistent styling
    2. Run `pnpm dev --filter=web` and open http://localhost:3000
       - Verify "Start Building" button has white glow and scales on hover
       - Verify "Read the Docs" gets a subtle background on hover
       - Verify feature cards lift with shadow on hover
       - Verify pricing CTA buttons have visible hover states
       - Verify "Get Started Free" in final CTA section has matching glow
    3. Check that text contrast is improved (muted text slightly brighter throughout dashboard)
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `pnpm turbo build` succeeds for all affected packages (ui, dashboard, web)
- No TypeScript errors introduced
- All interactive elements have visible hover/focus states
- No remaining ad-hoc indigo button overrides in dashboard files
</verification>

<success_criteria>
- Every Button in the dashboard renders with the new indigo default variant (shadow + glow)
- Table components show refined headers (uppercase, tracking) and subtle row hovers
- Input fields display indigo focus ring
- Sidebar active state has visible indigo left-border accent
- Metric cards have icon wrappers, shadows, and hover lift
- Landing page CTAs have glow effects and scale transforms
- Feature cards and pricing buttons have polished hover states
- Dashboard text contrast improved via muted-foreground bump
- Zero ad-hoc button style overrides remain in dashboard pages
</success_criteria>

<output>
After completion, create `.planning/quick/260409-fiq-comprehensive-ui-polish-buttons-sidebar-/260409-fiq-SUMMARY.md`
</output>
