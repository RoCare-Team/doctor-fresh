'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, X, Loader2, AlertTriangle, CheckCircle2, Building2, Map as MapIcon,
} from 'lucide-react';
import { useCan } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

const PER_PAGE = 50;
const title = (s) => String(s || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** States & Cities — the lists behind the site's state / city dropdowns. */
export default function CitiesManager({ cities, states }) {
  const router = useRouter();
  const allow = useCan();
  const [tab, setTab] = useState('cities');
  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // { kind, record|null }
  const [notice, setNotice] = useState(null);

  const active = cities.filter((c) => c.active).length;

  const filteredCities = useMemo(() => {
    const term = q.trim().toLowerCase();
    return cities
      .filter((c) => !stateFilter || String(c.stateId) === stateFilter)
      .filter((c) => !statusFilter || (statusFilter === 'active' ? c.active : !c.active))
      .filter((c) => !term || `${c.name} ${c.state}`.toLowerCase().includes(term));
  }, [cities, q, stateFilter, statusFilter]);

  const filteredStates = useMemo(() => {
    const term = q.trim().toLowerCase();
    return states.filter((s) => !term || s.name.toLowerCase().includes(term));
  }, [states, q]);

  const list = tab === 'cities' ? filteredCities : filteredStates;
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = list.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  async function call(method, url, body) {
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) { setNotice({ ok: false, text: data?.error || 'That did not work.' }); return false; }
    router.refresh();
    return true;
  }

  async function remove(kind, record) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${title(record.name)}? It disappears from the ${kind === 'state' ? 'state' : 'city'} dropdowns.`)) return;
    if (await call('DELETE', `/api/admin/cities?kind=${kind}&id=${record.id}`)) setNotice({ ok: true, text: `${title(record.name)} deleted.` });
  }

  const stats = tab === 'cities'
    ? [['Total', cities.length, 'text-ink-900'], ['Active', active, 'text-success'], ['Inactive', cities.length - active, 'text-ink-300']]
    : [['States', states.length, 'text-ink-900'], ['Active', states.filter((s) => s.active).length, 'text-success'], ['Without cities', states.filter((s) => !s.cities).length, 'text-ink-300']];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-ink-900">States &amp; Cities</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-400">The state and city lists used by the enquiry and service forms, and for SEO pages. Changes show in the forms at once.</p>
        </div>
        {allow('cities', 'create') ? (
          <button
            type="button"
            onClick={() => setEditing({ kind: tab === 'cities' ? 'city' : 'state', record: null })}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary-500 px-4 text-[14px] font-semibold text-white hover:bg-primary-700"
          >
            <Plus size={16} aria-hidden="true" />
            {tab === 'cities' ? 'Add City' : 'Add State'}
          </button>
        ) : null}
      </div>

      <nav className="mt-4 flex gap-1 border-b border-line" aria-label="States and cities">
        {[['cities', 'Cities', Building2, cities.length], ['states', 'States', MapIcon, states.length]].map(([id, label, Icon, n]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); setPage(1); setQ(''); }}
            className={cx('relative inline-flex items-center gap-2 px-4 py-2.5 text-[14.5px] font-medium', tab === id ? 'text-primary-700' : 'text-ink-400 hover:text-ink-700')}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
            <span className="rounded-full bg-surface-muted px-1.5 text-[11.5px] text-ink-500">{n}</span>
            {tab === id ? <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary-500" /> : null}
          </button>
        ))}
      </nav>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-[13px] text-ink-400">{label}</p>
            <p className={cx('mt-1 text-[26px] font-bold leading-none tabular-nums', tone)}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="relative min-w-0 flex-1 basis-64">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder={tab === 'cities' ? 'Search by city or state…' : 'Search states…'}
            aria-label="Search"
            className="h-11 w-full rounded-xl border border-line-strong bg-white pl-10 pr-3 text-[14.5px] outline-none focus:border-primary-500"
          />
        </span>
        {tab === 'cities' ? (
          <>
            <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }} aria-label="Filter by state" className="h-11 max-w-60 rounded-xl border border-line-strong bg-white px-3 text-[14px]">
              <option value="">All states</option>
              {states.map((s) => <option key={s.id} value={s.id}>{title(s.name)}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter by status" className="h-11 rounded-xl border border-line-strong bg-white px-3 text-[14px]">
              <option value="">Active &amp; inactive</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </>
        ) : null}
      </div>

      {notice ? (
        <p role="status" className={cx('mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px]', notice.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
          {notice.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          {notice.text}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="ml-auto"><X size={14} aria-hidden="true" /></button>
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="bg-surface-muted text-[13px] font-semibold text-ink-500">
            {tab === 'cities' ? (
              <tr>
                <th className="w-14 px-4 py-3">#</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Lat</th>
                <th className="px-4 py-3">Long</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            ) : (
              <tr>
                <th className="w-14 px-4 py-3">#</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Cities</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((r, i) => (
              <tr key={r.id} className="hover:bg-surface-muted/60">
                <td className="px-4 py-3 text-ink-300">{(current - 1) * PER_PAGE + i + 1}</td>
                <td className="px-4 py-3 font-semibold text-ink-900">{title(r.name)}</td>
                {tab === 'cities' ? (
                  <>
                    <td className="px-4 py-3 text-ink-500">{title(r.state)}</td>
                    <td className="px-4 py-3 tabular-nums text-ink-500">{r.lat || '—'}</td>
                    <td className="px-4 py-3 tabular-nums text-ink-500">{r.lng || '—'}</td>
                  </>
                ) : (
                  <td className="px-4 py-3 text-ink-500">
                    <button type="button" onClick={() => { setTab('cities'); setStateFilter(String(r.id)); setQ(''); setPage(1); }} className="hover:text-primary-700 hover:underline">
                      {`${r.cities} cities`}
                    </button>
                  </td>
                )}
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={!allow('cities', 'edit') || tab !== 'cities'}
                    onClick={() => call('PATCH', '/api/admin/cities', { kind: 'city', id: r.id, active: !r.active })}
                    title={tab === 'cities' && allow('cities', 'edit') ? 'Click to switch' : undefined}
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium disabled:cursor-default',
                      r.active ? 'bg-success/12 text-success' : 'bg-surface-muted text-ink-400',
                    )}
                  >
                    <span className={cx('h-1.5 w-1.5 rounded-full', r.active ? 'bg-success' : 'bg-ink-300')} aria-hidden="true" />
                    {r.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {allow('cities', 'edit') ? (
                    <button type="button" onClick={() => setEditing({ kind: tab === 'cities' ? 'city' : 'state', record: r })} className="mr-4 text-[13.5px] font-medium text-primary-700 hover:underline">Edit</button>
                  ) : null}
                  {allow('cities', 'delete') ? (
                    <button type="button" onClick={() => remove(tab === 'cities' ? 'city' : 'state', r)} className="text-[13.5px] font-medium text-danger hover:underline">Delete</button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!shown.length ? <tr><td colSpan={7} className="px-4 py-12 text-center text-ink-400">Nothing matches.</td></tr> : null}
          </tbody>
        </table>
        {pages > 1 ? (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-ink-500">
            <span>{`${list.length} ${tab} · page ${current} of ${pages}`}</span>
            <div className="flex gap-1.5">
              <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="h-8 rounded-lg border border-line-strong px-3 disabled:opacity-40">Previous</button>
              <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="h-8 rounded-lg border border-line-strong px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        ) : null}
      </div>

      {editing ? (
        <EditDialog
          kind={editing.kind}
          record={editing.record}
          states={states}
          defaultStateId={stateFilter}
          onClose={() => setEditing(null)}
          onSaved={(name) => { setEditing(null); setNotice({ ok: true, text: `${title(name)} saved.` }); router.refresh(); }}
        />
      ) : null}
    </div>
  );
}

function EditDialog({
  kind, record, states, defaultStateId, onClose, onSaved,
}) {
  const isCity = kind === 'city';
  const [f, setF] = useState({
    name: record ? title(record.name) : '',
    stateId: record?.stateId ? String(record.stateId) : defaultStateId || '',
    lat: record?.lat || '',
    lng: record?.lng || '',
    active: record ? record.active : true,
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape' && status !== 'saving') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose, status]);

  async function save() {
    setStatus('saving');
    setError('');
    const res = await fetch('/api/admin/cities', {
      method: record ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id: record?.id, ...f }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not save.'); setStatus('idle'); return; }
    onSaved(f.name);
  }

  const input = 'h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[14.5px] outline-none focus:border-primary-500';
  const bind = (key) => ({ value: f[key], onChange: (e) => setF((x) => ({ ...x, [key]: e.target.value })) });

  return createPortal(
    <div className="fixed inset-0 z-80 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={() => status !== 'saving' && onClose()} className="absolute inset-0 bg-ink-900/55" />
      <div role="dialog" aria-modal="true" aria-labelledby="geo-title" className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" style={{ animation: 'df-fade-in 0.2s ease-out' }}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="geo-title" className="text-[17px] font-semibold text-ink-900">{`${record ? 'Edit' : 'Add'} ${isCity ? 'city' : 'state'}`}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted"><X size={18} aria-hidden="true" /></button>
        </div>
        <div
          className="space-y-4 px-5 py-4"
          onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(); } }}
        >
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">{`${isCity ? 'City' : 'State'} name`} <span className="text-danger">*</span></span>
            <input autoFocus {...bind('name')} maxLength={120} placeholder={isCity ? 'e.g. Prayagraj' : 'e.g. Uttar Pradesh'} className={input} />
          </label>
          {isCity ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">State <span className="text-danger">*</span></span>
                <select {...bind('stateId')} className={cx(input, 'cursor-pointer')}>
                  <option value="">Choose the state…</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{title(s.name)}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">Latitude</span>
                  <input {...bind('lat')} inputMode="decimal" placeholder="25.4358" className={input} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">Longitude</span>
                  <input {...bind('lng')} inputMode="decimal" placeholder="81.8463" className={input} />
                </label>
              </div>
              <p className="-mt-2 text-[12px] text-ink-400">Optional. In Google Maps, right-click the city and click the numbers to copy them.</p>
            </>
          ) : null}
          <label className="flex items-center gap-2.5 text-[14px] text-ink-700">
            <input type="checkbox" checked={f.active} onChange={(e) => setF((x) => ({ ...x, active: e.target.checked }))} className="h-4 w-4 accent-primary-500" />
            {`Active — shown in the ${isCity ? 'city' : 'state'} dropdowns`}
          </label>
          {error ? (
            <p role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[13.5px] text-danger">
              <AlertTriangle size={16} aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-surface-muted/50 px-5 py-3">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-medium text-ink-700">Cancel</button>
          <button type="button" onClick={save} disabled={status === 'saving'} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-5 text-[14px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            {status === 'saving' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {record ? 'Save changes' : `Add ${isCity ? 'city' : 'state'}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
