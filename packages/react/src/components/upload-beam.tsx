import {
  useId,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type AnimationEvent,
} from 'react';

/* --------------------------------------------------------------------------
 * UploadBeam — Apple Intelligence-style border beam animation for uploads.
 *
 * Technique: CSS @property with syntax "<angle>" to animate --beam-angle
 * from 0deg to 360deg via a conic-gradient, then mask-composite: intersect,
 * exclude restricts the conic gradient to the border area only.
 *
 * Vendored and simplified from border-beam (MIT). No external dependencies.
 * -------------------------------------------------------------------------- */

export type UploadBeamState = 'idle' | 'uploading' | 'complete' | 'error';

export type UploadBeamProps = {
  children: React.ReactNode;
  /** Upload lifecycle state. Default 'idle'. */
  state?: UploadBeamState;
  /** Shortcut: true = 'uploading', false = 'idle'. Overridden by `state`. */
  active?: boolean;
  /** Beam rotation speed in seconds. Default 2. */
  duration?: number;
  /** Border radius in px. Auto-detected from child if omitted. */
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
};

/* ---- system theme hook -------------------------------------------------- */

function useSystemTheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return theme;
}

/* ---- CSS generation ----------------------------------------------------- */

type BeamCSSOptions = {
  id: string;
  borderRadius: number;
  duration: number;
  isDark: boolean;
};

/**
 * Generates all CSS needed for a single UploadBeam instance.
 * Uses @property for angle interpolation + conic-gradient for the beam.
 */
