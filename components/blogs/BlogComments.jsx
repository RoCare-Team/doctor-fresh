'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, CornerDownRight } from 'lucide-react';
import { Input, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import { formatDate } from '@/lib/utils';

/**
 * Comments on an article, stored in the site's `comment` and `comment_reply`
 * tables against the article's absolute URL — the same rows the current site
 * shows and the admin panel moderates.
 */
export default function BlogComments({ path }) {
  const [comments, setComments] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/comments?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setComments(d.comments || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path]);

  async function post(event, commentId = null) {
    event.preventDefault();
    setStatus('sending');
    setError('');

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, path, commentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not post your comment.');

      setComments(data.comments || []);
      setStatus('done');
      setReplyTo(null);
      form.reset();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <section className="mt-12 border-t border-line pt-10">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-ink-900 md:text-2xl">
        <MessageCircle size={20} className="text-primary-700" aria-hidden="true" />
        Comments
        {comments.length ? <span className="text-[15px] font-normal text-ink-400">({comments.length})</span> : null}
      </h2>

      {comments.length ? (
        <ul className="mt-6 space-y-5">
          {comments.map((c) => (
            <li key={c.id} className="df-card p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[15px] font-medium text-ink-900">{c.name}</span>
                <span className="text-[13px] text-ink-400">{formatDate(c.at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-500">{c.body}</p>

              {c.replies.length ? (
                <ul className="mt-4 space-y-3 border-l-2 border-line pl-4">
                  {c.replies.map((r) => (
                    <li key={r.id}>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <CornerDownRight size={13} className="text-ink-300" aria-hidden="true" />
                        <span className="text-[14px] font-medium text-ink-900">{r.name}</span>
                        <span className="text-[12.5px] text-ink-400">{formatDate(r.at)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-500">{r.body}</p>
                    </li>
                  ))}
                </ul>
              ) : null}

              <button
                type="button"
                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                className="mt-3 text-[13.5px] font-medium text-primary-700 transition-colors hover:text-primary-800"
              >
                {replyTo === c.id ? 'Cancel' : 'Reply'}
              </button>

              {replyTo === c.id ? (
                <form onSubmit={(e) => post(e, c.id)} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Input name="name" required placeholder="Your name" aria-label="Your name" />
                  <Input name="email" type="email" required placeholder="Your email" aria-label="Your email" />
                  <Textarea name="reply" rows={3} required placeholder="Write a reply" aria-label="Reply" className="sm:col-span-2" />
                  <div className="sm:col-span-2">
                    <Button type="submit" size="sm" disabled={status === 'sending'}>
                      {status === 'sending' ? 'Posting…' : 'Post reply'}
                    </Button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[14.5px] text-ink-400">No comments yet — be the first.</p>
      )}

      {/* --------------------------------------------------------- new comment */}
      <form onSubmit={(e) => post(e)} className="df-card mt-6 p-5 md:p-6">
        <h3 className="text-[16px] font-semibold text-ink-900">Leave a comment</h3>
        <p className="mt-1 text-[13.5px] text-ink-400">Your email is not published.</p>

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <Input label="Name" name="name" required placeholder="Your name" autoComplete="name" />
          <Input label="Email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
          <Textarea label="Comment" name="comment" rows={4} required placeholder="Share your thoughts" className="sm:col-span-2" />
        </div>

        <div className="mt-4">
          <Button type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Posting…' : 'Post comment'}
          </Button>
        </div>

        {status !== 'idle' && status !== 'sending' ? (
          <div className="mt-3">
            <FormNote status={status} error={error} doneMessage="Thank you — your comment has been posted." />
          </div>
        ) : null}
      </form>
    </section>
  );
}
