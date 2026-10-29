// Logo mark + wordmark. Brand S2: pure monochrome. The mark follows the text
// colour (white in dark, black in light) and the glyph is cut out in the surface
// colour. No gradient, no accent.

interface LogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
}

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
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
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <polygon points="16,7 23,17 9,17" fill="var(--pd-color-bg-surface)" />
      <rect x="9" y="19" width="14" height="4" rx="1.5" fill="var(--pd-color-bg-surface)" fillOpacity="0.55" />
    </svg>
  )
}

export function Logo({ size = 32, showWordmark = true, className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-foreground ${className ?? ''}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="text-[1.0625rem] font-medium leading-none tracking-[-0.01em]">
          UploadKit
        </span>
      )}
    </span>
  )
}
