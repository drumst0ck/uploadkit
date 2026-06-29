---
quick_id: 260629-l3i
status: complete
completed: 2026-06-29
commit: a8a8e4b
---

# Cookie consent for analytics and advertising

Implemented a shared consent banner for the public site and dashboard. Google Consent Mode now defaults analytics and advertising storage to denied, and GTM only mounts after explicit acceptance.

## Delivered

- Accessible accept, reject, and cookie-settings controls shared through `@uploadkitdev/ui`.
- Consent persisted for 180 days and shared across `uploadkit.dev` subdomains.
- GTM and the X Pixel blocked until consent; withdrawing consent reloads the page without third-party tags.
- Responsive banner styling for desktop and mobile.

## Verification

- TypeScript checks passed for UI, web, and dashboard.
- ESLint and Prettier checks passed for every changed source file.
- Browser QA confirmed no tracking before consent, GTM after acceptance, and no tracking after withdrawal.
