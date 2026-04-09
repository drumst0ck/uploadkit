// Server Component — inline SVG logo mark + wordmark
// Mark: rounded square with indigo→purple gradient, white upload arrow, white tray
// Wordmark: "Upload" white + "Kit" indigo

interface LogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
}

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = 'logo-gradient'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      {/* Rounded square background */}
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      {/* Upload arrow / triangle pointing up */}
      <polygon points="16,7 23,17 9,17" fill="white" />
      {/* Tray / container — semi-transparent white bar */}
      <rect x="9" y="19" width="14" height="4" rx="1.5" fill="white" fillOpacity="0.55" />
    </svg>
  )
}

export function Logo({ size = 32, showWordmark = true, className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className="font-display text-lg font-bold leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span style={{ color: '#fafafa' }}>Upload</span>
          <span style={{ color: '#818cf8' }}>Kit</span>
        </span>
      )}
    </span>
  )
}
