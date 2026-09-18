import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getLandingPageForEdit, landingFamilies } from '@/lib/sql/admin-landing';
import { listProducts } from '@/lib/sql/admin-catalog';
import LandingPageEditor from '@/components/admin/LandingPageEditor';
import DeleteCategory from '@/components/admin/DeleteCategory';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit service page' };

export default async function AdminServicePageEdit({ params }) {
  const { id } = await params;
  const [page, families, products] = await Promise.all([
    getLandingPageForEdit(Number(id)),
    landingFamilies(),
    listProducts({ limit: 500 }),
  ]);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/service-pages" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary-700 hover:text-primary-800">
        <ArrowLeft size={15} aria-hidden="true" />
        All service pages
      </Link>

      <div className="mt-3 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-primary-700">{page.type || 'Service page'}</p>
          <h1 className="text-[22px] font-semibold leading-tight text-ink-900">{page.name || page.slug}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13.5px] text-ink-400">
            <span className="break-all">{`/${page.slug}`}</span>
            {page.updatedAt ? <span>{`Updated ${formatDate(page.updatedAt)}`}</span> : null}
          </p>
        </div>
        <a
          href={`/${page.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong px-4 text-[14px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-700"
        >
          View on site
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      <LandingPageEditor
        page={page}
        families={families}
        products={(products || []).map((p) => ({ id: p.id, name: p.name, image: p.image }))}
      />

      <DeleteCategory
        kind="page"
        endpoint="/api/admin/service-pages"
        id={page.id}
        name={page.name || page.slug}
        path={`/${page.slug}`}
        redirectDefault="/"
        afterHref="/admin/service-pages"
      />
    </div>
  );
}
