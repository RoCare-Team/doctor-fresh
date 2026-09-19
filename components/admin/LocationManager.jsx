'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Plus, Upload, Search, Pencil, Trash2, ExternalLink, Loader2, AlertTriangle, CheckCircle2,
  Clock, X, FileSpreadsheet, EyeOff,
} from 'lucide-react';
import { useCan } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

const EMPTY = {
  city: '', branch: '', address: '', time: '10 AM To 10 PM', mapLink: '', mapEmbed: '', phone: '', active: true,
};

/* ---------------------------------------------------------------- CSV parse */

/** RFC-4180-ish: quoted fields, commas and new lines inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

/**
 * A Google Business Profile export or a simple sheet. Columns are found by
 * name, so their order does not matter:
 *   city      ← Locality / City
 *   branch    ← Branch / Business name, else "Doctor Fresh " + city
 *   address   ← Address, or every "Address line" column joined
 *   map_link  ← Map link / Maps URL / Website URL
 *   map embed ← Embedded / Embed / Map embed
 *   time      ← Time / Hours, else "10 AM To 10 PM"
 */
function mapRows(table) {
  const [head, ...body] = table;
  const names = head.map((h) => h.trim().toLowerCase());
  const col = (...keys) => names.findIndex((n) => keys.some((k) => n === k || n.includes(k)));
  const cityAt = col('locality', 'city');
  const branchAt = col('branch', 'business name', 'store name');
  const addressAt = names.findIndex((n) => n === 'address' || n === 'full address');
  // In the order an address is written: street lines, area, city, state, PIN.
  const colsMatching = (re) => names.map((n, i) => (re.test(n) ? i : -1)).filter((i) => i >= 0);
  const addressParts = [
    ...colsMatching(/address line|^address \d/),
    ...colsMatching(/sub-?locality/),
    cityAt,
    ...colsMatching(/administrative area|^state$/),
    ...colsMatching(/postal code|pin ?code|zip/),
  ].filter((i) => i >= 0);
  const linkAt = col('map link', 'maps url', 'map url', 'google maps', 'website url', 'website');
  const embedAt = col('embedded', 'embed');
  const timeAt = col('time', 'hours');
  const phoneAt = col('phone', 'mobile', 'contact');

  return body.map((r) => {
    const get = (i) => (i >= 0 ? String(r[i] ?? '').trim() : '');
    const city = get(cityAt);
    const address = get(addressAt) || addressParts.map(get).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    return {
      city,
      branch: get(branchAt) || (city ? `Doctor Fresh ${city}` : ''),
      address,
      mapLink: get(linkAt),
      mapEmbed: get(embedAt),
      time: get(timeAt) || '10 AM To 10 PM',
      phone: get(phoneAt),
    };
  });
}

/* ------------------------------------------------------------------ screen */

