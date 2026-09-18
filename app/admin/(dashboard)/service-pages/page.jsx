import Link from 'next/link';
import {
  FileText, Globe2, MapPinned, EyeOff, Pencil, ExternalLink,
} from 'lucide-react';
import { landingFamilies, listLandingPages } from '@/lib/sql/admin-landing';
import ServicePageFilters from '@/components/admin/ServicePageFilters';
import NewServicePageButton from '@/components/admin/NewServicePageButton';
import Pagination from '@/components/admin/Pagination';
import { cx, formatDate } from '@/lib/utils';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Service pages' };

export default async function AdminServicePagesPage({ searchParams }) {
  await requirePage('service_pages');
  const params = await searchParams;
  const filters = {
    q: (params?.q || '').trim(),
    type: params?.type || '',
    status: params?.status || '',
  };

  const [families, list] = await Promise.all([
    landingFamilies(),
    listLandingPages({
      search: filters.q, type: filters.type, status: filters.status, page: Number(params?.page) || 1,
    }),
  ]);
  const view = list || {
    rows: [], total: 0, page: 1, pages: 1, from: 0, to: 0,
  };

  const total = families.reduce((n, f) => n + f.pages, 0);
  const national = families.filter((f) => f.pages === 1).length;
  const hidden = families.reduce((n, f) => n + (f.pages - f.live), 0);

  const stats = [
    { label: 'All pages', value: total.toLocaleString('en-IN'), icon: FileText, tone: 'from-primary-400 to-primary-700' },
    { label: 'National pages', value: national, icon: Globe2, tone: 'from-emerald-400 to-emerald-600', href: '?type=__national' },
    { label: 'City & area pages', value: (total - national).toLocaleString('en-IN'), icon: MapPinned, tone: 'from-violet-400 to-violet-600' },
    { label: 'Hidden', value: hidden, icon: EyeOff, tone: 'from-amber-400 to-amber-600', href: '?status=hidden' },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Service pages</h1>
          <p className="mt-0.5 max-w-2xl text-[13.5px] text-ink-400">
            Every service and city page — /water-purifier-service, /water-purifier-amc, /ro-service-mumbai… Edit, create, hide or delete them.
          </p>
        </div>
        <NewServicePageButton families={families} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({
          label, value, icon: Icon, tone, href,
        }) => {
          const body = (
            <>
              <span className={cx('hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-[0_10px_20px_-12px_rgb(6_59_76/0.6)] sm:flex', tone)}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[12.5px] font-medium text-ink-400">{label}</p>
                <p className="text-[22px] font-bold leading-tight tracking-tight text-ink-900">{value}</p>
              </div>
            </>
          );
          const box = 'flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 sm:p-4';
          return href
            ? <Link key={label} href={`/admin/service-pages${href}`} className={cx(box, 'transition-colors hover:border-primary-300')}>{body}</Link>
            : <div key={label} className={box}>{body}</div>;
        })}
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line p-3 sm:px-4">
          <ServicePageFilters families={families} value={filters} />
        </div>

        <ul className="divide-y divide-line">
          {view.rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-primary-50/30">
              <div className="min-w-0 flex-1 basis-72">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/service-pages/${p.id}`} className="truncate text-[15px] font-semibold text-ink-900 hover:text-primary-700">
                    {p.name}
                  </Link>
                  {!p.live ? <span className="shrink-0 rounded-full bg-warning/12 px-2 py-0.5 text-[11.5px] font-semibold text-warning">Hidden</span> : null}
                </div>
                <a
                  href={`/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 text-[13px] text-primary-700 hover:text-primary-800"
                >
                  <span className="truncate">{`/${p.slug}`}</span>
                  <ExternalLink size={12} className="shrink-0" aria-hidden="true" />
                </a>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12.5px] sm:w-72">
                {p.type ? <span className="rounded-full bg-primary-50 px-2.5 py-0.5 font-medium text-primary-800">{p.type}</span> : null}
                {p.place ? <span className="truncate text-ink-400">{p.place}</span> : null}
              </div>
              <span className="hidden w-28 text-[12.5px] text-ink-400 lg:block">{p.updatedAt ? formatDate(p.updatedAt) : ''}</span>
              <Link
                href={`/admin/service-pages/${p.id}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:bg-primary-500 hover:text-white"
              >
                <Pencil size={13} aria-hidden="true" />
                Edit
              </Link>
            </li>
          ))}
          {!view.rows.length ? (
            <li className="px-4 py-14 text-center">
              <FileText size={28} className="mx-auto text-ink-300" aria-hidden="true" />
              <p className="mt-2 font-medium text-ink-700">No pages match</p>
              <p className="text-[13px] text-ink-400">Try another search or service type.</p>
            </li>
          ) : null}
        </ul>
      </section>

      <Pagination {...view} params={filters} label="pages" />
    </>
  );
}
