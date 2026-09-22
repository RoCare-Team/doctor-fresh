'use client';

import { useRef, useState } from 'react';
import {
  MapPin, Clock, GraduationCap, Users, ChevronDown, Paperclip, Loader2, CheckCircle2, X, Send,
} from 'lucide-react';
import { cx } from '@/lib/utils';

const field = 'h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[14.5px] outline-none transition-colors focus:border-primary-500';

/** The application form — for one opening, or a general application (jobId 0). */
function ApplyForm({ job, onClose }) {
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (file && file.size > 4 * 1024 * 1024) { setError('The CV must be 4 MB or smaller.'); setStatus('error'); return; }
    setStatus('sending');
    setError('');
    const body = new FormData(form);
    body.set('jobId', String(job?.id || 0));
    try {
      const res = await fetch('/api/careers/apply', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not send your application.');
      setStatus('done');
      form.reset();
      setFileName('');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-5 text-center">
        <CheckCircle2 size={28} className="mx-auto text-success" aria-hidden="true" />
        <p className="mt-2 text-[15.5px] font-semibold text-ink-900">Application sent</p>
        <p className="mt-1 text-[14px] text-ink-500">Thank you — our team will call you if your profile matches.</p>
        {onClose ? <button type="button" onClick={onClose} className="mt-3 text-[13.5px] font-medium text-primary-700 hover:underline">Close</button> : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      {/* not shown to people — catches bots that fill every field */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <input name="name" required maxLength={100} placeholder="Full name *" aria-label="Full name" autoComplete="name" className={field} />
      <input name="phone" required inputMode="numeric" maxLength={14} placeholder="Mobile number *" aria-label="Mobile number" autoComplete="tel" className={field} />
      <input name="email" type="email" required maxLength={120} placeholder="Email *" aria-label="Email" autoComplete="email" className={field} />
      <input name="city" required maxLength={50} placeholder="Your city *" aria-label="City" autoComplete="address-level2" className={field} />
      <textarea
        name="message"
        rows={3}
        maxLength={5000}
        placeholder="Tell us about your experience (optional)"
        aria-label="About you"
        className="w-full rounded-lg border border-line-strong bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-primary-500 sm:col-span-2"
      />
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong bg-white px-3 py-2.5 text-[14px] text-ink-500 hover:border-primary-400 sm:col-span-2">
        <Paperclip size={16} className="shrink-0 text-primary-700" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{fileName || 'Attach your CV — PDF, Word or photo, up to 4 MB'}</span>
        <input
          ref={fileRef}
          type="file"
          name="resume"
          accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
        />
      </label>
      {status === 'error' ? <p role="alert" className="text-[13.5px] text-danger sm:col-span-2">{error}</p> : null}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          {status === 'sending' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          {status === 'sending' ? 'Sending…' : 'Submit application'}
        </button>
        {onClose ? <button type="button" onClick={onClose} className="h-11 rounded-lg px-3 text-[14px] text-ink-500 hover:bg-surface-muted">Cancel</button> : null}
      </div>
    </form>
  );
}

function JobCard({ job }) {
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const long = job.description.length > 220;

  return (
    <li className="rounded-2xl border border-line bg-white p-5 shadow-[0_10px_30px_-26px_rgb(6_59_76/0.6)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[18px] font-semibold text-ink-900">{job.title}</h3>
          <p className="mt-2 flex flex-wrap gap-2 text-[13px]">
            {job.location ? <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-ink-700"><MapPin size={13} aria-hidden="true" />{job.location}</span> : null}
            {job.jobType ? <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-ink-700"><Clock size={13} aria-hidden="true" />{job.jobType}</span> : null}
            {job.experience ? <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-ink-700"><GraduationCap size={13} aria-hidden="true" />{job.experience}</span> : null}
            {job.positions ? <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-primary-800"><Users size={13} aria-hidden="true" />{job.positions} opening{job.positions === 1 ? '' : 's'}</span> : null}
          </p>
        </div>
        {!applying ? (
          <button type="button" onClick={() => setApplying(true)} className="inline-flex h-10 items-center rounded-lg bg-primary-600 px-4 text-[14px] font-semibold text-white hover:bg-primary-700">
            Apply now
          </button>
        ) : null}
      </div>

      {job.description ? (
        <div className="mt-3">
          <p className={cx('whitespace-pre-line text-[14.5px] leading-relaxed text-ink-500', !open && long && 'line-clamp-3')}>{job.description}</p>
          {long ? (
            <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 inline-flex items-center gap-1 text-[13.5px] font-medium text-primary-700 hover:underline">
              {open ? 'Show less' : 'Read full details'}
              <ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}

      {applying ? (
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[15px] font-semibold text-ink-900">{`Apply for ${job.title}`}</p>
            <button type="button" onClick={() => setApplying(false)} aria-label="Close" className="rounded p-1 text-ink-300 hover:text-ink-700"><X size={16} aria-hidden="true" /></button>
          </div>
          <ApplyForm job={job} onClose={() => setApplying(false)} />
        </div>
      ) : null}
    </li>
  );
}

export default function CareersBoard({ jobs, openingsTitle, openingsText }) {
  return (
    <div className="space-y-8">
      {jobs.length ? (
        <section>
          <h2 className="mb-4 text-[20px] font-semibold text-ink-900">
            {openingsTitle || 'Current openings'}
            <span className="ml-2 text-[15px] font-normal text-ink-400">({jobs.length})</span>
          </h2>
          <ul className="space-y-4">
            {jobs.map((j) => <JobCard key={j.id} job={j} />)}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-surface-muted px-5 py-7 md:px-8">
        <div className="max-w-2xl">
          <h2 className="text-[19px] font-semibold text-ink-900">
            {jobs.length ? 'Don’t see the right role?' : (openingsTitle || 'Current openings')}
          </h2>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-500">
            {jobs.length
              ? 'Send us your CV anyway — we will get in touch when a suitable role opens in your area.'
              : openingsText}
          </p>
        </div>
        <div className="mt-5 max-w-3xl">
          <ApplyForm job={null} />
        </div>
      </section>
    </div>
  );
}
