'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Plus, Pencil, Trash2, X, Search, Loader2, Save, GripVertical, AlertTriangle, CheckCircle2, ExternalLink,
  ArrowUp, ArrowDown, Link2,
} from 'lucide-react';
import { useCan } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

/** Quick Links Manager: the link sections at the foot of the home page. */
export default function QuickLinksManager({ sections, icons }) {
  const router = useRouter();
  const allow = useCan();
  const [editing, setEditing] = useState(null); // null | 'new' | section
  const [notice, setNotice] = useState(null);
  const iconLabel = (id) => icons.find((i) => i.id === id)?.label || id;

  async function remove(s) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete the section “${s.title}”? It disappears from the home page.`)) return;
    const res = await fetch(`/api/admin/quick-links?id=${s.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setNotice(res.ok && data.ok ? { ok: true, text: `“${s.title}” deleted.` } : { ok: false, text: data.error || 'Could not delete.' });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Quick Links Manager</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-400">The “Quick Links” sections at the bottom of the home page. Nothing shows there until a section is added.</p>
        </div>
        {allow('quick_links', 'create') ? (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary-500 px-4 text-[14px] font-semibold text-white hover:bg-primary-700"
          >
            <Plus size={16} aria-hidden="true" />
            Create New Section
          </button>
        ) : null}
      </div>

      {notice ? (
        <p role="status" className={cx('mt-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px]', notice.ok ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger')}>
          {notice.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          {notice.text}
        </p>
      ) : null}

      <h2 className="mt-6 text-[16px] font-semibold text-ink-900">Existing Sections</h2>
      {!sections.length ? (
        <div className="mt-3 rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
          <Link2 size={28} className="mx-auto text-ink-300" aria-hidden="true" />
          <p className="mt-2 font-medium text-ink-700">No sections yet</p>
          <p className="text-[13.5px] text-ink-400">Create one — e.g. “RO Service Popular Cities” — and pick the pages it links to.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {sections.map((s) => (
            <li key={s.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[16px] font-semibold text-ink-900">{s.title}</h3>
                  <p className="mt-0.5 text-[12.5px] text-ink-400">{`Order: ${s.sortId} · Icon: ${iconLabel(s.icon)} · Pages: ${s.pages.length}`}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {allow('quick_links', 'edit') ? (
                    <button type="button" onClick={() => setEditing(s)} title="Edit" className="rounded-lg p-2 text-primary-600 hover:bg-primary-50"><Pencil size={16} aria-hidden="true" /></button>
                  ) : null}
                  {allow('quick_links', 'delete') ? (
                    <button type="button" onClick={() => remove(s)} title="Delete" className="rounded-lg p-2 text-danger hover:bg-danger/10"><Trash2 size={16} aria-hidden="true" /></button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.pages.slice(0, 10).map((p) => (
                  <a key={p.slug} href={`/${p.slug}`} target="_blank" rel="noreferrer" className="rounded-full bg-primary-50 px-2.5 py-1 text-[12.5px] text-primary-800 hover:bg-primary-100">
                    {p.name}
                  </a>
                ))}
                {s.pages.length > 10 ? <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[12.5px] text-ink-500">{`+${s.pages.length - 10} more`}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <SectionDialog
          section={editing === 'new' ? null : editing}
          icons={icons}
          nextOrder={sections.length ? Math.max(...sections.map((s) => s.sortId)) + 1 : 0}
          onClose={() => setEditing(null)}
          onSaved={(title) => { setEditing(null); setNotice({ ok: true, text: `“${title}” saved — it shows on the home page.` }); router.refresh(); }}
        />
      ) : null}
    </div>
  );
}

function SectionDialog({
  section, icons, nextOrder, onClose, onSaved,
}) {
  const [title, setTitle] = useState(section?.title || '');
  const [icon, setIcon] = useState(section?.icon || 'map-pin');
  const [sortId, setSortId] = useState(section ? section.sortId : nextOrder);
  const [pages, setPages] = useState(section?.pages || []);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const dragFrom = useRef(null);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape' && status !== 'saving') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose, status]);

  // Search as they type, a moment after they stop.
  useEffect(() => {
    let live = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/quick-links?search=${encodeURIComponent(q)}`).catch(() => null);
      const data = await res?.json().catch(() => ({}));
      if (!live) return;
      setResults(data?.pages || []);
      setTotal(data?.total || 0);
      setSearching(false);
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const chosen = new Set(pages.map((p) => p.slug));
  const add = (p) => setPages((list) => (list.some((x) => x.slug === p.slug) ? list : [...list, p]));
  const move = (from, to) => setPages((list) => {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  });

  async function save() {
    setStatus('saving');
    setError('');
    const res = await fetch('/api/admin/quick-links', {
      method: section ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: section?.id, title, icon, sortId: Number(sortId) || 0, pages }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not save.'); setStatus('idle'); return; }
    onSaved(title);
  }

  const input = 'h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] text-ink-900 outline-none placeholder:text-ink-300 focus:border-primary-500';

  return createPortal(
    <div className="fixed inset-0 z-80 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={() => status !== 'saving' && onClose()} className="absolute inset-0 bg-ink-900/55" />
      <div role="dialog" aria-modal="true" aria-labelledby="ql-title" className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" style={{ animation: 'df-fade-in 0.2s ease-out' }}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="ql-title" className="text-[18px] font-semibold text-ink-900">{section ? 'Edit Section' : 'Create New Section'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted"><X size={18} aria-hidden="true" /></button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-800">Section Title <span className="text-danger">*</span></span>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g., RO Service Popular Cities" className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-800">Icon</span>
              <select value={icon} onChange={(e) => setIcon(e.target.value)} className={cx(input, 'cursor-pointer')}>
                {icons.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-800">Display Order</span>
              <input type="number" value={sortId} onChange={(e) => setSortId(e.target.value)} className={input} />
              <span className="mt-1 block text-[12px] text-ink-400">Lower numbers show first.</span>
            </label>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-800">{`Selected Pages (${pages.length})`}</p>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-line bg-surface-muted/50 p-2">
              {!pages.length ? (
                <p className="py-6 text-center text-[13.5px] text-ink-400">No pages selected. Search and add pages below.</p>
              ) : (
                <ul className="space-y-1.5">
                  {pages.map((p, i) => (
                    <li
                      key={p.slug}
                      draggable
                      onDragStart={() => { dragFrom.current = i; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragFrom.current !== null) move(dragFrom.current, i); dragFrom.current = null; }}
                      className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2"
                    >
                      <GripVertical size={16} className="shrink-0 cursor-grab text-ink-300" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink-900">{p.name}</p>
                        <p className="truncate text-[12px] text-ink-400">{p.slug}</p>
                      </div>
                      <button type="button" onClick={() => move(i, i - 1)} disabled={!i} aria-label="Move up" className="rounded p-1 text-ink-400 hover:bg-surface-muted disabled:opacity-30"><ArrowUp size={14} aria-hidden="true" /></button>
                      <button type="button" onClick={() => move(i, i + 1)} disabled={i === pages.length - 1} aria-label="Move down" className="rounded p-1 text-ink-400 hover:bg-surface-muted disabled:opacity-30"><ArrowDown size={14} aria-hidden="true" /></button>
                      <button type="button" onClick={() => setPages((l) => l.filter((x) => x.slug !== p.slug))} aria-label={`Remove ${p.name}`} className="rounded p-1 text-danger hover:bg-danger/10"><Trash2 size={14} aria-hidden="true" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-800">Search Pages (service &amp; city pages)</p>
            <span className="relative block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by page name or URL…" className={cx(input, 'pl-9')} />
              {searching ? <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary-500" aria-hidden="true" /> : null}
            </span>
            <ul className="mt-2 max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {results.map((p) => (
                <li key={p.slug} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink-900">{p.name}</p>
                    <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-[12px] text-ink-400 hover:text-primary-700">
                      <span className="truncate">{p.slug}</span>
                      <ExternalLink size={11} className="shrink-0" aria-hidden="true" />
                    </a>
                  </div>
                  {chosen.has(p.slug) ? (
                    <span className="rounded-lg bg-success/10 px-3 py-1.5 text-[12.5px] font-semibold text-success">Added</span>
                  ) : (
                    <button type="button" onClick={() => add(p)} className="rounded-lg bg-primary-500 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-primary-700">Add</button>
                  )}
                </li>
              ))}
              {!results.length && !searching ? <li className="px-3 py-6 text-center text-[13px] text-ink-400">No pages match.</li> : null}
            </ul>
            {total > results.length ? <p className="mt-1 text-[12px] text-ink-400">{`Showing ${results.length} of ${total.toLocaleString('en-IN')} — type to narrow it down.`}</p> : null}
          </div>

          {error ? (
            <p role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[13.5px] text-danger">
              <AlertTriangle size={16} aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-line bg-surface-muted/50 px-5 py-3">
          <button
            type="button"
            onClick={save}
            disabled={status === 'saving' || !title.trim() || !pages.length}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-success px-5 text-[14.5px] font-semibold text-white transition-opacity disabled:opacity-45"
          >
            {status === 'saving' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {section ? 'Update Section' : 'Create Section'}
          </button>
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-line-strong bg-white px-5 text-[14px] font-medium text-ink-700">Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
