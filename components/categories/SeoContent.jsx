/**
 * Renders the long-form SEO copy that already exists on the live category,
 * service and location pages. Kept as a plain, readable article block.
 */
export default function SeoContent({ sections = [], title, html = '' }) {
  // Copy with pictures or video is shown as written (already made safe in
  // lib/sql/html.js); plain copy keeps the tidy section layout below.
  if (html) {
    return (
      <section className="border-t border-line pt-10">
        {title ? <h2 className="mb-5 text-xl font-semibold text-ink-900 md:text-2xl">{title}</h2> : null}
        <div className="df-prose df-rich max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      </section>
    );
  }
  if (!sections.length) return null;

  return (
    <section className="border-t border-line pt-10">
      {title ? <h2 className="mb-5 text-xl font-semibold text-ink-900 md:text-2xl">{title}</h2> : null}
      <div className="df-prose max-w-none">
        {sections.map((s, i) => (
          <div key={`${s.title}-${i}`} className={i ? 'mt-7' : ''}>
            <h3>{s.title}</h3>
            {s.paragraphs?.map((p, pi) => (
              <p key={pi}>{p}</p>
            ))}
            {s.bullets?.length ? (
              <ul>
                {s.bullets.map((b, bi) => (
                  <li key={bi}>{b}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