function generateBeamCSS({ id, borderRadius, duration, isDark }: BeamCSSOptions): string {
  const borderWidth = 2;
  const innerRadius = Math.max(0, borderRadius - borderWidth);

  // The beam "spotlight" — brighter in dark mode, darker in light mode
  const beamGradient = isDark
    ? `conic-gradient(
        from var(--beam-angle-${id}),
        transparent 0%, transparent 54%,
        rgba(99, 102, 241, 0.15) 57%,
        rgba(99, 102, 241, 0.4) 60%,
        rgba(129, 140, 248, 0.7) 63%,
        rgba(165, 180, 252, 0.9) 66%,
        rgba(129, 140, 248, 0.7) 69%,
        rgba(99, 102, 241, 0.4) 72%,
        rgba(99, 102, 241, 0.15) 75%,
        transparent 78%, transparent 100%
      )`
    : `conic-gradient(
        from var(--beam-angle-${id}),
        transparent 0%, transparent 54%,
        rgba(79, 70, 229, 0.1) 57%,
        rgba(79, 70, 229, 0.25) 60%,
        rgba(99, 102, 241, 0.5) 63%,
        rgba(99, 102, 241, 0.65) 66%,
        rgba(99, 102, 241, 0.5) 69%,
        rgba(79, 70, 229, 0.25) 72%,
        rgba(79, 70, 229, 0.1) 75%,
        transparent 78%, transparent 100%
      )`;

  // Bloom glow behind the beam
  const bloomGradient = isDark
    ? `conic-gradient(
        from var(--beam-angle-${id}),
        transparent 0%, transparent 58%,
        rgba(255, 255, 255, 0.03) 62%,
        rgba(255, 255, 255, 0.08) 65%,
        rgba(255, 255, 255, 0.2) 67%,
        rgba(255, 255, 255, 0.45) 69%,
        rgba(255, 255, 255, 0.85) 70%,
        rgba(255, 255, 255, 0.85) 70.5%,
        rgba(255, 255, 255, 0.45) 71.5%,
        rgba(255, 255, 255, 0.2) 73%,
        rgba(255, 255, 255, 0.08) 75%,
        rgba(255, 255, 255, 0.03) 78%,
        transparent 82%
      )`
    : `conic-gradient(
        from var(--beam-angle-${id}),
        transparent 0%, transparent 58%,
        rgba(0, 0, 0, 0.02) 62%,
        rgba(0, 0, 0, 0.08) 65%,
        rgba(0, 0, 0, 0.2) 67%,
        rgba(0, 0, 0, 0.4) 69%,
        rgba(0, 0, 0, 0.6) 70%,
        rgba(0, 0, 0, 0.6) 70.5%,
        rgba(0, 0, 0, 0.4) 71.5%,
        rgba(0, 0, 0, 0.2) 73%,
        rgba(0, 0, 0, 0.08) 75%,
        rgba(0, 0, 0, 0.02) 78%,
        transparent 82%
      )`;

  const innerShadow = isDark ? 'rgba(255, 255, 255, 0.27)' : 'rgba(0, 0, 0, 0.14)';

  return `
@property --beam-angle-${id} {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: true;
}

@property --beam-opacity-${id} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

[data-beam="${id}"] {
  position: relative;
  border-radius: ${borderRadius}px;
  overflow: hidden;
  isolation: isolate;
}

/* ---- Active (spinning) ---- */
[data-beam="${id}"][data-active] {
  animation:
    beam-spin-${id} ${duration}s linear infinite,
    beam-fade-in-${id} 0.6s ease forwards;
}

/* ---- Fading out ---- */
[data-beam="${id}"][data-fading] {
  animation:
    beam-spin-${id} ${duration}s linear infinite,
    beam-fade-out-${id} 0.5s ease forwards;
}

/* ---- Beam stroke (::after) ---- */
[data-beam="${id}"][data-active]::after,
[data-beam="${id}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${innerRadius}px;
  padding: ${borderWidth}px;
  clip-path: inset(0 round ${borderRadius}px);
  background: ${beamGradient};
  -webkit-mask:
    conic-gradient(
      from var(--beam-angle-${id}),
      transparent 0%, transparent 30%,
      rgba(255, 255, 255, 0.1) 36%, rgba(255, 255, 255, 0.35) 44%,
      white 52%, white 80%,
      rgba(255, 255, 255, 0.35) 86%, rgba(255, 255, 255, 0.1) 92%,
      transparent 95%, transparent 100%
    ),
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: source-in, xor;
  mask:
    conic-gradient(
      from var(--beam-angle-${id}),
      transparent 0%, transparent 30%,
      rgba(255, 255, 255, 0.1) 36%, rgba(255, 255, 255, 0.35) 44%,
      white 52%, white 80%,
      rgba(255, 255, 255, 0.35) 86%, rgba(255, 255, 255, 0.1) 92%,
      transparent 95%, transparent 100%
    ),
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: intersect, exclude;
  pointer-events: none;
  z-index: 2;
  opacity: calc(var(--beam-opacity-${id}) * 0.85);
}

/* ---- Inner glow (::before) ---- */
[data-beam="${id}"][data-active]::before,
[data-beam="${id}"][data-fading]::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${borderRadius}px;
  clip-path: inset(0 round ${borderRadius}px);
  box-shadow: inset 0 0 5px 1px ${innerShadow};
  pointer-events: none;
  z-index: 1;
  opacity: calc(var(--beam-opacity-${id}) * 0.7);
}

/* ---- Bloom ---- */
[data-beam="${id}"] [data-beam-bloom] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${innerRadius}px;
  clip-path: inset(0 round ${borderRadius}px);
  background: ${bloomGradient};
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: ${borderWidth}px;
  filter: blur(8px) brightness(1.3) saturate(1.2);
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}

[data-beam="${id}"][data-active] [data-beam-bloom],
[data-beam="${id}"][data-fading] [data-beam-bloom] {
  display: block;
  opacity: calc(var(--beam-opacity-${id}) * 0.8);
}

/* ---- State color overrides via CSS custom properties ---- */
[data-beam="${id}"][data-beam-state="complete"]::after {
  filter: hue-rotate(100deg) saturate(1.5);
}
[data-beam="${id}"][data-beam-state="error"]::after {
  filter: hue-rotate(-20deg) saturate(2);
}

/* ---- Keyframes ---- */
@keyframes beam-spin-${id} {
  to { --beam-angle-${id}: 360deg; }
}
@keyframes beam-fade-in-${id} {
  to { --beam-opacity-${id}: 1; }
}
@keyframes beam-fade-out-${id} {
  from { --beam-opacity-${id}: 1; }
  to { --beam-opacity-${id}: 0; }
}

/* ---- Reduced motion ---- */
@media (prefers-reduced-motion: reduce) {
  [data-beam="${id}"][data-active],
  [data-beam="${id}"][data-fading] {
    animation: none !important;
  }
  [data-beam="${id}"][data-active]::after {
    content: "";
    opacity: 0.3;
    background: conic-gradient(
      from 0deg,
      var(--uk-accent, #6366f1) 0%,
      transparent 25%,
      transparent 75%,
      var(--uk-accent, #6366f1) 100%
    );
  }
  [data-beam="${id}"][data-active] [data-beam-bloom] {
    display: none;
  }
}
`;
}