export default function LocationManager({ locations }) {
  const router = useRouter();
  const allow = useCan();
  const [tab, setTab] = useState('view');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term
      ? locations.filter((l) => [l.city, l.branch, l.address].join(' ').toLowerCase().includes(term))
      : locations;
  }, [locations, q]);

  async function remove(l) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${l.branch}? It disappears from the store locator.`)) return;
    const res = await fetch(`/api/admin/locations?id=${l.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setNotice(res.ok && data.ok ? { ok: true, text: `${l.branch} deleted.` } : { ok: false, text: data.error || 'Could not delete.' });
    router.refresh();
  }

  const tabs = [
    { id: 'view', label: `View Locations (${locations.length})`, icon: MapPin },
    ...(allow('locations', 'create') ? [
      { id: 'add', label: 'Add Location', icon: Plus },
      { id: 'import', label: 'Import from CSV', icon: Upload },
    ] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-2xl border border-line bg-white px-5 py-4 md:px-6">
        <h1 className="text-[22px] font-bold text-ink-900">Location Management</h1>
        <p className="mt-0.5 text-[13.5px] text-ink-400">Doctor Fresh branches shown on the Store Locator page — add, edit or import them from your Google Business Profile.</p>
      </div>

      <nav className="mt-4 grid rounded-2xl border border-line bg-white" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} aria-label="Locations">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); setNotice(null); }}
            aria-current={tab === id ? 'page' : undefined}
            className={cx(
              'inline-flex items-center justify-center gap-2 border-b-2 px-3 py-3.5 text-[14px] font-medium transition-colors',
              tab === id ? 'border-primary-500 text-primary-700' : 'border-transparent text-ink-500 hover:text-ink-900',
            )}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </nav>

      {notice ? (
        <p role="status" className={cx('mt-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px]', notice.ok ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger')}>
          {notice.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          {notice.text}
        </p>
      ) : null}

      {tab === 'view' ? (
        <section className="mt-4 rounded-2xl border border-line bg-white p-4 md:p-5">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by city, address or branch…"
              aria-label="Search locations"
              className="h-11 w-full rounded-xl border border-line-strong pl-10 pr-3 text-[14.5px] outline-none focus:border-primary-500"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-200 text-left text-[14px]">
              <thead className="bg-surface-muted text-[13px] font-semibold text-ink-500">
                <tr>
                  <th className="rounded-l-lg px-3 py-2.5">City</th>
                  <th className="px-3 py-2.5">Branch</th>
                  <th className="px-3 py-2.5">Address</th>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((l) => (
                  <tr key={l.id} className={cx('transition-colors hover:bg-primary-50/30', !l.active && 'opacity-60')}>
                    <td className="px-3 py-3 font-medium text-ink-900">{l.city}</td>
                    <td className="px-3 py-3 text-ink-700">
                      {l.branch}
                      {!l.active ? <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-warning/12 px-1.5 text-[11px] font-semibold text-warning"><EyeOff size={10} aria-hidden="true" />Hidden</span> : null}
                    </td>
                    <td className="max-w-80 px-3 py-3 text-ink-500"><span className="line-clamp-1" title={l.address}>{l.address}</span></td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-500">{l.time}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-0.5">
                        {l.mapLink ? (
                          <a href={l.mapLink} target="_blank" rel="noreferrer" title="Open in Google Maps" className="rounded-lg p-2 text-ink-400 hover:bg-surface-muted hover:text-primary-700">
                            <ExternalLink size={16} aria-hidden="true" />
                          </a>
                        ) : null}
                        {allow('locations', 'edit') ? (
                          <button type="button" onClick={() => setEditing(l)} title="Edit" className="rounded-lg p-2 text-primary-600 hover:bg-primary-50">
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                        ) : null}
                        {allow('locations', 'delete') ? (
                          <button type="button" onClick={() => remove(l)} title="Delete" className="rounded-lg p-2 text-danger hover:bg-danger/10">
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!shown.length ? (
                  <tr><td colSpan={5} className="px-3 py-12 text-center text-ink-400">{q ? 'No location matches that search.' : 'No locations yet — add one or import a CSV.'}</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'add' ? (
        <section className="mt-4 rounded-2xl border border-line bg-white p-5 md:p-6">
          <h2 className="text-[17px] font-semibold text-ink-900">Add New Location</h2>
          <LocationForm
            initial={EMPTY}
            submitLabel="Add Location"
            onDone={(name) => { setNotice({ ok: true, text: `${name} added.` }); setTab('view'); router.refresh(); }}
          />
        </section>
      ) : null}

      {tab === 'import' ? (
        <ImportPanel onDone={(text) => { setNotice({ ok: true, text }); setTab('view'); router.refresh(); }} />
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" aria-label="Close" onClick={() => setEditing(null)} className="absolute inset-0 bg-ink-900/55" />
          <div role="dialog" aria-modal="true" aria-labelledby="edit-loc-title" className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl md:p-6" style={{ animation: 'df-fade-in 0.2s ease-out' }}>
            <div className="flex items-center justify-between">
              <h2 id="edit-loc-title" className="text-[17px] font-semibold text-ink-900">{`Edit ${editing.branch}`}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted"><X size={18} aria-hidden="true" /></button>
            </div>
            <LocationForm
              initial={editing}
              submitLabel="Save changes"
              showActive
              onDone={(name) => { setEditing(null); setNotice({ ok: true, text: `${name} saved.` }); router.refresh(); }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- add / edit */

function LocationForm({
  initial, submitLabel, onDone, showActive = false,
}) {
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const set = (key) => ({ value: f[key] ?? '', onChange: (e) => setF((x) => ({ ...x, [key]: e.target.value })) });
  const ready = f.city.trim() && f.branch.trim() && f.address.trim() && f.time.trim();

  async function submit(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');
    const res = await fetch('/api/admin/locations', {
      method: initial.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not save.'); setStatus('idle'); return; }
    onDone(f.branch);
  }

  const input = 'w-full rounded-lg border border-line-strong bg-white px-3 text-[14.5px] text-ink-900 outline-none placeholder:text-ink-300 focus:border-primary-500';
  const label = 'mb-1.5 block text-[13.5px] font-medium text-ink-800';

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className={label}>City Name <span className="text-danger">*</span></span>
          <input {...set('city')} required maxLength={120} className={cx(input, 'h-11')} />
        </label>
        <label className="block">
          <span className={label}>Branch Name <span className="text-danger">*</span></span>
          <input {...set('branch')} required maxLength={200} placeholder="e.g., Doctor Fresh Delhi" className={cx(input, 'h-11')} />
        </label>
      </div>
      <label className="block">
        <span className={label}>Address <span className="text-danger">*</span></span>
        <textarea {...set('address')} required maxLength={600} rows={3} className={cx(input, 'resize-y py-2.5 leading-relaxed')} />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className={label}>Time <span className="text-danger">*</span></span>
          <span className="relative block">
            <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <input {...set('time')} required maxLength={120} className={cx(input, 'h-11 pl-9')} />
          </span>
        </label>
        <label className="block md:col-span-2">
          <span className={label}>Map Link</span>
          <input {...set('mapLink')} maxLength={600} placeholder="https://maps.app.goo.gl/…" className={cx(input, 'h-11')} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className={label}>Phone (optional)</span>
          <input {...set('phone')} maxLength={30} className={cx(input, 'h-11')} />
        </label>
        <label className="block md:col-span-2">
          <span className={label}>Map Embed Code (optional)</span>
          <textarea {...set('mapEmbed')} rows={2} placeholder={'<iframe src="https://www.google.com/maps/embed?pb=…"></iframe>'} className={cx(input, 'resize-y py-2.5 font-mono text-[12.5px]')} />
        </label>
      </div>

      {showActive ? (
        <label className="flex items-center gap-2.5 text-[14px] text-ink-700">
          <input type="checkbox" checked={f.active} onChange={(e) => setF((x) => ({ ...x, active: e.target.checked }))} className="h-4 w-4 accent-primary-500" />
          Show on the Store Locator page
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[13.5px] text-danger">
          <AlertTriangle size={16} aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!ready || status === 'saving'}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary-500 to-primary-700 text-[15px] font-semibold text-white transition-opacity disabled:opacity-45"
      >
        {status === 'saving' ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}
        {status === 'saving' ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ import */

function ImportPanel({ onDone }) {
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [problems, setProblems] = useState([]);

  async function pick(chosen) {
    setError(''); setProblems([]); setRows([]); setFile(chosen || null);
    if (!chosen) return;
    const table = parseCsv(await chosen.text());
    if (table.length < 2) { setError('The file has no rows under its header.'); return; }
    const mapped = mapRows(table);
    if (!mapped.some((r) => r.city)) { setError('No city column found — the header needs a "Locality" or "City" column.'); return; }
    setRows(mapped);
  }

  async function run() {
    setStatus('saving');
    setError('');
    const res = await fetch('/api/admin/locations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setStatus('idle');
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Import failed.'); return; }
    if (data.errors?.length && !data.added) { setProblems(data.errors); return; }
    setProblems(data.errors || []);
    onDone(`Imported ${data.added} location${data.added === 1 ? '' : 's'}${data.skipped ? `, ${data.skipped} already listed were skipped` : ''}${data.errors?.length ? `, ${data.errors.length} rows had problems` : ''}.`);
  }

  return (
    <section className="mt-4 rounded-2xl border border-line bg-white p-5 md:p-6">
      <h2 className="text-[17px] font-semibold text-ink-900">Import Locations from CSV</h2>
      <p className="mt-3 text-[13.5px] font-medium text-ink-800">Select CSV File</p>
      <div className="mt-1.5 flex items-center gap-3">
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        <button type="button" onClick={() => input.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-50 px-4 text-[14px] font-semibold text-primary-700 hover:bg-primary-100">
          <FileSpreadsheet size={16} aria-hidden="true" />
          Choose File
        </button>
        <span className="truncate text-[14px] text-ink-400">{file ? file.name : 'No file chosen'}</span>
      </div>

      {rows.length ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <p className="border-b border-line bg-surface-muted px-3 py-2 text-[13px] font-medium text-ink-700">{`Preview — ${rows.length} rows`}</p>
          <table className="w-full min-w-180 text-left text-[13px]">
            <thead className="text-ink-400"><tr><th className="px-3 py-2">City</th><th className="px-3 py-2">Branch</th><th className="px-3 py-2">Address</th><th className="px-3 py-2">Map</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.slice(0, 8).map((r, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>
                  <td className="px-3 py-2 text-ink-900">{r.city || <span className="text-danger">missing</span>}</td>
                  <td className="px-3 py-2 text-ink-700">{r.branch}</td>
                  <td className="max-w-80 px-3 py-2 text-ink-500"><span className="line-clamp-1">{r.address || <span className="text-danger">missing</span>}</span></td>
                  <td className="px-3 py-2 text-ink-500">{r.mapLink ? 'link' : '—'}{r.mapEmbed ? ' + embed' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 8 ? <p className="px-3 py-2 text-[12.5px] text-ink-400">{`…and ${rows.length - 8} more`}</p> : null}
        </div>
      ) : null}

      {error ? <p role="alert" className="mt-3 text-[13.5px] text-danger">{error}</p> : null}
      {problems.length ? (
        <ul className="mt-3 max-h-40 list-inside list-disc overflow-y-auto rounded-lg border border-warning/40 bg-warning/5 p-3 text-[13px] text-ink-700">
          {problems.slice(0, 30).map((p) => <li key={p}>{p}</li>)}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={run}
        disabled={!rows.length || status === 'saving'}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-500 text-[15px] font-semibold text-white transition-opacity hover:bg-primary-700 disabled:bg-ink-300 disabled:opacity-60"
      >
        {status === 'saving' ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Upload size={17} aria-hidden="true" />}
        {status === 'saving' ? 'Importing…' : `Import ${rows.length || ''} locations`}
      </button>

      <div className="mt-5 rounded-xl bg-primary-50/60 p-4 text-[13px] text-ink-700">
        <p className="font-semibold text-ink-900">Field Mapping (columns are found by name):</p>
        <ul className="mt-1.5 space-y-0.5">
          <li><b>address:</b> “Address”, or every Address line / locality / postal code column combined</li>
          <li><b>branch:</b> “Branch” or “Business name”, else “Doctor Fresh ” + Locality</li>
          <li><b>city_name:</b> from the Locality (or City) column</li>
          <li><b>map:</b> from the Embedded column — only Google Maps embeds are kept</li>
          <li><b>map_link:</b> from Map link / Maps URL / Website URL</li>
          <li><b>time:</b> from Time / Hours, else fixed as “10 AM To 10 PM”</li>
          <li>A branch already listed for the same city is skipped, never duplicated.</li>
        </ul>
      </div>
    </section>
  );
}
