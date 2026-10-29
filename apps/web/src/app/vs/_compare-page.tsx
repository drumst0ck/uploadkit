import {
  LandingShell,
  LandingHero,
  LandingSection,
  CodeBlock,
  ComparisonTable,
  FeatureList,
  FaqSection,
  CtaBand,
  RelatedLinks,
  JsonLd,
} from '@/components/landing'
import { ORGANIZATION, breadcrumbJsonLd, faqJsonLd, graph } from '@/lib/json-ld'
import { CHECKED, QUICKSTART_COMPONENT, QUICKSTART_INSTALL, type CompareConfig } from './_data'

export function ComparePage({ c }: { c: CompareConfig }) {
  const path = `/vs/${c.slug}`
  return (
    <LandingShell>
      <JsonLd
        data={graph(
          ORGANIZATION,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Compare', path },
            { name: `UploadKit vs ${c.name}`, path },
          ]),
          faqJsonLd(c.faq),
        )}
      />
      <LandingHero title={c.heroTitle} lead={c.heroLead} />
      <LandingSection id="overview" title={`UploadKit and ${c.name} in short`}>
        {c.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </LandingSection>
      <LandingSection
        id="comparison"
        title="Comparison table"
        lead={`${c.name} data comes from the vendor’s public pages, ${CHECKED}. UploadKit data comes from our plan limits.`}
      >
        <ComparisonTable caption={c.tableCaption} themLabel={c.name} rows={c.rows} />
        <p>
          Sources ({CHECKED}):{' '}
          {c.sources.map((s, i) => (
            <span key={s.href}>
              {i > 0 && ', '}
              <a href={s.href} rel="noopener noreferrer">
                {s.label}
              </a>
            </span>
          ))}
          . Vendors change prices; confirm on their site before you decide.
        </p>
      </LandingSection>
      <LandingSection id="pick-them" title={`When to pick ${c.name}`}>
        <FeatureList items={c.whenThem} />
      </LandingSection>
      <LandingSection id="pick-uploadkit" title="When to pick UploadKit">
        <FeatureList items={c.whenUs} />
      </LandingSection>
      <LandingSection id="migration" title={c.migrationTitle}>
        {c.migration.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <CodeBlock code={QUICKSTART_INSTALL} lang="bash" title="Install" />
        <CodeBlock code={QUICKSTART_COMPONENT} lang="tsx" title="app/profile/page.tsx" />
        <p>
          The button needs an upload route and a provider; the{' '}
          <a href="https://docs.uploadkit.dev/docs/getting-started/nextjs">Next.js quickstart</a> walks
          through both.
          {c.migrationLink && (
            <>
              {' '}
              <a href={c.migrationLink.href}>{c.migrationLink.label}</a>.
            </>
          )}
        </p>
      </LandingSection>
      <FaqSection items={c.faq} emitJsonLd={false} />
      <CtaBand />
      <RelatedLinks links={c.related} title="Related pages" />
    </LandingShell>
  )
}
