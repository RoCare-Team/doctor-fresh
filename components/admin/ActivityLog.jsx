'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search, X, History } from 'lucide-react';
import { cx, formatDateTime } from '@/lib/utils';

/**
 * The record of every change made in the admin.
 *
 * Five people share this panel, and until this existed a price that moved or
 * an order that vanished could not be traced to anyone. Each line answers the
 * three questions that get asked: who, what, and when.
 *
 * Nothing here edits anything — the page is a reader, and the log itself is
 * append-only, so a mistake cannot be quietly cleaned up afterwards.
 */

const ACTION_LOOK = {
  created: 'bg-emerald-50 text-emerald-700',
  edited: 'bg-primary-50 text-primary-700',
  deleted: 'bg-danger/10 text-danger',
};

/** "2h ago", because "when" is usually asked as "how long ago". */
function ago(at) {
  if (!at) return '';
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function ActivityLog({
  rows = [], admins = [], sections = [], filters = {},
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(filters.q || '');

  /** Filters live in the address, so a filtered view can be sent to someone. */
  function go(patch) {
    const next = new URLSearchParams(params?.toString() || '');
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, String(v));
      else next.delete(k);
    }
    router.push(`/admin/activity${next.toString() ? `?${next}` : ''}`);
  }

  const label = (id) => sections.find((s) => s.id === id)?.label || id;
  const filtered = Boolean(filters.section || filters.who || filters.q);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Activity log</h1>
          <p className="mt-1 text-[14px] text-ink-400">
            Every change made in the admin — who made it, what changed and when.
          </p>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-[13px] font-medium text-ink-500">
          {rows.length === 300 ? 'Last 300 changes' : `${rows.length} change${rows.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* ------------------------------------------------------------ filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); go({ q }); }}
          className="relative min-w-[220px] flex-1 sm:max-w-sm"
        >
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a product, order or person…"
            aria-label="Search the activity log"
            className="h-9 w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 text-[13.5px] outline-none focus:border-primary-500"
          />
        </form>

        <select
          value={filters.section || ''}
          onChange={(e) => go({ section: e.target.value })}
          aria-label="Section"
          className="h-9 rounded-lg border border-line-strong bg-white px-3 text-[13.5px] text-ink-700 outline-none focus:border-primary-500"
        >
          <option value="">All sections</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <select
          value={filters.who || ''}
          onChange={(e) => go({ who: e.target.value })}
          aria-label="Who"
          className="h-9 rounded-lg border border-line-strong bg-white px-3 text-[13.5px] text-ink-700 outline-none focus:border-primary-500"
        >
          <option value="">Everyone</option>
          {admins.map((a) => <option key={a.id} value={a.id}>{`${a.name} (${a.count})`}</option>)}
        </select>

        {filtered ? (
          <button
            type="button"
            onClick={() => { setQ(''); router.push('/admin/activity'); }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 text-[13.5px] font-medium text-ink-600 transition-colors hover:border-primary-300"
          >
            <X size={14} aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>

      {/* --------------------------------------------------------------- list */}
      {!rows.length ? (
        <div className="mt-4 rounded-2xl border border-line bg-white px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-line text-ink-300">
            <History size={22} aria-hidden="true" />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-ink-900">
            {filtered ? 'Nothing matches those filters' : 'Nothing recorded yet'}
          </p>
          <p className="mt-1 text-[13.5px] text-ink-400">
            {filtered
              ? 'Try another section or clear the filters.'
              : 'The next change anyone saves in the admin will appear here.'}
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-start gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5"
            >
              {/* An initial reads faster down a column than a name does. */}
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[12px] font-semibold text-primary-700">
                {initials(r.adminName)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-snug text-ink-800">
                  <span className="font-semibold text-ink-900">{r.adminName}</span>
                  <span className={cx('mx-1.5 rounded px-1.5 py-0.5 text-[12px] font-semibold', ACTION_LOOK[r.action] || 'bg-surface-muted text-ink-600')}>
                    {r.action}
                  </span>
                  <span className="font-medium text-ink-900">{r.target || label(r.section)}</span>
                  <button
                    type="button"
                    onClick={() => go({ section: r.section })}
                    className="ml-1.5 text-[12.5px] text-ink-400 hover:text-primary-700"
                  >
                    {`in ${label(r.section)}`}
                  </button>
                </p>
                {r.detail ? (
                  <p className="mt-0.5 break-words text-[12.5px] text-ink-500">{r.detail}</p>
                ) : null}
              </div>

              <span className="shrink-0 text-right">
                <span className="block text-[12.5px] font-medium text-ink-600">{ago(r.at)}</span>
                <span className="block text-[11.5px] text-ink-300">{formatDateTime(r.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
