import Link from 'next/link';
import { Inbox, Clock, CircleCheck, CalendarDays } from 'lucide-react';
import { listLeads, listCallbacks, listMessages } from '@/lib/sql/admin';
import HandledToggle from '@/components/admin/HandledToggle';
import Pagination, { paginate } from '@/components/admin/Pagination';
import StatCards from '@/components/admin/StatCards';
import ListTools from '@/components/admin/ListTools';
import { formatDate, cx } from '@/lib/utils';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Enquiries' };

const TABS = [
  { id: 'leads', label: 'Service enquiries' },
  { id: 'callbacks', label: 'Callback requests' },
];

export default async function AdminEnquiriesPage({ searchParams }) {
  await requirePage('enquiries');
  const params = await searchParams;
  const tab = TABS.some((t) => t.id === params?.tab) ? params.tab : 'leads';
  const page = Number(params?.page) || 1;

  const [leads, callbacks, messages] = await Promise.all([
    tab === 'leads' ? listLeads({ limit: 200 }) : [],
    tab === 'callbacks' ? listCallbacks({ limit: 200 }) : [],
    tab === 'messages' ? listMessages({ limit: 200 }) : [],
  ]);

  const all = { leads, callbacks, messages }[tab] || [];

  // Open or done, on top of which kind of enquiry is being read.
  const show = ['open', 'done'].includes(params?.show) ? params.show : '';
  const filtered = all.filter((r) => (show === 'open' ? !r.handled : show === 'done' ? r.handled : true));
  const view = paginate(filtered, page);
  const rows = view.rows;

  const weekAgo = Date.now() - 7 * 86400 * 1000;
  const open = all.filter((r) => !r.handled).length;
  const fresh = all.filter((r) => Date.parse(r.at || 0) >= weekAgo).length;

  const link = (patch) => {
    const p = new URLSearchParams();
    Object.entries({ tab, show, ...patch }).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString() ? `/admin/enquiries?${p}` : '/admin/enquiries';
  };

  const noun = tab === 'callbacks' ? 'Callbacks' : 'Enquiries';
  const cards = [
    {
      id: 'total', label: `Total ${noun}`, value: all.length, icon: Inbox, tone: 'primary',
      href: link({ show: '', page: '' }), active: !show,
    },
    {
      id: 'open', label: 'Open', value: open, note: 'nobody has closed these', icon: Clock, tone: 'amber',
      href: link({ show: 'open', page: '' }), active: show === 'open',
    },
    {
      id: 'done', label: 'Done', value: all.length - open, icon: CircleCheck, tone: 'green',
      href: link({ show: 'done', page: '' }), active: show === 'done',
    },
    {
      id: 'fresh', label: 'This week', value: fresh, note: 'came in over 7 days', icon: CalendarDays, tone: 'blue',
    },
  ];

  const exportColumns = tab === 'callbacks'
    ? [
      { label: 'Name', key: 'name' }, { label: 'Mobile', key: 'mobile' },
      { label: 'Preferred time', key: 'timing' }, { label: 'Status', key: 'state' },
      { label: 'Received', key: 'on' },
    ]
    : [
      { label: 'Name', key: 'name' }, { label: 'Mobile', key: 'mobile' }, { label: 'Email', key: 'email' },
      { label: 'Service', key: 'service' }, { label: 'Location', key: 'place' }, { label: 'Units', key: 'unit' },
      { label: 'Preferred date', key: 'bookDate' }, { label: 'Address', key: 'address' },
      { label: 'Status', key: 'state' }, { label: 'Received', key: 'on' },
    ];
  const exportRows = filtered.map((r) => ({
    ...r, state: r.handled ? 'Done' : 'Open', on: r.at ? formatDate(r.at) : '',
  }));

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

      <StatCards cards={cards} className="mt-4" />

      {/* Open or done, and the list as a spreadsheet. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-2.5">
        <nav className="flex flex-wrap gap-1" aria-label="Filter enquiries">
          {[
            { id: '', label: 'All', count: all.length },
            { id: 'open', label: 'Open', count: open },
            { id: 'done', label: 'Done', count: all.length - open },
          ].map((t) => (
            <Link
              key={t.id || 'all'}
              href={link({ show: t.id, page: '' })}
              aria-current={show === t.id ? 'page' : undefined}
              className={cx(
                'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
                show === t.id ? 'bg-primary-500 text-white' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
              )}
            >
              {t.label}
              <span className={cx('rounded-full px-1.5 text-[11.5px] tabular-nums', show === t.id ? 'bg-white/20' : 'bg-surface-muted text-ink-400')}>
                {t.count}
              </span>
            </Link>
          ))}
        </nav>
        <span className="ml-auto">
          <ListTools rows={exportRows} columns={exportColumns} filename={tab} />
        </span>
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

      <Pagination {...view} params={{ tab, show }} label="enquiries" />
    </>
  );
}
