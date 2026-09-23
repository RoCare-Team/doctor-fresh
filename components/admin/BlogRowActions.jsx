'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, Trash2, Loader2, Pencil,
} from 'lucide-react';
import Link from 'next/link';
import { useCan } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

/**
 * Edit / hide / delete for one post in the list.
 *
 * Hiding takes the post off the site but keeps it here, so it can be put back;
 * deleting removes the post, its cover picture and its video for good.
 */
export default function BlogRowActions({ post }) {
  const router = useRouter();
  const allow = useCan();
  const [live, setLive] = useState(post.live);
  const [busy, setBusy] = useState('');
  const [, startTransition] = useTransition();
  const [error, setError] = useState('');

  async function call(key, init) {
    setBusy(key);
    setError('');
    const res = await fetch('/api/admin/blogs', init).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy('');
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not save the change.'); return false; }
    return true;
  }

  async function toggle() {
    const next = !live;
    const ok = await call('live', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, live: next }),
    });
    if (!ok) return;
    setLive(next);
    startTransition(() => router.refresh());
  }

  async function remove() {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${post.title}" for good?\n\nIts cover picture and video go too. To take it off the site but keep it here, use Hide instead.`)) return;
    if (await call('delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: post.id }) })) {
      startTransition(() => router.refresh());
    }
  }

  const canEdit = allow('blogs', 'edit');
  const canDelete = allow('blogs', 'delete');

  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      {error ? <span className="mr-1 text-[12px] text-danger">{error}</span> : null}

      <Link
        href={`/admin/blogs/${post.id}`}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-primary-300 px-2 text-[12px] font-medium text-primary-800 transition-colors hover:bg-primary-50"
      >
        <Pencil size={12} aria-hidden="true" />
        Edit
      </Link>

      {canEdit ? (
        <button
          type="button"
          onClick={toggle}
          disabled={Boolean(busy)}
          title={live ? 'Take it off the site, keep it here' : 'Show it on the site again'}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-line-strong px-2 text-[12px] font-medium text-ink-700 transition-colors hover:border-primary-300 disabled:opacity-50"
        >
          {busy === 'live' ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            : live ? <EyeOff size={12} aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}
          {live ? 'Hide' : 'Show'}
        </button>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          onClick={remove}
          disabled={Boolean(busy)}
          className={cx(
            'inline-flex h-7 items-center gap-1 rounded-md border border-danger/30 px-2 text-[12px] font-medium text-danger transition-colors hover:bg-danger/5 disabled:opacity-50',
          )}
        >
          {busy === 'delete' ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Trash2 size={12} aria-hidden="true" />}
          Delete
        </button>
      ) : null}
    </span>
  );
}
