import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/common/Breadcrumb';
import { getLegalPage, getLegalSlugs } from '@/lib/catalog';
import { metaFor } from '@/lib/utils';

/**
 * Policy documents. The admin panel stores each one as a `general_settings`
 * row keyed by its slug, which is also the URL it is served at.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getLegalSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await getLegalPage(slug);
  if (!page) return {};

  return metaFor({
    title: page.title || page.heading,
    description: page.sections?.[0]?.paragraphs?.[0]?.slice(0, 160) || page.title,
    path: `/legal/${slug}`,
  });
}

export default async function LegalPage({ params }) {
  const { slug } = await params;
  const page = await getLegalPage(slug);
  if (!page) notFound();

  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: page.heading || page.title, href: `/legal/${slug}` }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">
            {page.heading || page.title}
          </h1>

          {/* Settings rows hold the document as edited HTML; the extracted
              fallback is already split into sections. */}
          {page.html ? (
            <div className="df-prose mt-6" dangerouslySetInnerHTML={{ __html: page.html }} />
          ) : (
            <div className="df-prose mt-6">
              {(page.sections || []).map((s, i) => (
                <section key={`${s.title}-${i}`}>
                  {i > 0 || s.title !== (page.heading || page.title) ? <h2>{s.title}</h2> : null}
                  {s.paragraphs.map((p, pi) => <p key={pi}>{p}</p>)}
                  {s.bullets.length ? (
                    <ul>{s.bullets.map((b, bi) => <li key={bi}>{b}</li>)}</ul>
                  ) : null}
                </section>
              ))}
            </div>
          )}
        </article>
      </div>
    </>
  );
}
