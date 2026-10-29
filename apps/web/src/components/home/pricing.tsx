// Pricing section. Data comes from tier-data.ts and @uploadkitdev/shared (TIER_LIMITS,
// TIER_FEATURES); only the "who is it for" lines and the guarantees are written here.

import Link from 'next/link'
import { OVERAGE_PRICING, TIERS_DATA, formatBytes, formatNumber } from '@/lib/tier-data'
import { PricingPlans, type PlanView } from './pricing-plans'

const FOR: Record<string, string> = {
  free: 'For side projects and prototypes.',
  pro: 'For apps in production that need room to grow.',
  team: 'For teams shipping several products.',
}
const GB = 1024 ** 3
const MB = 1024 ** 2

const [FREE, PRO, TEAM, ENTERPRISE] = TIERS_DATA
const PLAN_TIERS = [FREE, PRO, TEAM] as const

function items(t: (typeof PLAN_TIERS)[number]): PlanView['items'] {
  const l = t.limits
  const f = t.features
  const out: PlanView['items'] = [
    { strong: formatBytes(l.maxStorageBytes), rest: 'storage' },
    { strong: formatBytes(l.maxBandwidthBytes), rest: 'bandwidth a month' },
    { strong: formatNumber(l.maxUploadsPerMonth), rest: 'uploads a month' },
    { strong: formatBytes(l.maxFileSizeBytes), rest: 'per file' },
  ]
  if (l.maxImageTransformsPerMonth > 0) out.push({ strong: formatNumber(l.maxImageTransformsPerMonth), rest: 'image transforms a month' })
  out.push({ strong: String(l.maxProjects), rest: f.teamMembers > 1 ? 'projects' : `projects, ${l.maxApiKeys} API keys` })
  if (f.teamMembers > 1) out.push({ strong: String(f.teamMembers), rest: 'team members' })
  if (f.customCdnDomain && f.webhooks) out.push({ strong: '', rest: 'Custom CDN domain and webhooks' })
  if (f.sla) out.push({ strong: '', rest: `${f.sla} uptime SLA` })
  out.push({ strong: '', rest: `${f.support} support` })
  return out
}

const plans: PlanView[] = PLAN_TIERS.map((t) => ({
  slug: t.slug,
  name: t.name,
  forWhom: FOR[t.slug]!,
  monthly: t.price.monthly,
  yearly: t.price.yearly,
  cta: t.slug === 'free' ? 'Start free' : 'Start 14-day trial',
  href: t.ctaHref,
  pick: t.slug === 'pro',
  items: items(t),
  limits: {
    storageGb: t.limits.maxStorageBytes / GB,
    bandwidthGb: t.limits.maxBandwidthBytes / GB,
    uploads: t.limits.maxUploadsPerMonth,
    maxFileMb: t.limits.maxFileSizeBytes / MB,
    overage: t.slug !== 'free',
  },
}))

const yes = (v: boolean) => (v ? 'Yes' : 'No')
const ROWS: { label: string; cell: (t: (typeof PLAN_TIERS)[number]) => string }[] = [
  { label: 'Storage', cell: (t) => formatBytes(t.limits.maxStorageBytes) },
  { label: 'Bandwidth a month', cell: (t) => formatBytes(t.limits.maxBandwidthBytes) },
  { label: 'Uploads a month', cell: (t) => formatNumber(t.limits.maxUploadsPerMonth) },
  { label: 'Max file size', cell: (t) => formatBytes(t.limits.maxFileSizeBytes) },
  { label: 'Image transforms a month', cell: (t) => (t.features.imageTransforms ? formatNumber(t.limits.maxImageTransformsPerMonth) : 'Not included') },
  { label: 'Projects', cell: (t) => String(t.limits.maxProjects) },
  { label: 'API keys', cell: (t) => String(t.limits.maxApiKeys) },
  { label: 'Team members', cell: (t) => String(t.features.teamMembers) },
  { label: 'Custom CDN domain', cell: (t) => yes(t.features.customCdnDomain) },
  { label: 'Webhooks', cell: (t) => yes(t.features.webhooks) },
  { label: 'Uptime SLA', cell: (t) => t.features.sla ?? 'None' },
  { label: 'Support', cell: (t) => t.features.support },
]

const R = OVERAGE_PRICING

const INTRO =
  'The SDK and all 40+ components are free and MIT-licensed. You pay only for managed storage, bandwidth and image transforms, and your own bucket is always an option.'

/** `standalone` is the /pricing route: the heading becomes the page h1 and the self-link is dropped. */
export function Pricing({ standalone = false }: { standalone?: boolean }) {
  return (
    <section aria-labelledby="h-price" id="pricing" style={standalone ? { marginTop: 0 } : undefined}>
      {standalone ? (
        <div className="page-head">
          <h1 id="h-price" className="page-title enter">Simple, transparent pricing</h1>
          <div className="col">
            <p className="enter">{INTRO}</p>
          </div>
        </div>
      ) : (
        <div className="col">
          <h2 id="h-price" className="rise">Start free, pay when you grow.</h2>
          <p className="rise">{INTRO}</p>
        </div>
      )}

      <PricingPlans
        plans={plans}
        rates={R}
        largestPaidFile={formatBytes(TEAM.limits.maxFileSizeBytes)}
      />

      <div className="wide rise">
        <h3 className="pr-h3" id="h-cmp">Compare every limit</h3>
        <div className="pd-table-wrap" data-ui tabIndex={0} aria-labelledby="h-cmp">
          <table className="pd-table">
            <thead>
              <tr>
                <th scope="col">Limit</th>
                {PLAN_TIERS.map((t) => <th scope="col" key={t.slug}>{t.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {PLAN_TIERS.map((t) => <td key={t.slug}>{r.cell(t)}</td>)}
                </tr>
              ))}
              <tr>
                <th scope="row">Over the limit</th>
                <td>New uploads blocked</td>
                <td colSpan={2}>
                  ${R.storagePerGb.toFixed(2)} per GB stored, ${R.bandwidthPerGb.toFixed(2)} per GB served, ${R.uploadsPerUnit.toFixed(3)} per upload
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="col pr-small rise">
        <p>
          <b>Every plan includes</b>{' '}
          the open-source SDK, all 40+ React components, bring-your-own-bucket, the MCP server for AI
          editors and delivery from Cloudflare&apos;s network.
        </p>
        <p>
          <b>No surprises.</b> We email you at 80% of any limit. Upgrades and downgrades apply at once and are prorated. Pro and
          Team start with a 14-day trial, no card required.
        </p>
        <p>
          Need more than Team, SSO or a 99.99% SLA? <a className="go" href={ENTERPRISE.ctaHref}>Talk to us about Enterprise</a>
        </p>
        <p className="soft">
          {!standalone && (<>The full breakdown lives on the <Link href="/pricing">pricing page</Link>. </>)}Weighing options? Compare UploadKit with{' '}
          <Link href="/vs/uploadthing">UploadThing</Link>, <Link href="/vs/uploadcare">Uploadcare</Link>,{' '}
          <Link href="/vs/filestack">Filestack</Link> and <Link href="/vs/bytescale">Bytescale</Link>, or follow the{' '}
          <a href="https://docs.uploadkit.dev/docs/guides/migration-from-uploadthing">UploadThing migration guide</a>.
        </p>
      </div>
    </section>
  )
}
