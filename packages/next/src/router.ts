import type { FileRouter, RouteConfig } from './types';

const SIZE_UNITS: Record<string, number> = {
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
};

/**
 * Converts a human-readable file size string to bytes.
 * Supports KB, MB, GB suffixes (case-insensitive).
 * If the input is already a number, it is returned as-is.
 *
 * @example
 * parseFileSize('4MB')  // 4194304
 * parseFileSize('1GB')  // 1073741824
 * parseFileSize(5000)   // 5000
 */
export function parseFileSize(size: string | number): number {
  if (typeof size === 'number') return size;

  const match = size.trim().match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)$/i);
  if (!match) {
    throw new Error(
      `Invalid file size format: "${size}". Expected format: "4MB", "512KB", "1GB"`
    );
  }

  const value = parseFloat(match[1]!);
  const unit = match[2]!.toLowerCase();
  const multiplier = SIZE_UNITS[unit];

  if (multiplier === undefined) {
    throw new Error(`Unknown size unit: "${unit}"`);
  }

  return Math.round(value * multiplier);
}

/**
 * Returns the RouteConfig for the given slug, or null if not found.
 */
export function getRouteConfig(
  router: FileRouter,
  slug: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): RouteConfig<any> | null {
  return router[slug] ?? null;
}
