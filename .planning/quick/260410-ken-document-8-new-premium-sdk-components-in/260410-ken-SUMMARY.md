---
task: 260410-ken
type: quick
scope: docs
completed: 2026-04-10
---

# Quick Task 260410-ken Summary

Documented the 8 new premium SDK components shipped in `@uploadkitdev/react` (commits 18cd7d8, 0184586, 768ca64) across the Fumadocs site in `apps/docs`.

## Deliverables

### New MDX pages (apps/docs/content/docs/sdk/react/)

1. `upload-dropzone-glass.mdx` — frosted glass + indigo glow (Vercel / Linear)
2. `upload-dropzone-aurora.mdx` — conic mesh + cursor highlight (Apple / Supabase)
3. `upload-dropzone-terminal.mdx` — mono prompt + tail log (Raycast / Warp)
4. `upload-dropzone-brutal.mdx` — neobrutalist + stamp animation (Cash App / Gumroad)
5. `upload-button-shimmer.mdx` — CTA shimmer sweep (Vercel / Linear / Resend)
6. `upload-button-magnetic.mdx` — cursor-attracting pill (Apple product pages)
7. `upload-avatar.mdx` — circular blur-up + SVG progress ring (Linear / Notion / Apple ID)
8. `upload-inline-chat.mdx` — paperclip composer chips (ChatGPT / Linear / Slack)

Each page includes: frontmatter (title + description), design-inspiration line, motion optional-peer install callout, basic JSX usage, a props table mirroring the real TS signatures, a theming table listing only the CSS vars the component actually reads, and accessibility notes (keyboard, focus-visible, prefers-reduced-motion).

Props and CSS variables were verified directly against the component source files and `packages/react/src/styles.css`. For example:
- `UploadAvatar` documents `initialSrc`, `size` (default 96) and no `children` prop, matching the real signature.
- `UploadInlineChat` documents the `placeholder` prop (default `'Send a message...'`) but no `children`.
- `UploadDropzoneTerminal` theming table lists the three `--uk-terminal-*` tokens rather than generic ones.
- `UploadDropzoneBrutal` theming lists `--uk-brutal-bg`, `--uk-brutal-fg`, `--uk-brutal-shadow`.
- `UploadDropzoneAurora` theming lists `--uk-aurora-from/via/to`.
- `UploadDropzoneGlass` theming lists `--uk-glow` and `--uk-noise-opacity`.
- `UploadButtonShimmer` theming lists `--uk-shimmer` and `--uk-glow`.

### Updated `meta.json`

Reordered and extended the page list so the variants sit next to their base:
- 4 dropzone variants grouped immediately after `upload-dropzone`
- 2 button variants grouped immediately after `upload-button`
- `upload-avatar` and `upload-inline-chat` placed after `file-preview` as standalone specialty entries

### Updated `api-reference.mdx`

Added 8 new sections between `UploadDropzone` and `UploadModal`:
- Each section includes the `ForwardRefExoticComponent` signature
- Each section has a concise `{Component}Props` table or refers to a shared shape
- Dropzone variants share `UploadDropzoneGlassProps` shape
- Button variants share `UploadButtonShimmerProps` shape
- `UploadAvatar` and `UploadInlineChat` have their own tables (different prop sets)
- Added a `Callout` import at the top of the file and a closing callout noting the `motion` optional-peer behavior across all 8 variants

## Files modified / created

Created (10):
- `apps/docs/content/docs/sdk/react/upload-dropzone-glass.mdx`
- `apps/docs/content/docs/sdk/react/upload-dropzone-aurora.mdx`
- `apps/docs/content/docs/sdk/react/upload-dropzone-terminal.mdx`
- `apps/docs/content/docs/sdk/react/upload-dropzone-brutal.mdx`
- `apps/docs/content/docs/sdk/react/upload-button-shimmer.mdx`
- `apps/docs/content/docs/sdk/react/upload-button-magnetic.mdx`
- `apps/docs/content/docs/sdk/react/upload-avatar.mdx`
- `apps/docs/content/docs/sdk/react/upload-inline-chat.mdx`

Modified:
- `apps/docs/content/docs/sdk/react/meta.json`
- `apps/docs/content/docs/sdk/react/api-reference.mdx`

## Commits

- `c4985c4` docs(260410-ken): add MDX pages for 4 premium dropzone variants
- `e3b09a7` docs(260410-ken): add MDX pages for premium button and specialty upload components
- `e521c78` docs(260410-ken): wire premium components into meta.json and api-reference

## Deviations from brief

None. Props match source, theming vars are the ones actually read by each component, meta.json ordering follows the brief's grouping instructions, existing component docs were not touched, Co-Authored-By was not added to any commit.

## Self-Check: PASSED

All 8 new MDX files exist on disk, meta.json and api-reference.mdx were updated, all 3 commits are present in `git log`.