/* ---- Component ---------------------------------------------------------- */

/**
 * UploadBeam wraps any element with an animated border beam effect.
 * The beam activates during uploads and transitions through color
 * states (accent -> green on success, red on error).
 *
 * Technique: CSS @property angle animation + conic-gradient + mask-composite.
 * Zero external dependencies.
 *
 * @example
 * ```tsx
 * <UploadBeam state="uploading">
 *   <Card>Drop files here</Card>
 * </UploadBeam>
 * ```
 */
export function UploadBeam({
  children,
  state = 'idle',
  active,
  duration = 2,
  borderRadius: customBorderRadius,
  className,
  style,
}: UploadBeamProps) {
  const baseId = useId();
  const id = baseId.replace(/:/g, '-');
  const systemTheme = useSystemTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Resolve effective state: `active` prop is a convenience shorthand
  const effectiveState: UploadBeamState =
    state !== 'idle' ? state : active ? 'uploading' : 'idle';

  const [isActive, setIsActive] = useState(effectiveState === 'uploading');
  const [isFading, setIsFading] = useState(false);
  const [beamColorState, setBeamColorState] = useState<UploadBeamState>('idle');
  const [detectedRadius, setDetectedRadius] = useState<number | null>(null);

  // Auto-detect child border radius
  useEffect(() => {
    if (customBorderRadius != null) return;
    const el = wrapperRef.current;
    if (!el) return;

    const detect = () => {
      const child = el.firstElementChild as HTMLElement | null;
      if (!child) return;
      const raw = parseFloat(getComputedStyle(child).borderTopLeftRadius);
      if (!isNaN(raw) && raw > 0) {
        setDetectedRadius(raw);
      }
    };

    detect();
    const observer = new MutationObserver(detect);
    observer.observe(el, { childList: true, subtree: false });
    return () => observer.disconnect();
  }, [customBorderRadius, children]);

  // State machine: idle / uploading / complete / error
  useEffect(() => {
    if (effectiveState === 'uploading') {
      setBeamColorState('uploading');
      if (!isActive && !isFading) {
        setIsActive(true);
      }
    } else if (effectiveState === 'complete' || effectiveState === 'error') {
      setBeamColorState(effectiveState);
      // Hold for 1.5s, then fade out
      const holdTimer = setTimeout(() => {
        setIsFading(true);
      }, 1500);
      return () => clearTimeout(holdTimer);
    } else {
      // idle — if we were active, fade out
      if (isActive && !isFading) {
        setIsFading(true);
      }
    }
  }, [effectiveState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnimationEnd = useCallback((e: AnimationEvent<HTMLDivElement>) => {
    const name = e.animationName;
    if (name.includes('fade-out')) {
      setIsActive(false);
      setIsFading(false);
      setBeamColorState('idle');
    }
  }, []);

  const finalRadius = customBorderRadius ?? detectedRadius ?? 12;

  const cssStyles = useMemo(
    () =>
      generateBeamCSS({
        id,
        borderRadius: finalRadius,
        duration,
        isDark: systemTheme === 'dark',
      }),
    [id, finalRadius, duration, systemTheme],
  );

  const showBeam = isActive || isFading;

  return (
    <>
      <style>{cssStyles}</style>
      <div
        ref={wrapperRef}
        data-beam={id}
        data-active={showBeam && !isFading ? '' : undefined}
        data-fading={isFading ? '' : undefined}
        data-beam-state={beamColorState !== 'idle' ? beamColorState : undefined}
        className={className}
        style={style as CSSProperties}
        onAnimationEnd={handleAnimationEnd}
      >
        {children}
        <div data-beam-bloom />
      </div>
    </>
  );
}

UploadBeam.displayName = 'UploadBeam';
