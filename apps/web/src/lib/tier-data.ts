import { TIER_LIMITS } from '@uploadkit/shared'

/**
 * Formats a byte count to a human-readable string.
 * @example formatBytes(5 * 1024 * 1024 * 1024) => "5 GB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === Infinity) return 'Unlimited'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  // Show integer if clean, otherwise one decimal
  const display = value % 1 === 0 ? value : value.toFixed(1)
  return `${display} ${units[unitIndex]}`
}

/**
 * Formats a number to a human-readable string.
 * @example formatNumber(1000) => "1,000"
 * @example formatNumber(Infinity) => "Unlimited"
 */
export function formatNumber(n: number): string {
  if (n === Infinity) return 'Unlimited'
  return n.toLocaleString('en-US')
}

export const TIERS_DATA = [
  {
    name: 'Free',
    slug: 'free',
    price: { monthly: 0, yearly: 0 },
    limits: TIER_LIMITS.FREE,
    popular: false,
    cta: 'Get started free',
    ctaHref: 'https://app.uploadkit.dev/login',
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: { monthly: 15, yearly: 12 },
    limits: TIER_LIMITS.PRO,
    popular: true,
    cta: 'Start free trial',
    ctaHref: 'https://app.uploadkit.dev/login',
  },
  {
    name: 'Team',
    slug: 'team',
    price: { monthly: 35, yearly: 28 },
    limits: TIER_LIMITS.TEAM,
    popular: false,
    cta: 'Start free trial',
    ctaHref: 'https://app.uploadkit.dev/login',
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    price: { monthly: null, yearly: null },
    limits: TIER_LIMITS.ENTERPRISE,
    popular: false,
    cta: 'Contact sales',
    ctaHref: 'mailto:sales@uploadkit.dev',
  },
] as const

export const OVERAGE_PRICING = {
  storagePerGb: 0.02,
  bandwidthPerGb: 0.01,
  uploadsPerUnit: 0.001,
} as const
