import Link from 'next/link';
import { Download, Check, Minus, Phone, Mail } from 'lucide-react';
import { listBrochures } from '@/lib/sql/admin-catalog';
import { listQuotations } from '@/lib/sql/admin';
import HandledToggle from '@/components/admin/HandledToggle';
import SafeImage from '@/components/common/SafeImage';
import Pagination, { paginate } from '@/components/admin/Pagination';
import { formatPrice, formatDate, cx } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Brochures' };

const TABS = [
  { id: 'requests', label: 'Requests' },
  { id: 'products', label: 'Products' },
];

export default async function AdminBrochuresPage({ searchParams }) {
  const params = await searchParams;
  const tab = TABS.some((t) => t.id === params?.tab) ? params.tab : 'requests';
  const search = String(params?.q || '').trim();
  const page = Number(params?.page) || 1;

  const [requests, products] = await Promise.all([
    tab === 'requests' ? listQuotations({ limit: 300 }) : [],
    tab === 'products' ? listBrochures({ search }) : [],
  ]);

  return (
    <>
      <h1 className="text-[22px] font-semibold text-ink-900">Brochures</h1>
      <p className="mt-1 max-w-2xl text-[14px] text-ink-400">
        Customers fill in a short form before the PDF is handed over — those details land
        here. The PDF itself is built from the product, so there is nothing to upload.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/brochures?tab=${t.id}`}
            className={cx(
              'rounded-lg border px-3.5 py-1.5 text-[13.5px] transition-colors',
              tab === t.id
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'requests'
        ? <Requests rows={requests || []} page={page} />
        : <Products rows={products || []} search={search} page={page} />}
    </>
  );
}

/* ------------------------------------------------- who asked for a brochure */

function Requests({ rows, page }) {
  const open = rows.filter((r) => !r.handled).length;

  if (!rows.length) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-white px-6 py-14 text-center text-ink-400">
        Nobody has asked for a brochure yet.
      </div>
    );
  }

  const view = paginate(rows, page);

  return (
    <>
      <p className="mt-4 text-[14px] text-ink-500">
        <span className="font-semibold text-ink-900">{rows.length}</span> requests
        {open ? <> · <span className="font-semibold text-ink-900">{open}</span> still to follow up</> : null}
      </p>

      <ul className="mt-3 space-y-3">
        {view.rows.map((r) => (
          <li
            key={r.id}
            className={cx('rounded-xl border bg-white p-4 md:p-5', r.handled ? 'border-line opacity-70' : 'border-line')}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-ink-900">{r.name || '—'}</p>

                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px]">
                  {r.mobile ? (
                    <a href={`tel:${r.mobile}`} className="inline-flex items-center gap-1.5 text-primary-700 hover:text-primary-800">
                      <Phone size={13} aria-hidden="true" />
                      {r.mobile}
                    </a>
                  ) : null}
                  {r.email ? (
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 text-ink-500 hover:text-primary-800">
                      <Mail size={13} aria-hidden="true" />
                      {r.email}
                    </a>
                  ) : null}
                  <span className="text-ink-400">{formatDate(r.at)}</span>
                </div>
              </div>

              <HandledToggle kind="quotation" id={r.id} handled={r.handled} />
            </div>

            <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[14px]">
              <span className="text-ink-400">Brochure downloaded:</span>
              {r.productUrl ? (
                <Link href={r.productUrl} target="_blank" className="font-medium text-primary-700 hover:text-primary-800">
                  {r.productName}
                </Link>
              ) : (
                <span className="text-ink-700">{r.productName}</span>
              )}
              <a
                href={`/api/brochure/${r.productId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1 text-[12.5px] text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800"
              >
                <Download size={12} aria-hidden="true" />
                Same PDF they got
              </a>
            </p>
          </li>
        ))}
      </ul>

      <Pagination {...view} params={{ tab: 'requests' }} label="requests" />
    </>
  );
}

/* --------------------------------------------- what each brochure will show */

function Products({ rows, search, page }) {
  const thin = rows.filter((r) => !r.specCount && !r.hasDescription).length;
  const downloads = rows.reduce((n, r) => n + r.downloads, 0);
  const view = paginate(rows, page);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Stat label="Products" value={rows.length} />
        <Stat label="Downloads" value={downloads} />
        <Stat label="Thin" value={thin} warn={thin > 0} />

        <form className="ml-auto">
          <input
            type="hidden"
            name="tab"
            value="products"
          />
          <input
            name="q"
            defaultValue={search}
            placeholder="Name, slug or id"
            aria-label="Search products"
            className="h-10 w-full min-w-[220px] rounded-lg border border-line-strong bg-white px-3.5 text-[14px] outline-none focus:border-primary-500"
          />
        </form>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[760px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-line text-left text-[12.5px] uppercase tracking-wide text-ink-400">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">What the PDF will show</th>
              <th className="px-4 py-3 font-medium text-right">Downloads</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                      <SafeImage src={r.image} fill sizes="44px" className="object-contain p-1" iconSize={16} />
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${r.id}`}
                        className="line-clamp-1 font-medium text-primary-700 hover:text-primary-800"
                      >
                        {r.name}
                      </Link>
                      <p className="text-[12.5px] text-ink-400">
                        #{r.id} · {r.price ? formatPrice(r.price) : 'On request'}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Part on={r.hasPhoto} label="Photo" />
                    <Part on={r.hasDescription} label="Description" />
                    <Part on={r.specCount > 0} label={r.specCount ? `${r.specCount} specs` : 'Specifications'} />
                    <Part on={r.faqCount > 0} label={r.faqCount ? `${r.faqCount} FAQs` : 'FAQs'} />
                  </div>
                </td>

                <td className="px-4 py-3 text-right tabular-nums text-ink-700">{r.downloads}</td>

                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <a
                      href={`/api/brochure/${r.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1.5 text-[13px] text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800"
                    >
                      <Download size={13} aria-hidden="true" />
                      PDF
                    </a>
                    <Link
                      href={`/admin/products/${r.id}`}
                      className="rounded-lg border border-line-strong px-2.5 py-1.5 text-[13px] text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800"
                    >
                      Fill in
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!rows.length ? (
          <p className="px-4 py-14 text-center text-ink-400">No products match that search.</p>
        ) : null}
      </div>

      <Pagination {...view} params={{ tab: 'products', q: search }} label="products" />
    </>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className={cx('rounded-lg border px-3.5 py-2', warn ? 'border-warning/40 bg-warning/5' : 'border-line bg-white')}>
      <p className="text-[18px] font-semibold text-ink-900">{value}</p>
      <p className="text-[12px] text-ink-400">{label}</p>
    </div>
  );
}

/** A piece of the brochure: filled in, or still missing. */
function Part({ on, label }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12.5px]',
        on ? 'bg-success/10 text-success' : 'bg-surface-muted text-ink-300',
      )}
    >
      {on
        ? <Check size={11} strokeWidth={3} aria-hidden="true" />
        : <Minus size={11} strokeWidth={3} aria-hidden="true" />}
      {label}
    </span>
  );
}
