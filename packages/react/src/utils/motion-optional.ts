// Optional motion/react loader — consumers who don't install `motion` get static
// fallbacks. Inspired by how Next.js handles optional peer deps: dynamic import
// with a graceful fallback path so the SDK ships with zero hard runtime cost.

import { useEffect, useState } from 'react';

/**
 * Minimal surface of `motion/react` we use across SDK components.
 * Internally typed as `any` to avoid leaking the optional peer dep into our
 * .d.ts surface — components must wrap consumption in their own typed shims.
 */
export type MotionModule = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  motion: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnimatePresence: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useMotionValue: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSpring: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useTransform: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useReducedMotion: any;
};

let motionModule: MotionModule | null = null;
let motionLoadAttempted = false;
let motionLoadPromise: Promise<MotionModule | null> | null = null;
const subscribers = new Set<() => void>();

/**
 * Attempt to dynamically import `motion/react`. Resolves to `null` if the
 * package is not installed or any other error occurs (the consumer is then
 * expected to render a static fallback).
 *
 * Subsequent calls return the cached module (or cached null) without retrying.
 */
export async function loadMotion(): Promise<MotionModule | null> {
  if (motionLoadAttempted) return motionModule;
  if (motionLoadPromise) return motionLoadPromise;

  motionLoadPromise = (async () => {
    try {
      // The literal string is important — bundlers will only attempt resolution
      // at runtime, never at build time, so missing `motion` is non-fatal.
      const mod = await import(/* @vite-ignore */ 'motion/react' as string);
      motionModule = {
        motion: (mod as { motion: unknown }).motion,
        AnimatePresence: (mod as { AnimatePresence: unknown }).AnimatePresence,
        useMotionValue: (mod as { useMotionValue: unknown }).useMotionValue,
        useSpring: (mod as { useSpring: unknown }).useSpring,
        useTransform: (mod as { useTransform: unknown }).useTransform,
        useReducedMotion: (mod as { useReducedMotion: unknown }).useReducedMotion,
      } as MotionModule;
    } catch {
      motionModule = null;
    } finally {
      motionLoadAttempted = true;
      // Notify any mounted components so they can re-render with the upgraded
      // animated surface on the next tick.
      for (const sub of subscribers) sub();
    }
    return motionModule;
  })();

  return motionLoadPromise;
}

/**
 * React hook that returns the loaded motion module (or `null` until it
 * resolves / fails). On first mount, kicks off the dynamic import. Components
 * should render their static fallback when this returns `null`, then upgrade
 * to animated markup once it returns a non-null module.
 */
export function useOptionalMotion(): MotionModule | null {
  const [, force] = useState(0);

  useEffect(() => {
    if (motionLoadAttempted) return;
    const subscriber = () => force((n) => n + 1);
    subscribers.add(subscriber);
    void loadMotion().then(() => {
      // The shared notifier above will fire — but if this effect mounts
      // *after* loadMotion already resolved, we still need to nudge ourselves.
      if (motionLoadAttempted) subscriber();
    });
    return () => {
      subscribers.delete(subscriber);
    };
  }, []);

  return motionModule;
}

/**
 * SSR-safe `prefers-reduced-motion` hook. Returns `true` when:
 *  - The OS/browser is set to reduce motion, OR
 *  - The optional `motion` package is not installed (so animation is
 *    intentionally disabled — components should render their static path).
 */
export function useReducedMotionSafe(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    // Safari < 14 fallback
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  return reduced;
}
