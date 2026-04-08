---
status: partial
phase: 02-authentication
source: [02-02-PLAN.md checkpoint]
started: 2026-04-08
updated: 2026-04-08
---

## Current Test

[awaiting human testing]

## Tests

### 1. Route Protection
expected: Visit /dashboard unauthenticated → redirects to /login
result: [pending]

### 2. Login Page UI
expected: Dark centered card with GitHub button, Google button, "or" divider, email magic link input, sign-in/sign-up toggle
result: [pending]

### 3. GitHub OAuth Flow
expected: Click "Sign in with GitHub" → GitHub OAuth → lands on /dashboard with session
result: [pending]

### 4. Google OAuth Flow
expected: Click "Sign in with Google" → Google OAuth → lands on /dashboard with session
result: [pending]

### 5. Email Magic Link
expected: Enter email → receive magic link → click → authenticated on /dashboard
result: [pending]

### 6. Dashboard Session
expected: Header shows avatar/email, sign-out button. "My First Project" card visible (auto-created).
result: [pending]

### 7. Sign Out
expected: Click sign out → redirected to /login
result: [pending]

### 8. Session Persistence
expected: Close browser, reopen, visit /dashboard → still authenticated (30-day session)
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
