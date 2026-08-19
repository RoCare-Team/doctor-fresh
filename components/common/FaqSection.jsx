import Accordion from './Accordion';

export default function FaqSection({ faqs = [], title = 'Frequently asked questions', jsonLd = true }) {
  if (!faqs.length) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer || (f.answerHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      },
    })),
  };

  return (
    <section className="border-t border-line pt-10">
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ) : null}
      <h2 className="mb-5 text-xl font-semibold text-ink-900 md:text-2xl">{title}</h2>
      <Accordion items={faqs} />
    </section>
  );
}
