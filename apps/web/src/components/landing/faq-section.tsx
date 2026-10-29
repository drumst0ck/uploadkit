import { JsonLd } from './json-ld'
import { faqJsonLd, graph, type FaqEntry } from '@/lib/json-ld'

interface FaqSectionProps {
  items: FaqEntry[]
  id?: string
  eyebrow?: string
  title?: string
  /**
   * Emit a standalone FAQPage JSON-LD script (default). Set false when the page
   * builds its own @graph with `faqJsonLd(items)` (e.g. the home page).
   */
  emitJsonLd?: boolean
}

/** Visible FAQ (native <details>) — answers are always in the DOM, matching the schema. */
export function FaqSection({
  items,
  id = 'faq',
  eyebrow = 'FAQ',
  title = 'Frequently asked questions',
  emitJsonLd = true,
}: FaqSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`}>
      {emitJsonLd && <JsonLd data={graph(faqJsonLd(items))} />}
      <div className="d2-container">
        <div className="section-head">
          <span className="eyebrow">{eyebrow}</span>
          <h2 id={`${id}-heading`} style={{ marginTop: 16 }}>
            {title}
          </h2>
        </div>
        <div className="landing-faq">
          {items.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>
                {item.answer}
                {item.link && (
                  <>
                    {' '}
                    <a href={item.link.href}>{item.link.label}</a>
                  </>
                )}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
