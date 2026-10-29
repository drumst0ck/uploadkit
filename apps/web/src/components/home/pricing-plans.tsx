'use client'

// Plan cards (monthly/yearly switch) and the "Which plan fits?" estimator.
// All numbers arrive as props from pricing.tsx, which derives them from TIER_LIMITS,
// TIER_FEATURES and tier-data.ts; nothing is duplicated here.

import { useId, useMemo, useState } from 'react'

export interface PlanView {
  slug: 'free' | 'pro' | 'team'
  name: string
  forWhom: string
  monthly: number
  yearly: number
  cta: string
  href: string
  pick: boolean
  items: { strong: string; rest: string }[]
  limits: { storageGb: number; bandwidthGb: number; uploads: number; maxFileMb: number; overage: boolean }
}

export interface Rates {
  storagePerGb: number
  bandwidthPerGb: number
  uploadsPerUnit: number
}

interface Props {
  plans: PlanView[]
  rates: Rates
  /** Largest file the paid plans accept, as text (e.g. "5 GB"), for the Enterprise hint. */
  largestPaidFile: string
}

const money = (n: number) => `$${n % 1 ? n.toFixed(2) : n}`
const num = (v: string) => {
  const n = parseFloat(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function PricingPlans({ plans, rates, largestPaidFile }: Props) {
  const [yearly, setYearly] = useState(false)
  const [sto, setSto] = useState('40')
  const [bw, setBw] = useState('120')
  const [up, setUp] = useState('12000')
  const [mx, setMx] = useState('50')
  const uid = useId()
  const paid = plans.filter((p) => p.monthly > 0)
  const yearlyNote = paid.map((p) => `${p.name} $${p.yearly * 12}`).join(', ')

  const result = useMemo(() => {
    const [s, b, u, m] = [num(sto), num(bw), num(up), num(mx)]
    let best: { p: PlanView; cost: number; over: number } | null = null
    for (const p of plans) {
      if (m > p.limits.maxFileMb) continue
      const base = yearly ? p.yearly : p.monthly
      if (!p.limits.overage) {
        if (s <= p.limits.storageGb && b <= p.limits.bandwidthGb && u <= p.limits.uploads && (!best || base < best.cost)) best = { p, cost: base, over: 0 }
        continue
      }
      const over =
        Math.max(0, s - p.limits.storageGb) * rates.storagePerGb +
        Math.max(0, b - p.limits.bandwidthGb) * rates.bandwidthPerGb +
        Math.max(0, u - p.limits.uploads) * rates.uploadsPerUnit
      if (!best || base + over < best.cost - 0.005) best = { p, cost: base + over, over }
    }
    if (!best) return { text: 'Talk to us about Enterprise.', why: `Files over ${largestPaidFile} need the Enterprise plan.` }
    const { p, cost, over } = best
    return {
      text: `${p.name} fits: ${money(cost)} a month${over ? `, including ${money(Number(over.toFixed(2)))} overage.` : ', no overage.'}`,
      why:
        p.slug === 'free'
          ? 'Everything you entered fits the free limits.'
          : `Largest file ${mx || 0} MB, ${num(up).toLocaleString('en-US')} uploads and ${num(sto)} GB stored.${yearly ? ' Yearly price shown.' : ''}`,
    }
  }, [plans, rates, yearly, sto, bw, up, mx, largestPaidFile])

  const fields = [
    { id: 'sto', label: 'Storage, GB', value: sto, set: setSto, step: 1 },
    { id: 'bw', label: 'Bandwidth, GB a month', value: bw, set: setBw, step: 1 },
    { id: 'up', label: 'Uploads a month', value: up, set: setUp, step: 100 },
    { id: 'mx', label: 'Largest file, MB', value: mx, set: setMx, step: 1 },
  ]

  return (
    <>
      <div className="wide pr-bar rise js-only">
        <label className="pd-switch">
          <input type="checkbox" role="switch" checked={yearly} onChange={(e) => setYearly(e.target.checked)} />
          Pay yearly, save 20%
        </label>
        <p className="soft small" aria-live="polite">
          {yearly ? `Billed yearly: ${yearlyNote} a year.` : 'Billed monthly. Change or cancel any time from the dashboard.'}
        </p>
      </div>

      <div className="pr-plans">
        {plans.map((p) => {
          const price = yearly ? p.yearly : p.monthly
          return (
            <article key={p.slug} className={`pr-plan${p.pick ? ' pr-plan--pick' : ''} rise`} aria-labelledby={`${uid}-${p.slug}`}>
              <h3 id={`${uid}-${p.slug}`}>{p.name}</h3>
              <p className="pr-for">{p.forWhom}</p>
              <p className="pr-price">
                <span className="pr-amt">${price}</span>
                <span className="pr-per">{p.monthly === 0 ? 'forever' : yearly ? 'a month, billed yearly' : 'a month'}</span>
              </p>
              {p.pick ? (
                <a className="pd-button pd-button--primary" href={p.href}>{p.cta}</a>
              ) : (
                <a className="pr-link go" href={p.href}>{p.cta}</a>
              )}
              <ul className="pr-list">
                {p.items.map((i) => (
                  <li key={i.strong + i.rest}>
                    {i.strong && <b>{i.strong} </b>}
                    {i.rest}
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>

      <div className="pr-est rise js-only" data-ui>
        <h3>Which plan fits?</h3>
        <p className="soft">Enter what you expect in a month. The estimate uses the limits and overage rates on this page.</p>
        <div className="pr-fields">
          {fields.map((f) => (
            <div className="pd-field" key={f.id}>
              <label className="pd-label" htmlFor={`${uid}-${f.id}`}>{f.label}</label>
              <input className="pd-input" id={`${uid}-${f.id}`} type="number" min={0} step={f.step} inputMode="numeric" value={f.value} onChange={(e) => f.set(e.target.value)} />
            </div>
          ))}
        </div>
        <p className="pr-result" aria-live="polite">{result.text}</p>
        <p className="soft small">{result.why}</p>
      </div>
    </>
  )
}
