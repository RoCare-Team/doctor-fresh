import Link from 'next/link';
import {
  Mail, Phone, MessageCircle, Inbox, MailOpen, Search, MessageSquare, Clock, CircleCheck,
} from 'lucide-react';
import DeleteMessageButton from '@/components/admin/DeleteMessageButton';
import MessageTools, { MessageStatus } from '@/components/admin/MessageTools';
import Pagination, { paginate } from '@/components/admin/Pagination';
import { MESSAGE_STATUSES } from '@/lib/admin/message-status';
import { cx, formatDateTime } from '@/lib/utils';

const initials = (name = '') => String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const STAT_LOOK = {
  total: { icon: MessageSquare, tone: 'bg-primary-50 text-primary-700', value: 'text-ink-900' },
  new: { icon: Clock, tone: 'bg-primary-50 text-primary-700', value: 'text-primary-700' },
  in_progress: { icon: Clock, tone: 'bg-warning/10 text-warning', value: 'text-warning' },
  resolved: { icon: CircleCheck, tone: 'bg-success/10 text-success', value: 'text-success' },
};

/**
 * A mailbox of `contact_message` rows — the contact form or the partner form.
 *
 * The counts at the top are the whole mailbox; the filter and the search below
 * them narrow what is listed, and both live in the address so a filtered view
 * can be sent to somebody.
 */
export default function MessageInbox({
  basePath, title, intro, messages = [], params = {}, emptyText,
}) {
  const ids = new Set(MESSAGE_STATUSES.map((s) => s.id));
  const show = ids.has(params.show) ? params.show : '';
  const q = String(params.q || '').trim().toLowerCase();

  const count = (id) => messages.filter((m) => m.status === id).length;
  const unread = messages.filter((m) => m.status !== 'resolved').length;

  const filtered = messages
    .filter((m) => (show ? m.status === show : true))
    .filter((m) => !q || [m.name, m.email, m.mobile, m.subject, m.message, ...m.fields.map((f) => f[1])]
      .join(' ').toLowerCase().includes(q));
  const view = paginate(filtered, Number(params.page) || 1);

  const stats = [
    { id: 'total', label: 'Total Messages', value: messages.length, href: basePath },
    ...MESSAGE_STATUSES.map((s) => ({
      id: s.id, label: s.label, value: count(s.id), href: `${basePath}?show=${s.id}`,
    })),
  ];

  const tabs = [
    { id: '', label: 'All', count: messages.length },
    ...MESSAGE_STATUSES.map((s) => ({ id: s.id, label: s.label, count: count(s.id) })),
  ];
  const link = (patch) => {
    const p = new URLSearchParams();
    Object.entries({ show, q: params.q || '', ...patch }).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString() ? `${basePath}?${p}` : basePath;
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">{title}</h1>
          <p className="mt-0.5 max-w-2xl text-[13.5px] text-ink-400">{intro}</p>
        </div>
        {unread ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-3 py-1 text-[13px] font-semibold text-white">
            <Mail size={14} aria-hidden="true" />
            {`${unread} unread`}
          </span>
        ) : null}
      </div>

      {/* The state of the mailbox at a glance; each card opens that filter. */}
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => {
          const look = STAT_LOOK[s.id];
          const Icon = look.icon;
          return (
            <Link
              key={s.id}
              href={s.href}
              className={cx(
                'flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 transition-colors',
                (s.id === 'total' ? !show : show === s.id) ? 'border-primary-400' : 'border-line hover:border-primary-200',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink-500">{s.label}</span>
                <span className={cx('mt-1 block text-[26px] font-bold leading-none tabular-nums', look.value)}>{s.value}</span>
              </span>
              <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', look.tone)}>
                <Icon size={19} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3 sm:px-4">
          <nav className="flex gap-1" aria-label="Filter messages">
            {tabs.map((t) => (
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
                <span className={cx('rounded-full px-1.5 text-[11.5px] tabular-nums', show === t.id ? 'bg-white/20' : 'bg-surface-muted text-ink-400')}>{t.count}</span>
              </Link>
            ))}
          </nav>
          <form action={basePath} className="relative ml-auto w-full sm:w-64">
            {show ? <input type="hidden" name="show" value={show} /> : null}
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <input
              name="q"
              defaultValue={params.q || ''}
              placeholder="Search name, mobile, email…"
              aria-label="Search messages"
              className="h-9 w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 text-[14px] outline-none focus:border-primary-500"
            />
          </form>
          <MessageTools rows={filtered} filename={basePath.split('/').pop()} />
        </div>

        {!view.rows.length ? (
          <div className="px-6 py-16 text-center">
            <Inbox size={30} className="mx-auto text-ink-300" aria-hidden="true" />
            <p className="mt-2 font-medium text-ink-700">{q || show ? 'Nothing matches' : 'No messages yet'}</p>
            <p className="mx-auto mt-0.5 max-w-sm text-[13.5px] text-ink-400">{q || show ? 'Try another filter or search.' : emptyText}</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {view.rows.map((m) => (
              <li key={m.id} className={cx('p-4 md:p-5', m.status === 'new' && 'bg-primary-50/30')}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
                    m.status === 'resolved' ? 'bg-surface-muted text-ink-400' : 'bg-primary-500 text-white',
                  )}
                  >
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold capitalize text-ink-900">{m.name || '—'}</span>
                      {m.subject ? <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[12px] font-medium text-primary-800">{m.subject}</span> : null}
                      {m.status === 'new' ? <span className="h-2 w-2 rounded-full bg-primary-500" aria-label="New" /> : null}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-400">{m.at ? formatDateTime(m.at) : ''}</p>

                    {/* One tap to answer, the way the team actually replies. */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.mobile ? (
                        <>
                          <a href={`tel:${m.mobile}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-2.5 text-[13px] font-medium text-ink-700 hover:border-primary-500 hover:text-primary-700">
                            <Phone size={13} aria-hidden="true" />
                            {m.mobile}
                          </a>
                          <a href={`https://wa.me/91${m.mobile.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-2.5 text-[13px] font-medium text-ink-700 hover:border-success hover:text-success">
                            <MessageCircle size={13} aria-hidden="true" />
                            WhatsApp
                          </a>
                        </>
                      ) : null}
                      {m.email ? (
                        <a href={`mailto:${m.email}`} className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg border border-line-strong bg-white px-2.5 text-[13px] font-medium text-ink-700 hover:border-primary-500 hover:text-primary-700">
                          <Mail size={13} className="shrink-0" aria-hidden="true" />
                          <span className="truncate">{m.email}</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageStatus id={m.id} name={m.name} status={m.status} />
                  </div>
                </div>

                {m.fields.length ? (
                  <dl className="mt-3 grid gap-x-6 gap-y-1.5 rounded-xl border border-line bg-white p-3 text-[13.5px] sm:ml-13 sm:grid-cols-2">
                    {m.fields.map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="shrink-0 text-ink-400">{`${k}:`}</dt>
                        <dd className="min-w-0 text-ink-700">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {m.message ? (
                  <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-muted/60 p-3 text-[14px] leading-relaxed text-ink-700 sm:ml-13">{m.message}</p>
                ) : null}

                <div className="mt-2 flex justify-end">
                  <DeleteMessageButton id={m.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Pagination {...view} params={{ show, q: params.q || '' }} label="messages" />
      <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-400">
        <MailOpen size={13} aria-hidden="true" />
        Saved in the database table contact_message — the same email is also sent to the team as before.
      </p>
    </>
  );
}
