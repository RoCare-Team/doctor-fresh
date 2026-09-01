import Link from 'next/link';
import { listLeads, listCallbacks, listMessages } from '@/lib/sql/admin';
import HandledToggle from '@/components/admin/HandledToggle';
import Pagination, { paginate } from '@/components/admin/Pagination';
import { formatDate, cx } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Enquiries' };

const TABS = [
  { id: 'leads', label: 'Service enquiries' },
  { id: 'callbacks', label: 'Callback requests' },
  { id: 'messages', label: 'Messages' },
];

export default async function AdminEnquiriesPage({ searchParams }) {
  const params = await searchParams;
  const tab = TABS.some((t) => t.id === params?.tab) ? params.tab : 'leads';
  const page = Number(params?.page) || 1;

  const [leads, callbacks, messages] = await Promise.all([
    tab === 'leads' ? listLeads({ limit: 200 }) : [],
    tab === 'callbacks' ? listCallbacks({ limit: 200 }) : [],
    tab === 'messages' ? listMessages({ limit: 200 }) : [],
  ]);

  const view = paginate({ leads, callbacks, messages }[tab], page);
  const rows = view.rows;

  return (
    <>
      <h1 className="text-[22px] font-semibold text-ink-900">Enquiries</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/enquiries?tab=${t.id}`}
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

      {!rows.length ? (
        <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-white px-6 py-14 text-center text-ink-400">
          Nothing here yet.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li
              key={`${tab}-${r.id}`}
              className={cx(
                'rounded-xl border bg-white p-4 md:p-5',
                r.handled ? 'border-line opacity-70' : 'border-line',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink-900">
                    {r.name || '—'}
                    {r.mobile ? (
                      <a href={`tel:${r.mobile}`} className="ml-2 text-[14px] font-normal text-primary-700 hover:text-primary-800">
                        {r.mobile}
                      </a>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-400">
                    {formatDate(r.at)}
                    {r.email ? ` · ${r.email}` : ''}
                  </p>
                </div>

                <HandledToggle kind={tab.replace(/s$/, '')} id={r.id} handled={r.handled} />
              </div>

              {/* Each kind carries its own detail. */}
              {tab === 'leads' ? (
                <dl className="mt-3 grid gap-1.5 border-t border-line pt-3 text-[14px] sm:grid-cols-2">
                  {[
                    ['Service', r.service],
                    ['Location', r.place],
                    ['Units', r.unit],
                    ['Preferred date', r.bookDate],
                    ['Address', r.address],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="shrink-0 text-ink-400">{k}:</dt>
                      <dd className="min-w-0 text-ink-700">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {tab === 'callbacks' && r.timing ? (
                <p className="mt-3 border-t border-line pt-3 text-[14px] text-ink-700">
                  <span className="text-ink-400">Preferred time:</span> {r.timing}
                </p>
              ) : null}

              {tab === 'messages' ? (
                <div className="mt-3 border-t border-line pt-3">
                  {r.subject ? <p className="text-[14px] font-medium text-ink-900">{r.subject}</p> : null}
                  <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-500">{r.message}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Pagination {...view} params={{ tab }} label="enquiries" />
    </>
  );
}
