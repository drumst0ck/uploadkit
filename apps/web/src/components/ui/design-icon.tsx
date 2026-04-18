// Server Component — stroke-based SVG icon set (Claude Design).
// Ported from /tmp/design-fetch/extracted/todolol/project/components/Icons.jsx with
// strict typing. Zero-dependency (no lucide-react).

import type { ReactElement, SVGProps } from 'react'

export type IconName =
  | 'upload'
  | 'cloud'
  | 'zap'
  | 'lock'
  | 'code'
  | 'globe'
  | 'check'
  | 'copy'
  | 'x'
  | 'image'
  | 'file'
  | 'video'
  | 'gh'
  | 'moon'
  | 'sun'
  | 'layers'
  | 'terminal'
  | 'palette'
  | 'sparkle'
  | 'shield'
  | 'git'
  | 'gauge'
  | 'plug'
  | 'arrow'

interface DesignIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  className?: string
}

const PATHS: Record<IconName, ReactElement> = {
  upload: (
    <>
      <path d="M12 3v14" />
      <path d="m6 9 6-6 6 6" />
      <path d="M4 21h16" />
    </>
  ),
  cloud: <path d="M17 17a4 4 0 0 0 .7-7.94 6 6 0 0 0-11.4 1.05A4.5 4.5 0 0 0 7 19h10Z" />,
  zap: <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  code: (
    <>
      <polyline points="8 6 2 12 8 18" />
      <polyline points="16 6 22 12 16 18" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 3 2.5 15 0 18" />
      <path d="M12 3c-2.5 3-2.5 15 0 18" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  video: (
    <>
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="m22 7-6 5 6 5V7Z" />
    </>
  ),
  gh: (
    <path d="M9 19c-4 1.5-4-2-6-2m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C7.8 2.7 6.7 3 6.7 3a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 5.3 9.4c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.9 19.1 1.4-1.4" />
      <path d="m17.7 6.3 1.4-1.4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 10 6-10 6L2 8l10-6Z" />
      <path d="m2 16 10 6 10-6" />
      <path d="m2 12 10 6 10-6" />
    </>
  ),
  terminal: (
    <>
      <path d="m4 17 6-6-6-6" />
      <path d="M12 19h8" />
    </>
  ),
  palette: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="7.5" cy="10.5" r="1" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="16.5" cy="10.5" r="1" />
      <path d="M12 21c1.5 0 2-1 2-2s-.5-2-2-2-2 1-2 2 .5 2 2 2Z" />
    </>
  ),
  sparkle: (
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
  ),
  shield: <path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z" />,
  git: (
    <>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="6" cy="6" r="2" />
      <path d="M6 8v8" />
      <path d="M18 8v2a3 3 0 0 1-3 3H9" />
    </>
  ),
  gauge: (
    <>
      <path d="M12 14 19 7" />
      <circle cx="12" cy="14" r="8" />
      <path d="M12 2v2" />
    </>
  ),
  plug: (
    <>
      <path d="M12 2v8" />
      <path d="M5 10h14l-1 5a4 4 0 0 1-4 3h-4a4 4 0 0 1-4-3L5 10Z" />
      <path d="M9 22v-4M15 22v-4" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
}

export function DesignIcon({ name, size = 16, className, ...rest }: DesignIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
