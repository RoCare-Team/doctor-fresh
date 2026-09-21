'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Plus, X, Reply, CornerDownRight, MessagesSquare, Loader2, Send,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

/**
 * "Community Chat" on a service page: visitors' questions and experiences,
 * with replies. Stored in the site's own `comment` / `comment_reply` tables
 * against the page's address — the same rows the PHP site shows — through
 * /api/comments, which the blog comments use too.
 */

const initial = (name) => (String(name || '?').trim()[0] || '?').toUpperCase();

function Avatar({ name, small }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-700 ${small ? 'h-7 w-7 text-[11.5px]' : 'h-9 w-9 text-[13px]'}`}
      aria-hidden="true"
    >
      {initial(name)}
    </span>
  );
}

const field = 'h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] outline-none transition-colors focus:border-primary-500';

/** Name, email and the text — for a new comment or a reply. */
function PostForm({
  kind, onSubmit, onCancel, busy,
}) {
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const problem = await onSubmit(values);
    if (problem) setError(problem);
    else { setError(''); form.reset(); }
  }

  return (
    <form onSubmit={submit} className="grid gap-2.5 sm:grid-cols-2">
      <input name="name" required maxLength={80} placeholder="Your name" aria-label="Your name" autoComplete="name" className={field} />
      <input name="email" type="email" required maxLength={120} placeholder="Your email (not shown)" aria-label="Your email" autoComplete="email" className={field} />
      <textarea
        name={kind === 'reply' ? 'reply' : 'comment'}
        required
        minLength={3}
        maxLength={3000}
        rows={kind === 'reply' ? 2 : 3}
        placeholder={kind === 'reply' ? 'Write a reply…' : 'Ask a question or share your experience…'}
        aria-label={kind === 'reply' ? 'Reply' : 'Comment'}
        className="w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[14px] outline-none transition-colors focus:border-primary-500 sm:col-span-2"
      />
      {error ? <p role="alert" className="text-[13px] text-danger sm:col-span-2">{error}</p> : null}
      <div className="flex items-center gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
          {kind === 'reply' ? 'Post reply' : 'Post comment'}
        </button>
        <button type="button" onClick={onCancel} className="h-9 rounded-lg px-3 text-[13.5px] font-medium text-ink-500 hover:bg-surface-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function CommunityChat({ path }) {
  const [comments, setComments] = useState(null); // null while loading
  const [replyTo, setReplyTo] = useState(null);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState('');
  const list = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/comments?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setComments(d.comments || []); })
      .catch(() => { if (!cancelled) setComments([]); });
    return () => { cancelled = true; };
  }, [path]);

  /** Returns an error message, or nothing when it was posted. */
  async function post(values, commentId = null) {
    setBusy(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, path, commentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) return data.error || 'Could not post. Please try again.';
      setComments(data.comments || []);
      setReplyTo(null);
      setComposing(false);
      setThanks(commentId ? 'Your reply has been posted.' : 'Thank you — your comment has been posted.');
      if (!commentId) list.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return '';
    } catch {
      return 'Could not post. Please check your connection.';
    } finally {
      setBusy(false);
    }
  }

  const count = comments?.length || 0;

  return (
    <section className="mt-12 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_30px_-24px_rgb(6_59_76/0.5)]" aria-labelledby="community-chat">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id="community-chat" className="flex items-center gap-2 text-[18px] font-semibold text-ink-900">
            <MessagesSquare size={19} className="text-primary-700" aria-hidden="true" />
            Community Chat
            {count ? <span className="rounded-full bg-surface-muted px-2 text-[12px] font-medium tabular-nums text-ink-500">{count}</span> : null}
          </h2>
          <p className="mt-0.5 text-[13.5px] text-ink-400">Ask questions and join the discussion</p>
        </div>
      </header>

      <div ref={list} className="max-h-[440px] overflow-y-auto px-5">
        {comments === null ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[14px] text-ink-400">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Loading the discussion…
          </div>
        ) : null}

        {comments?.length === 0 ? (
          <div className="py-10 text-center">
            <MessagesSquare size={28} className="mx-auto text-ink-300" aria-hidden="true" />
            <p className="mt-2 text-[14.5px] font-medium text-ink-700">No comments yet</p>
            <p className="text-[13.5px] text-ink-400">Be the first to ask a question or share your experience.</p>
          </div>
        ) : null}

        {comments?.length ? (
          <ul className="divide-y divide-line">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3 py-4">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-[14.5px] font-semibold text-ink-900">{c.name}</span>
                    <span className="text-[12px] text-ink-400">{formatDate(c.at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-relaxed text-ink-500">{c.body}</p>

                  {c.replies.length ? (
                    <ul className="mt-3 space-y-3 rounded-xl bg-surface-muted/70 p-3">
                      {c.replies.map((r) => (
                        <li key={r.id} className="flex gap-2.5">
                          <CornerDownRight size={14} className="mt-2 shrink-0 text-ink-300" aria-hidden="true" />
                          <Avatar name={r.name} small />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                              <span className="text-[13.5px] font-semibold text-ink-900">{r.name}</span>
                              <span className="text-[11.5px] text-ink-400">{formatDate(r.at)}</span>
                            </div>
                            <p className="mt-0.5 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-ink-500">{r.body}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {replyTo === c.id ? (
                    <div className="mt-3 rounded-xl border border-line p-3">
                      <PostForm kind="reply" busy={busy} onSubmit={(v) => post(v, c.id)} onCancel={() => setReplyTo(null)} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setReplyTo(c.id); setThanks(''); }}
                      className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-primary-700 transition-colors hover:text-primary-800"
                    >
                      <Reply size={14} aria-hidden="true" />
                      Reply
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* ------------------------------------------------------ post a comment */}
      <div className="border-t border-line bg-surface-muted/60 px-5 py-3">
        {composing ? (
          <div className="py-1">
            <p className="mb-2.5 text-[14px] font-semibold text-ink-900">Post a comment</p>
            <PostForm kind="comment" busy={busy} onSubmit={(v) => post(v)} onCancel={() => setComposing(false)} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setComposing(true); setThanks(''); }}
            className="group flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="text-[16px] font-medium text-ink-700">Post a comment</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition-transform group-hover:scale-105">
              <Plus size={18} aria-hidden="true" />
            </span>
          </button>
        )}
        {thanks ? (
          <p role="status" className="mt-2 flex items-center justify-between gap-2 text-[13px] text-success">
            {thanks}
            <button type="button" onClick={() => setThanks('')} aria-label="Dismiss" className="text-ink-300 hover:text-ink-700"><X size={13} aria-hidden="true" /></button>
          </p>
        ) : null}
      </div>
    </section>
  );
}
