import type { Config } from '@react-router/dev/config';

export default {
  // Framework mode (SSR) — matches the upstream `npx create-react-router`
  // defaults. Flip `ssr` to `false` to ship a pre-rendered SPA.
  ssr: true,
} satisfies Config;
