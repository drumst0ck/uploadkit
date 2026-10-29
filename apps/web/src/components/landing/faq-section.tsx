import { JsonLd } from './json-ld'
import { faqJsonLd, graph, type FaqEntry } from '@/lib/json-ld'

interface FaqSectionProps {
  items: FaqEntry[]
  id?: string
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
  title = 'Frequently asked questions',
  emitJsonLd = true,
}: FaqSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="faq">
      {emitJsonLd && <JsonLd data={graph(faqJsonLd(items))} />}
      <div className="col">
        <h2 id={`${id}-heading`}>{title}</h2>
      </div>
      <div className="col" style={{ marginTop: 40 }}>
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
    </section>
  )
}
