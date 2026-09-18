'use client';

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  RefreshCw, Upload, Plus, Search, ExternalLink, Pencil, Trash2, X, Save, Loader2,
  ChevronLeft, ChevronRight, FileUp, CheckCircle2, AlertTriangle, ArrowRight,
} from 'lucide-react';
import {
  COLLECTIONS, REDIRECT_TYPES, SITE_HOST, sourceFor, cleanDestination, validateRule, typeInfo, parseImport,
} from '@/lib/redirects';
import { formatDate, cx } from '@/lib/utils';
import { useCan } from '@/components/admin/AdminAccess';

const PER_PAGE = 50;

const TYPE_TONE = {
  301: 'bg-primary-50 text-primary-700 ring-primary-200',
  302: 'bg-warning/10 text-warning ring-warning/30',
  404: 'bg-surface-muted text-ink-500 ring-line-strong',
  410: 'bg-danger/10 text-danger ring-danger/25',
};

/**
 * The redirect manager: every rule, grouped by the part of the site it covers,
 * searchable, filterable by type, editable one at a time or imported in bulk.
 */
export default function RedirectManager() {
  const allow = useCan();
  const canCreate = allow('redirects', 'create');
  const canEdit = allow('redirects', 'edit');
  const canDelete = allow('redirects', 'delete');
  const [all, setAll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [collection, setCollection] = useState('pages');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null); // null | {} (new) | rule
  const [importing, setImporting] = useState(false);
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/redirects', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not load redirects.');
      setAll(data.redirects);
    } catch (err) {
      setLoadError(err.message);
      setAll((current) => current || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [collection, type, search]);

  const counts = useMemo(() => {
    const byCollection = Object.fromEntries(COLLECTIONS.map((c) => [c.id, 0]));
    (all || []).forEach((r) => { byCollection[r.collection] = (byCollection[r.collection] || 0) + 1; });
    return byCollection;
  }, [all]);

  const inCollection = useMemo(() => (all || []).filter((r) => r.collection === collection), [all, collection]);

  const stats = useMemo(() => {
    const s = { total: inCollection.length, 301: 0, 302: 0, 410: 0, 404: 0 };
    inCollection.forEach((r) => { s[r.type] = (s[r.type] || 0) + 1; });
    return s;
  }, [inCollection]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inCollection.filter((r) => (type === 'all' || r.type === Number(type))
      && (!q || r.source.includes(q) || r.destination.toLowerCase().includes(q)));
  }, [inCollection, type, search]);

  const pages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const rows = visible.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggle(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Set(current);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  }

  async function remove(ids) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(ids.length === 1 ? 'Delete this redirect?' : `Delete ${ids.length} redirects?`)) return;
    const res = await fetch('/api/admin/redirects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setFlash(data.error || 'Could not delete.');
      return;
    }
    setSelected(new Set());
    setFlash(`${data.deleted} redirect${data.deleted === 1 ? '' : 's'} deleted.`);
    load();
  }

  const current = COLLECTIONS.find((c) => c.id === collection);

  return (
    <>
      {/* ------------------------------------------------------------ header */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_8px_24px_-20px_rgb(6_59_76/0.4)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold text-ink-900">Redirect Manager</h1>
            <p className="mt-0.5 text-[14px] text-ink-400">
              {'Unified manager for '}
              {COLLECTIONS.map((c, i) => (
                <span key={c.id}>
                  <span className="font-medium text-primary-700">{c.display}</span>
                  {i < COLLECTIONS.length - 2 ? ', ' : i === COLLECTIONS.length - 2 ? ' and ' : ''}
                </span>
              ))}
              {' redirects'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={load}
              aria-label="Reload"
              title="Reload"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-900"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            </button>
            {canCreate ? (
            <>
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-medium text-ink-800 transition-colors hover:border-primary-300"
            >
              <Upload size={16} aria-hidden="true" />
              Bulk Import
            </button>
            <button
              type="button"
              onClick={() => setEditing({})}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-ink-900"
            >
              <Plus size={16} aria-hidden="true" />
              Add Redirect
            </button>
            </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {COLLECTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCollection(c.id)}
              aria-pressed={collection === c.id}
              className={cx(
                'inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[14px] font-medium transition-colors',
                collection === c.id
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
              )}
            >
              {c.label}
              <span className={cx('rounded-full px-2 text-[12px]', collection === c.id ? 'bg-white/25' : 'bg-surface-muted text-ink-500')}>
                {counts[c.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={stats.total} loading={all === null} className="col-span-2 bg-white text-ink-900 sm:col-span-1" />
        <Stat label="301" value={stats[301]} loading={all === null} className="bg-primary-50 text-primary-700" />
        <Stat label="302" value={stats[302]} loading={all === null} className="bg-warning/8 text-warning" />
        <Stat label="410" value={stats[410]} loading={all === null} className="bg-danger/6 text-danger" />
        <Stat label="404" value={stats[404]} loading={all === null} className="bg-surface-muted text-ink-500" />
      </div>

      {/* ---------------------------------------------------- search + type */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Search redirects</span>
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${current.label} redirects…`}
            className="h-11 w-full rounded-xl border border-line-strong pl-10 pr-3 text-[14px] outline-none placeholder:text-ink-300 focus:border-primary-500"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12.5px] font-medium uppercase tracking-wide text-ink-400">Type:</span>
          {['all', '301', '302', '410', '404'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cx(
                'h-9 rounded-lg border px-3 text-[13px] font-semibold transition-colors',
                type === t ? 'border-primary-500 bg-primary-500 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
              )}
            >
              {t === 'all' ? 'ALL' : t}
            </button>
          ))}
        </div>
      </div>

      {flash ? (
        <p className="mt-3 flex items-center gap-2 text-[13.5px] text-success">
          <CheckCircle2 size={15} aria-hidden="true" />
          {flash}
          <button type="button" onClick={() => setFlash('')} className="text-ink-300 hover:text-ink-700" aria-label="Dismiss"><X size={14} /></button>
        </p>
      ) : null}
      {loadError ? <p className="mt-3 text-[13.5px] text-danger">{loadError}</p> : null}

      {selected.size ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5">
          <span className="text-[14px] font-medium text-primary-800">{`${selected.size} selected`}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelected(new Set())} className="h-9 rounded-lg px-3 text-[13.5px] text-ink-500 hover:text-ink-900">
              Clear
            </button>
            {canDelete ? (
            <button
              type="button"
              onClick={() => remove([...selected])}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-danger px-3.5 text-[13.5px] font-semibold text-white hover:opacity-90"
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete selected
            </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- table */}
      <div className="df-scrollbar mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-230 border-separate border-spacing-0 text-left text-[14px]">
          <thead className="bg-surface-muted text-[12.5px] uppercase tracking-wide text-ink-400">
            <tr>
              <th className="w-10 border-b border-line px-4 py-3">
                <input type="checkbox" checked={allOnPageSelected} onChange={togglePage} aria-label="Select all on this page" className="h-4 w-4 accent-primary-600" />
              </th>
              <th className="border-b border-line px-4 py-3 font-semibold">Source URL</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Type</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Destination</th>
              <th className="border-b border-line px-4 py-3 font-semibold">Updated</th>
              <th className="border-b border-line px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {all === null ? (
              // Rows shaped like the real ones while the list is read.
              Array.from({ length: 6 }, (_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse" aria-hidden="true">
                  <td className="border-b border-line px-4 py-4"><span className="block h-4 w-4 rounded bg-line" /></td>
                  <td className="border-b border-line px-4 py-4"><span className="block h-3.5 w-72 max-w-full rounded bg-line" /></td>
                  <td className="border-b border-line px-4 py-4"><span className="block h-5 w-12 rounded-full bg-line" /></td>
                  <td className="border-b border-line px-4 py-4"><span className="block h-3.5 w-48 rounded bg-line" /></td>
                  <td className="border-b border-line px-4 py-4"><span className="block h-3.5 w-20 rounded bg-line" /></td>
                  <td className="border-b border-line px-4 py-4"><span className="ml-auto block h-6 w-24 rounded bg-line" /></td>
                </tr>
              ))
            ) : rows.length ? rows.map((r) => (
              <tr key={r.id} className={cx('transition-colors hover:bg-primary-50/40', selected.has(r.id) && 'bg-primary-50/60')}>
                <td className="border-b border-line px-4 py-3">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.source}`} className="h-4 w-4 accent-primary-600" />
                </td>
                <td className="max-w-90 border-b border-line px-4 py-3">
                  <span className="block truncate font-mono text-[13px] text-ink-800" title={`${SITE_HOST}${r.source}`}>
                    <span className="text-ink-300">{SITE_HOST}</span>
                    {r.source}
                  </span>
                </td>
                <td className="border-b border-line px-4 py-3">
                  <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-bold ring-1', TYPE_TONE[r.type])}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {r.type}
                  </span>
                </td>
                <td className="max-w-80 border-b border-line px-4 py-3">
                  {r.destination ? (
                    <span className="block truncate text-ink-700" title={r.destination}>{r.destination}</span>
                  ) : (
                    <span className="text-[13px] text-ink-300">{typeInfo(r.type)?.label.split('– ')[1]}</span>
                  )}
                </td>
                <td className="whitespace-nowrap border-b border-line px-4 py-3 text-[13px] text-ink-400">
                  {r.updatedAt ? formatDate(r.updatedAt) : '—'}
                </td>
                <td className="border-b border-line px-4 py-3">
                  <div className="flex justify-end gap-0.5">
                    <IconBtn label="Test this redirect in a new tab" href={r.source} icon={ExternalLink} />
                    {canEdit ? <IconBtn label="Edit" icon={Pencil} onClick={() => setEditing(r)} /> : null}
                    {canDelete ? <IconBtn label="Delete" icon={Trash2} tone="danger" onClick={() => remove([r.id])} /> : null}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <p className="text-[15px] font-medium text-ink-700">
                    {inCollection.length ? 'No redirects match this search.' : `No ${current.label.toLowerCase()} redirects yet.`}
                  </p>
                  {!inCollection.length && canCreate ? (
                    <button type="button" onClick={() => setEditing({})} className="mt-2 text-[14px] font-medium text-primary-700 hover:text-primary-800">
                      + Add the first one
                    </button>
                  ) : null}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="mt-3 flex items-center justify-between text-[13.5px] text-ink-500">
          <span>{`${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, visible.length)} of ${visible.length}`}</span>
          <div className="flex gap-1.5">
            <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-white disabled:opacity-40"><ChevronLeft size={16} /></button>
            <span className="flex h-9 items-center px-2">{`${page} / ${pages}`}</span>
            <button type="button" disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Next page" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-white disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      ) : null}

      {editing ? (
        <RedirectDialog
          rule={editing}
          defaultCollection={collection}
          onClose={() => setEditing(null)}
          onSaved={(message, savedCollection) => {
            setEditing(null);
            setFlash(message);
            if (savedCollection) setCollection(savedCollection);
            load();
          }}
        />
      ) : null}

      {importing ? (
        <ImportDialog
          defaultCollection={collection}
          onClose={() => setImporting(false)}
          onDone={(message) => { setFlash(message); load(); }}
        />
      ) : null}
    </>
  );
}

function Stat({
  label, value, className, loading,
}) {
  return (
    <div className={cx('rounded-2xl border border-line px-4 py-4 text-center', className)}>
      {loading
        ? <span className="mx-auto block h-7 w-10 animate-pulse rounded bg-current opacity-15" aria-hidden="true" />
        : <p className="text-[28px] font-bold leading-none">{value}</p>}
      <p className="mt-1.5 text-[13px] font-medium opacity-80">{label}</p>
    </div>
  );
}

function IconBtn({
  label, icon: Icon, onClick, href, tone,
}) {
  const className = cx(
    'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
    tone === 'danger' ? 'text-ink-400 hover:bg-danger/10 hover:text-danger' : 'text-ink-400 hover:bg-surface-muted hover:text-ink-900',
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={label} aria-label={label} className={className}>
        <Icon size={16} aria-hidden="true" />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

/* ------------------------------------------------------------------ dialogs */

function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-ink-900/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[18px] font-semibold text-ink-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted hover:text-ink-900">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="df-scrollbar overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex justify-end gap-2.5 border-t border-line bg-surface-muted/60 px-5 py-3.5">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

function RedirectDialog({
  rule, defaultCollection, onClose, onSaved,
}) {
  const isEdit = Boolean(rule.id);
  const [collection, setCollection] = useState(rule.collection || defaultCollection);
  const [source, setSource] = useState(rule.source || '');
  const [type, setType] = useState(rule.type || 301);
  const [destination, setDestination] = useState(rule.destination || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const sourceRef = useRef(null);

  useEffect(() => { sourceRef.current?.focus(); }, []);

  const info = typeInfo(type);
  const preview = sourceFor(source, collection);
  const cleanDest = info.needsDestination ? cleanDestination(destination) : '';

  async function save() {
    const problem = validateRule({ source: preview.source, destination: cleanDest, type: Number(type) });
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/redirects', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id, collection, source, destination, type: Number(type),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save.');
      onSaved(isEdit ? 'Redirect updated.' : 'Redirect added — live within 30 seconds.', preview.collection);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const enter = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
  };

  return (
    <Modal
      title={`${isEdit ? 'Edit' : 'New'} ${COLLECTIONS.find((c) => c.id === collection)?.label} Redirect`}
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-medium text-ink-700 hover:bg-surface-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-5 text-[14px] font-semibold text-white hover:bg-ink-900 disabled:opacity-70"
          >
            {saving ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
            Save
          </button>
        </>
      )}
    >
      <p className="text-[13.5px] font-semibold text-ink-800">Collection</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {COLLECTIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCollection(c.id)}
            aria-pressed={collection === c.id}
            className={cx(
              'h-8 rounded-lg border px-3 text-[13px] font-semibold transition-colors',
              collection === c.id ? 'border-primary-500 bg-primary-500 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="text-[13.5px] font-semibold text-ink-800">Source Path <span className="text-danger">*</span></span>
        <input
          ref={sourceRef}
          value={source}
          onChange={(e) => { setSource(e.target.value); setError(''); }}
          onKeyDown={enter}
          placeholder="Paste full URL or just the slug…"
          className="mt-1.5 h-11 w-full rounded-xl border border-line-strong px-3.5 font-mono text-[13.5px] outline-none placeholder:font-sans placeholder:text-ink-300 focus:border-primary-500"
        />
        <span className="mt-1 block text-[12.5px] text-ink-400">Domain and file extensions are stripped automatically.</span>
        {preview.source ? (
          <span className="mt-1.5 block truncate rounded-lg bg-surface-muted px-2.5 py-1.5 font-mono text-[12.5px] text-ink-700">
            <span className="text-ink-300">{SITE_HOST}</span>
            {preview.source}
          </span>
        ) : null}
      </label>

      <label className="mt-4 block">
        <span className="text-[13.5px] font-semibold text-ink-800">Redirect Type <span className="text-danger">*</span></span>
        <select
          value={type}
          onChange={(e) => { setType(Number(e.target.value)); setError(''); }}
          className="mt-1.5 h-11 w-full cursor-pointer rounded-xl border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-primary-500"
        >
          {REDIRECT_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
        </select>
      </label>

      {info.needsDestination ? (
        <label className="mt-4 block">
          <span className="text-[13.5px] font-semibold text-ink-800">Destination <span className="text-danger">*</span></span>
          <input
            value={destination}
            onChange={(e) => { setDestination(e.target.value); setError(''); }}
            onKeyDown={enter}
            placeholder="/new-page or https://other-site.com/page"
            className="mt-1.5 h-11 w-full rounded-xl border border-line-strong px-3.5 font-mono text-[13.5px] outline-none placeholder:font-sans placeholder:text-ink-300 focus:border-primary-500"
          />
          {preview.source && cleanDest ? (
            <span className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-500">
              <span className="truncate font-mono">{preview.source}</span>
              <ArrowRight size={13} className="shrink-0 text-primary-600" aria-hidden="true" />
              <span className="truncate font-mono text-primary-700">{cleanDest}</span>
            </span>
          ) : null}
        </label>
      ) : (
        <p className="mt-4 rounded-xl bg-surface-muted px-3.5 py-3 text-[13px] leading-relaxed text-ink-500">
          {type === 410
            ? 'Visitors and search engines are told this page is gone for good — Google drops it from results faster than a 404.'
            : 'Visitors see a “page not found” page. Use this for a page that should not redirect anywhere.'}
        </p>
      )}

      {error ? (
        <p className="mt-3 flex items-start gap-1.5 text-[13.5px] text-danger">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

function ImportDialog({ defaultCollection, onClose, onDone }) {
  const [collection, setCollection] = useState(defaultCollection);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const parsed = useMemo(() => parseImport(text, collection), [text, collection]);

  async function readFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('The file is larger than 2 MB.');
      return;
    }
    setText(await file.text());
    setError('');
  }

  async function run() {
    if (!parsed.rows.length) {
      setError(parsed.errors[0] || 'Paste or upload at least one redirect.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ import: text, collection }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Import failed.');
      setResult(data);
      onDone(`Imported: ${data.added} added, ${data.updated} updated${data.failed.length ? `, ${data.failed.length} skipped` : ''}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Bulk Import Redirects"
      onClose={onClose}
      footer={result ? (
        <button type="button" onClick={onClose} className="h-10 rounded-lg bg-primary-500 px-5 text-[14px] font-semibold text-white hover:bg-ink-900">Done</button>
      ) : (
        <>
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-medium text-ink-700 hover:bg-surface-muted">Cancel</button>
          <button
            type="button"
            onClick={run}
            disabled={busy || !parsed.rows.length}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-5 text-[14px] font-semibold text-white hover:bg-ink-900 disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Upload size={15} aria-hidden="true" />}
            {`Import ${parsed.rows.length || ''}`}
          </button>
        </>
      )}
    >
      {result ? (
        <div>
          <p className="flex items-center gap-2 text-[15px] font-semibold text-success">
            <CheckCircle2 size={18} aria-hidden="true" />
            {`${result.added} added · ${result.updated} updated`}
          </p>
          {result.failed.length ? (
            <div className="mt-3">
              <p className="text-[13.5px] font-medium text-ink-700">{`${result.failed.length} line(s) skipped:`}</p>
              <ul className="df-scrollbar mt-1.5 max-h-48 overflow-y-auto rounded-lg bg-surface-muted p-3 text-[12.5px] text-danger">
                {result.failed.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-[13.5px] font-semibold text-ink-800">Collection for bare slugs</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COLLECTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCollection(c.id)}
                aria-pressed={collection === c.id}
                className={cx(
                  'h-8 rounded-lg border px-3 text-[13px] font-semibold transition-colors',
                  collection === c.id ? 'border-primary-500 bg-primary-500 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[13.5px] font-semibold text-ink-800">One redirect per line</span>
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary-700 hover:text-primary-800">
              <FileUp size={14} aria-hidden="true" />
              Upload CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setError(''); }}
            rows={9}
            spellCheck={false}
            placeholder={'source, destination, type\nold-page.php, /new-page, 301\nwww.doctorfresh.in/sale, /offers, 302\n/discontinued-model, 410'}
            className="df-scrollbar mt-1.5 w-full resize-y rounded-xl border border-line-strong px-3.5 py-3 font-mono text-[13px] leading-relaxed outline-none placeholder:text-ink-300 focus:border-primary-500"
          />
          <p className="mt-1 text-[12.5px] text-ink-400">
            Commas or tabs. The type is optional (301 if left out); 404 and 410 need no destination. An address that already has a redirect is updated.
          </p>

          {text.trim() ? (
            <p className="mt-2.5 text-[13px]">
              <span className="font-semibold text-success">{`${parsed.rows.length} ready`}</span>
              {parsed.errors.length ? <span className="text-danger">{` · ${parsed.errors.length} with problems`}</span> : null}
            </p>
          ) : null}
          {parsed.errors.length ? (
            <ul className="df-scrollbar mt-1.5 max-h-28 overflow-y-auto rounded-lg bg-danger/5 p-2.5 text-[12.5px] text-danger">
              {parsed.errors.slice(0, 20).map((e) => <li key={e}>{e}</li>)}
            </ul>
          ) : null}
          {error ? <p className="mt-2 text-[13.5px] text-danger">{error}</p> : null}
        </>
      )}
    </Modal>
  );
}
