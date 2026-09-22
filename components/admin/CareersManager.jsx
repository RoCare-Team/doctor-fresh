'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Users, Plus, Pencil, Trash2, X, Search, MapPin, Clock, GraduationCap, FileText, Phone, Mail,
  ExternalLink, Loader2, Eye, EyeOff,
} from 'lucide-react';
import { useCan } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

const when = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—');

const field = 'h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-primary-500';
const label = 'mb-1 block text-[12.5px] font-medium text-ink-700';

const STAGE_TONE = {
  new: 'bg-primary-50 text-primary-800 border-primary-200',
  shortlisted: 'bg-warning/10 text-ink-900 border-warning/40',
  contacted: 'bg-surface-muted text-ink-700 border-line-strong',
  hired: 'bg-success/10 text-success border-success/40',
  rejected: 'bg-danger/5 text-danger border-danger/30',
};

const EMPTY_JOB = {
  id: 0, title: '', location: '', jobType: 'Full time', experience: '', positions: 1, description: '', open: true,
};

/** Add / edit one opening. */
function JobForm({
  job, jobTypes, onSaved, onCancel, onError,
}) {
  const [f, setF] = useState({ ...EMPTY_JOB, ...job });
  const [saving, setSaving] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/careers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job: f }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok || !data?.ok) { onError(data?.error || 'Could not save the opening.'); return; }
    onSaved({ ...f, id: data.id });
  }

  return (
    <form onSubmit={save} className="rounded-2xl border border-primary-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-ink-900">{f.id ? 'Edit opening' : 'New opening'}</h2>
        <button type="button" onClick={onCancel} aria-label="Close" className="rounded p-1 text-ink-300 hover:bg-surface-muted hover:text-ink-700"><X size={16} aria-hidden="true" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="job-title">Job title *</label>
          <input id="job-title" required maxLength={255} value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. RO Service Technician" className={field} />
        </div>
        <div>
          <label className={label} htmlFor="job-location">Location</label>
          <input id="job-location" maxLength={50} value={f.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Gurgaon" className={field} />
        </div>
        <div>
          <label className={label} htmlFor="job-type">Job type</label>
          <select id="job-type" value={f.jobType} onChange={(e) => set({ jobType: e.target.value })} className={field}>
            {jobTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="job-exp">Experience</label>
          <input id="job-exp" maxLength={50} value={f.experience} onChange={(e) => set({ experience: e.target.value })} placeholder="e.g. 1–3 years" className={field} />
        </div>
        <div>
          <label className={label} htmlFor="job-pos">Number of posts</label>
          <input id="job-pos" type="number" min={0} max={999} value={f.positions} onChange={(e) => set({ positions: e.target.value })} className={field} />
        </div>
        <label className="flex items-end gap-2 pb-2.5 text-[13.5px] text-ink-700 sm:col-span-2">
          <input type="checkbox" checked={f.open} onChange={(e) => set({ open: e.target.checked })} className="h-4 w-4 accent-primary-600" />
          Open — show it on the careers page and accept applications
        </label>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className={label} htmlFor="job-desc">Description — duties, requirements, salary, timings</label>
          <textarea id="job-desc" rows={6} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder={'What the person will do…\n\nRequirements:\n- …'} className="w-full rounded-lg border border-line-strong px-3 py-2 text-[14px] outline-none focus:border-primary-500" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-4 text-[13.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
          {f.id ? 'Save opening' : 'Add opening'}
        </button>
        <button type="button" onClick={onCancel} className="h-9 rounded-lg px-3 text-[13.5px] text-ink-500 hover:bg-surface-muted">Cancel</button>
      </div>
    </form>
  );
}

export default function CareersManager({
  jobs: initialJobs, applications: initialApps, jobTypes, stages,
}) {
  const router = useRouter();
  const allow = useCan();
  const [tab, setTab] = useState(initialApps.some((a) => a.stage === 'new') ? 'applications' : 'openings');
  const [jobs, setJobs] = useState(initialJobs);
  const [apps, setApps] = useState(initialApps);
  const [editing, setEditing] = useState(null); // a job, or EMPTY_JOB for a new one
  const [stage, setStage] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const say = (ok, text) => setNotice({ ok, text });

  const newCount = apps.filter((a) => a.stage === 'new').length;

  const shownApps = useMemo(() => {
    const term = q.trim().toLowerCase();
    return apps
      .filter((a) => !stage || a.stage === stage)
      .filter((a) => !jobFilter || String(a.jobId) === jobFilter)
      .filter((a) => !term || [a.name, a.email, a.phone, a.city, a.message, a.jobTitle].join(' ').toLowerCase().includes(term));
  }, [apps, stage, jobFilter, q]);

  async function call(key, url, init) {
    setBusy(key);
    const res = await fetch(url, init).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy('');
    if (!res?.ok || !data?.ok) { say(false, data?.error || 'Could not save the change.'); return false; }
    return true;
  }

  async function toggleJob(job) {
    if (await call(`job-${job.id}`, '/api/admin/careers', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: job.id, open: !job.open }),
    })) {
      setJobs((list) => list.map((j) => (j.id === job.id ? { ...j, open: !job.open } : j)));
      say(true, job.open ? 'Closed — it no longer shows on the careers page.' : 'Open — it shows on the careers page.');
    }
  }

  async function removeJob(job) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete the opening "${job.title}"? Its applications are kept. To take it off the site for now, use Close instead.`)) return;
    if (await call(`job-${job.id}`, `/api/admin/careers?job=${job.id}`, { method: 'DELETE' })) {
      setJobs((list) => list.filter((j) => j.id !== job.id));
      say(true, 'Opening deleted.');
    }
  }

  async function moveApp(app, next) {
    if (await call(`app-${app.id}`, '/api/admin/careers', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: app.id, stage: next }),
    })) {
      setApps((list) => list.map((a) => (a.id === app.id ? { ...a, stage: next } : a)));
    }
  }

  async function removeApp(app) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${app.name}'s application${app.resume ? ' and CV' : ''} for good?`)) return;
    if (await call(`app-${app.id}`, `/api/admin/careers?application=${app.id}`, { method: 'DELETE' })) {
      setApps((list) => list.filter((a) => a.id !== app.id));
      say(true, 'Application deleted.');
    }
  }

  const tabClass = (active) => cx(
    'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13.5px] font-medium transition-colors',
    active ? 'bg-white text-ink-900 shadow-sm ring-1 ring-line' : 'text-ink-500 hover:text-ink-900',
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2.5 pt-3.5 md:px-5">
          <div>
            <h1 className="text-[19px] font-bold leading-tight text-ink-900">Careers</h1>
            <p className="text-[12.5px] text-ink-400">Job openings shown on the careers page, and the applications people send.</p>
          </div>
          {tab === 'openings' && allow('careers', 'create') && !editing ? (
            <button type="button" onClick={() => setEditing(EMPTY_JOB)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 text-[13.5px] font-semibold text-white hover:bg-primary-700">
              <Plus size={15} aria-hidden="true" />
              New opening
            </button>
          ) : null}
        </div>
        <div className="border-t border-line px-4 py-2.5 md:px-5">
          <nav className="inline-flex gap-0.5 rounded-lg bg-surface-muted p-0.5" aria-label="Careers">
            <button type="button" onClick={() => setTab('openings')} className={tabClass(tab === 'openings')}>
              <Briefcase size={15} aria-hidden="true" />
              Openings
              <span className="text-[11.5px] tabular-nums text-ink-400">{jobs.filter((j) => j.open).length}/{jobs.length}</span>
            </button>
            <button type="button" onClick={() => setTab('applications')} className={tabClass(tab === 'applications')}>
              <Users size={15} aria-hidden="true" />
              Applications
              <span className="text-[11.5px] tabular-nums text-ink-400">{apps.length}</span>
              {newCount ? <span className="rounded-full bg-primary-600 px-1.5 text-[11px] font-semibold text-white">{newCount} new</span> : null}
            </button>
          </nav>
          {notice ? (
            <p role="status" className={cx('mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px]', notice.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
              {notice.text}
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="ml-auto"><X size={14} aria-hidden="true" /></button>
            </p>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------- openings */}
      {tab === 'openings' ? (
        <>
          {editing ? (
            <JobForm
              job={editing}
              jobTypes={jobTypes}
              onCancel={() => setEditing(null)}
              onError={(t) => say(false, t)}
              onSaved={(job) => {
                setJobs((list) => (list.some((j) => j.id === job.id) ? list.map((j) => (j.id === job.id ? { ...j, ...job } : j)) : [{ ...job, views: 0, createdAt: Date.now() }, ...list]));
                setEditing(null);
                say(true, 'Opening saved — the careers page is updated.');
                router.refresh();
              }}
            />
          ) : null}

          {jobs.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {jobs.map((j) => (
                <li key={j.id} className={cx('rounded-2xl border bg-white p-4 md:p-5', j.open ? 'border-line' : 'border-line bg-surface-muted/50')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[15.5px] font-semibold text-ink-900">{j.title}</h3>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink-500">
                        {j.location ? <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{j.location}</span> : null}
                        {j.jobType ? <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden="true" />{j.jobType}</span> : null}
                        {j.experience ? <span className="inline-flex items-center gap-1"><GraduationCap size={12} aria-hidden="true" />{j.experience}</span> : null}
                        {j.positions ? <span>{j.positions} post{j.positions === 1 ? '' : 's'}</span> : null}
                      </p>
                    </div>
                    <span className={cx('shrink-0 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold', j.open ? 'border-success/40 bg-success/10 text-success' : 'border-line-strong bg-white text-ink-400')}>
                      {j.open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  {j.description ? <p className="mt-2 line-clamp-3 whitespace-pre-line text-[13.5px] text-ink-500">{j.description}</p> : null}
                  <p className="mt-2 text-[12px] text-ink-400">
                    {apps.filter((a) => a.jobId === j.id).length} application(s) · added {when(j.createdAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {allow('careers', 'edit') ? (
                      <>
                        <button type="button" onClick={() => { setEditing(j); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex h-7 items-center gap-1 rounded-md border border-primary-300 px-2 text-[12px] font-medium text-primary-800 hover:bg-primary-50"><Pencil size={12} aria-hidden="true" />Edit</button>
                        <button type="button" onClick={() => toggleJob(j)} disabled={Boolean(busy)} className="inline-flex h-7 items-center gap-1 rounded-md border border-line-strong px-2 text-[12px] font-medium text-ink-700 hover:border-primary-300 disabled:opacity-50">
                          {j.open ? <EyeOff size={12} aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}
                          {j.open ? 'Close' : 'Open'}
                        </button>
                      </>
                    ) : null}
                    <button type="button" onClick={() => { setJobFilter(String(j.id)); setTab('applications'); }} className="inline-flex h-7 items-center gap-1 rounded-md border border-line-strong px-2 text-[12px] font-medium text-ink-700 hover:border-primary-300"><Users size={12} aria-hidden="true" />Applications</button>
                    {allow('careers', 'delete') ? <button type="button" onClick={() => removeJob(j)} disabled={Boolean(busy)} className="inline-flex h-7 items-center gap-1 rounded-md border border-danger/30 px-2 text-[12px] font-medium text-danger hover:bg-danger/5 disabled:opacity-50"><Trash2 size={12} aria-hidden="true" />Delete</button> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : !editing ? (
            <div className="rounded-2xl border border-line bg-white px-4 py-14 text-center">
              <Briefcase size={28} className="mx-auto text-ink-300" aria-hidden="true" />
              <p className="mt-2 font-medium text-ink-700">No openings yet</p>
              <p className="text-[13px] text-ink-400">Add one and it appears on the careers page with an Apply button.</p>
            </div>
          ) : null}
        </>
      ) : null}

      {/* --------------------------------------------------- applications */}
      {tab === 'applications' ? (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3">
            <span className="relative min-w-0 flex-1 basis-60">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email, city…" aria-label="Search applications" className="h-9 w-full rounded-lg border border-line-strong pl-9 pr-3 text-[13.5px] outline-none focus:border-primary-500" />
            </span>
            <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} aria-label="Opening" className="h-9 rounded-lg border border-line-strong px-2 text-[13px]">
              <option value="">All openings</option>
              <option value="0">General applications</option>
              {jobs.map((j) => <option key={j.id} value={String(j.id)}>{j.title}</option>)}
            </select>
            <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage" className="h-9 rounded-lg border border-line-strong px-2 text-[13px]">
              <option value="">All stages</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{`${s.label} (${apps.filter((a) => a.stage === s.id).length})`}</option>)}
            </select>
          </div>

          {shownApps.length ? (
            <ul className="space-y-3">
              {shownApps.map((a) => (
                <li key={a.id} className="rounded-2xl border border-line bg-white p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-ink-900">{a.name}</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-400">
                        Applied for <b className="font-medium text-ink-700">{a.jobTitle}</b> · {when(a.createdAt)}
                      </p>
                    </div>
                    <select
                      value={a.stage}
                      onChange={(e) => moveApp(a, e.target.value)}
                      disabled={!allow('careers', 'edit') || busy === `app-${a.id}`}
                      aria-label="Stage"
                      className={cx('h-8 rounded-full border px-2.5 text-[12.5px] font-semibold', STAGE_TONE[a.stage])}
                    >
                      {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                    <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 text-primary-700 hover:underline"><Phone size={13} aria-hidden="true" />{a.phone}</a>
                    <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 text-primary-700 hover:underline"><Mail size={13} aria-hidden="true" />{a.email}</a>
                    {a.city ? <span className="inline-flex items-center gap-1 text-ink-500"><MapPin size={13} aria-hidden="true" />{a.city}</span> : null}
                  </div>
                  {a.message ? <p className="mt-2 whitespace-pre-line rounded-lg bg-surface-muted/70 px-3 py-2 text-[13.5px] text-ink-700">{a.message}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.resume ? (
                      <a href={a.resume} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border border-primary-300 px-2 text-[12px] font-medium text-primary-800 hover:bg-primary-50">
                        <FileText size={12} aria-hidden="true" />
                        View CV
                        <ExternalLink size={11} aria-hidden="true" />
                      </a>
                    ) : <span className="inline-flex h-7 items-center text-[12px] text-ink-400">No CV attached</span>}
                    {allow('careers', 'delete') ? <button type="button" onClick={() => removeApp(a)} disabled={Boolean(busy)} className="inline-flex h-7 items-center gap-1 rounded-md border border-danger/30 px-2 text-[12px] font-medium text-danger hover:bg-danger/5 disabled:opacity-50"><Trash2 size={12} aria-hidden="true" />Delete</button> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-line bg-white px-4 py-14 text-center">
              <Users size={28} className="mx-auto text-ink-300" aria-hidden="true" />
              <p className="mt-2 font-medium text-ink-700">No applications here</p>
              <p className="text-[13px] text-ink-400">Applications from the careers page appear here with the CV attached.</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
