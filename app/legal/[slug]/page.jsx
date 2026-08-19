import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
import { legal } from '@/data/site';
import { metaFor } from '@/lib/utils';

export function generateStaticParams() {
  return Object.keys(legal).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = legal[slug];
  if (!page) return {};

  return metaFor({
    title: page.title || page.heading,
    description: page.sections?.[0]?.paragraphs?.[0]?.slice(0, 160) || page.title,
    path: `/legal/${slug}`,
  });
}

export default async function LegalPage({ params }) {
  const { slug } = await params;
  const page = legal[slug];
  if (!page) notFound();

  return (
    <div className="df-container py-6 md:py-8">
      <Breadcrumb items={[{ name: page.heading || page.title, href: `/legal/${slug}` }]} />

      <article className="mx-auto mt-4 max-w-3xl">
        <h1 className="text-2xl font-semibold text-ink-900 md:text-[30px]">
          {page.heading || page.title}
        </h1>

        <div className="df-prose mt-6">
          {page.sections.map((s, i) => (
            <section key={`${s.title}-${i}`}>
              {i > 0 || s.title !== (page.heading || page.title) ? <h2>{s.title}</h2> : null}
              {s.paragraphs.map((p, pi) => (
                <p key={pi}>{p}</p>
              ))}
              {s.bullets.length ? (
                <ul>
                  {s.bullets.map((b, bi) => (
                    <li key={bi}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
