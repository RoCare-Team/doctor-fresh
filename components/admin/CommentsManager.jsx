'use client';

import { useMemo, useState } from 'react';
import {
  Search, X, Eye, EyeOff, Trash2, Reply, ExternalLink, MessagesSquare, CornerDownRight, Loader2, Send,
  Newspaper, Wrench,
} from 'lucide-react';
import { useCan } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

const PER_PAGE = 30;

const when = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—');

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'visible', label: 'Shown on site' },
  { id: 'hidden', label: 'Hidden' },
];
const PAGE_TABS = [
  { id: '', label: 'All pages' },
  { id: 'service', label: 'Service pages' },
  { id: 'blog', label: 'Blogs' },
];

function IconButton({
  icon: Icon, label, onClick, tone = 'plain', disabled,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cx(
        'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[12px] font-medium transition-colors disabled:opacity-50',
        tone === 'danger' ? 'border-danger/30 text-danger hover:bg-danger/5'
          : tone === 'primary' ? 'border-primary-300 text-primary-800 hover:bg-primary-50'
            : 'border-line-strong text-ink-700 hover:border-primary-300',
      )}
    >
      <Icon size={13} aria-hidden="true" />
      {label}
    </button>
  );
}

export default function CommentsManager({ comments: initial, adminName }) {
  const allow = useCan();
  const [comments, setComments] = useState(initial);
  const [status, setStatus] = useState('all');
  const [pageKind, setPageKind] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [notice, setNotice] = useState(null);

  const counts = useMemo(() => ({
    all: comments.length,
    visible: comments.filter((c) => c.visible).length,
    hidden: comments.filter((c) => !c.visible).length,
  }), [comments]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return comments
      .filter((c) => status === 'all' || (status === 'visible' ? c.visible : !c.visible))
      .filter((c) => !pageKind || c.kind === pageKind)
      .filter((c) => !term || [c.name, c.email, c.body, c.path, ...c.replies.map((r) => `${r.name} ${r.body}`)]
        .join(' ').toLowerCase().includes(term));
  }, [comments, status, pageKind, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const say = (ok, text) => setNotice({ ok, text });

  async function call(key, url, init) {
    setBusy(key);
    const res = await fetch(url, init).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy('');
    if (!res?.ok || !data?.ok) { say(false, data?.error || 'Could not save the change.'); return null; }
    return data;
  }

  /** Applies a change to one comment (or one of its replies) in the list. */
  const patchComment = (id, fn) => setComments((list) => list.map((c) => (c.id === id ? fn(c) : c)));

  async function toggle(kind, item, parentId) {
    const next = !item.visible;
    const ok = await call(`${kind}-${item.id}`, '/api/admin/comments', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id: item.id, visible: next }),
    });
    if (!ok) return;
    if (kind === 'comment') patchComment(item.id, (c) => ({ ...c, visible: next }));
    else patchComment(parentId, (c) => ({ ...c, replies: c.replies.map((r) => (r.id === item.id ? { ...r, visible: next } : r)) }));
    say(true, next ? 'Shown on the site again.' : 'Hidden from the site.');
  }

  async function remove(kind, item, parentId) {
    const what = kind === 'comment' ? `this comment${item.replies?.length ? ` and its ${item.replies.length} repl${item.replies.length === 1 ? 'y' : 'ies'}` : ''}` : 'this reply';
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${what} for good? To keep it but take it off the site, use Hide instead.`)) return;
    const ok = await call(`${kind}-${item.id}`, `/api/admin/comments?kind=${kind}&id=${item.id}`, { method: 'DELETE' });
    if (!ok) return;
    if (kind === 'comment') setComments((list) => list.filter((c) => c.id !== item.id));
    else patchComment(parentId, (c) => ({ ...c, replies: c.replies.filter((r) => r.id !== item.id) }));
    say(true, 'Deleted.');
  }

  async function reply(event, comment) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const data = await call(`reply-${comment.id}`, '/api/admin/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commentId: comment.id, ...values }),
    });
    if (!data) return;
    patchComment(comment.id, (c) => ({
      ...c,
      replies: [...c.replies, {
        id: data.id, name: values.name || 'Doctor Fresh Team', email: '', body: values.reply, visible: true, at: Date.now(),
      }],
    }));
    setReplyTo(null);
    say(true, 'Reply posted — it shows on the page now.');
  }

  const canEdit = allow('comments', 'edit');
  const canDelete = allow('comments', 'delete');
  const canReply = allow('comments', 'create');

  const tab = (active) => cx(
    'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
    active ? 'bg-white text-ink-900 shadow-sm ring-1 ring-line' : 'text-ink-500 hover:text-ink-900',
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white">
        <div className="px-4 pb-2.5 pt-3.5 md:px-5">
          <h1 className="text-[19px] font-bold leading-tight text-ink-900">Comments</h1>
          <p className="text-[12.5px] text-ink-400">
            What visitors write in each service page&apos;s Community Chat and under blog posts. Hide spam, delete it, or reply as the team.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 md:px-5">
          <nav className="flex flex-wrap gap-0.5 rounded-lg bg-surface-muted p-0.5" aria-label="Status">
            {STATUS_TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => { setStatus(t.id); setPage(1); }} className={tab(status === t.id)}>
                {t.label}
                <span className={cx('text-[11.5px] tabular-nums', status === t.id ? 'text-primary-700' : 'text-ink-300')}>{counts[t.id]}</span>
              </button>
            ))}
          </nav>
          <nav className="flex flex-wrap gap-1" aria-label="Page type">
            {PAGE_TABS.map((t) => (
              <button
                key={t.id || 'all'}
                type="button"
                onClick={() => { setPageKind(t.id); setPage(1); }}
                className={cx('inline-flex h-8 items-center rounded-lg border px-2.5 text-[12.5px] font-medium', pageKind === t.id ? 'border-primary-600 bg-primary-600 text-white' : 'border-line-strong text-ink-700 hover:border-primary-300')}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="border-t border-line px-4 py-2.5 md:px-5">
          <span className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search name, email, comment text or page…"
              aria-label="Search comments"
              className="h-9 w-full rounded-lg border border-line-strong pl-9 pr-8 text-[13.5px] outline-none focus:border-primary-500"
            />
            {q ? <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-300 hover:text-ink-700"><X size={14} aria-hidden="true" /></button> : null}
          </span>
          <p className="mt-2 text-[12.5px] text-ink-500">
            Showing <b className="font-semibold text-ink-900">{shown.length}</b> of <b className="font-semibold text-ink-900">{filtered.length}</b> comments
          </p>
          {notice ? (
            <p role="status" className={cx('mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px]', notice.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
              {notice.text}
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="ml-auto"><X size={14} aria-hidden="true" /></button>
            </p>
          ) : null}
        </div>
      </div>

      {/* ----------------------------------------------------------- list */}
      <ul className="space-y-3">
        {shown.map((c) => (
          <li key={c.id} className={cx('rounded-2xl border bg-white p-4 md:p-5', c.visible ? 'border-line' : 'border-warning/40 bg-warning/5')}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[13px] font-semibold text-primary-700" aria-hidden="true">
                  {(c.name.trim()[0] || '?').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold text-ink-900">
                    {c.name || 'Anonymous'}
                    {!c.visible ? <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-[10.5px] font-bold uppercase text-warning">Hidden</span> : null}
                  </p>
                  <p className="text-[12px] text-ink-400">{c.email || 'no email'} · {when(c.at)}</p>
                </div>
              </div>
              <a
                href={c.path}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface-muted/60 px-2 py-1 text-[12px] text-ink-700 hover:border-primary-300 hover:text-primary-800"
              >
                {c.kind === 'blog' ? <Newspaper size={12} aria-hidden="true" /> : <Wrench size={12} aria-hidden="true" />}
                <span className="truncate">{c.path}</span>
                <ExternalLink size={11} className="shrink-0" aria-hidden="true" />
              </a>
            </div>

            <p className="mt-2.5 whitespace-pre-line break-words text-[14px] leading-relaxed text-ink-700">{c.body}</p>

            {c.replies.length ? (
              <ul className="mt-3 space-y-2 rounded-xl bg-surface-muted/70 p-3">
                {c.replies.map((r) => (
                  <li key={r.id} className={cx('flex flex-wrap items-start justify-between gap-2', !r.visible && 'opacity-60')}>
                    <div className="flex min-w-0 flex-1 gap-2">
                      <CornerDownRight size={14} className="mt-0.5 shrink-0 text-ink-300" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[13px]">
                          <span className="font-semibold text-ink-900">{r.name || 'Anonymous'}</span>
                          <span className="ml-2 text-[11.5px] text-ink-400">{when(r.at)}</span>
                          {!r.visible ? <span className="ml-2 rounded bg-warning/15 px-1.5 text-[10px] font-bold uppercase text-warning">Hidden</span> : null}
                        </p>
                        <p className="whitespace-pre-line break-words text-[13.5px] text-ink-700">{r.body}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {canEdit ? <IconButton icon={r.visible ? EyeOff : Eye} label={r.visible ? 'Hide' : 'Show'} onClick={() => toggle('reply', r, c.id)} disabled={Boolean(busy)} /> : null}
                      {canDelete ? <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => remove('reply', r, c.id)} disabled={Boolean(busy)} /> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {replyTo === c.id ? (
              <form onSubmit={(e) => reply(e, c)} className="mt-3 grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[200px_1fr]">
                <input name="name" defaultValue="Doctor Fresh Team" maxLength={80} aria-label="Reply as" className="h-9 rounded-lg border border-line-strong px-2.5 text-[13px] outline-none focus:border-primary-500" />
                <textarea name="reply" required minLength={2} rows={2} placeholder="Write the team's reply…" aria-label="Reply" className="rounded-lg border border-line-strong px-2.5 py-1.5 text-[13.5px] outline-none focus:border-primary-500" />
                <div className="flex gap-2 sm:col-span-2">
                  <button type="submit" disabled={Boolean(busy)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary-600 px-3 text-[13px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                    {busy === `reply-${c.id}` ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Send size={13} aria-hidden="true" />}
                    Post reply
                  </button>
                  <button type="button" onClick={() => setReplyTo(null)} className="h-8 rounded-lg px-3 text-[13px] text-ink-500 hover:bg-surface-muted">Cancel</button>
                </div>
              </form>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {canReply && replyTo !== c.id ? <IconButton icon={Reply} label="Reply" tone="primary" onClick={() => setReplyTo(c.id)} /> : null}
              {canEdit ? <IconButton icon={c.visible ? EyeOff : Eye} label={c.visible ? 'Hide' : 'Show'} onClick={() => toggle('comment', c)} disabled={Boolean(busy)} /> : null}
              {canDelete ? <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => remove('comment', c)} disabled={Boolean(busy)} /> : null}
            </div>
          </li>
        ))}
      </ul>

      {!shown.length ? (
        <div className="rounded-2xl border border-line bg-white px-4 py-14 text-center text-ink-400">
          <MessagesSquare size={28} className="mx-auto text-ink-300" aria-hidden="true" />
          <p className="mt-2 font-medium text-ink-700">No comments here</p>
          <p className="text-[13px]">Try another tab or search.</p>
        </div>
      ) : null}

      {pages > 1 ? (
        <div className="flex items-center justify-center gap-2 text-[13px]">
          <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="h-8 rounded-lg border border-line-strong px-3 disabled:opacity-40">Previous</button>
          <span className="text-ink-500">Page {current} of {pages}</span>
          <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="h-8 rounded-lg border border-line-strong px-3 disabled:opacity-40">Next</button>
        </div>
      ) : null}
    </div>
  );
}
