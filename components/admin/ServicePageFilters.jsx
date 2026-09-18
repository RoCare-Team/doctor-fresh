'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

/** Search, service type and status for the service pages list — kept in the URL. */
export default function ServicePageFilters({ families, value }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const go = (patch) => {
    const next = { ...value, ...patch };
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v) p.set(k, v); });
    start(() => router.push(`/admin/service-pages${p.toString() ? `?${p}` : ''}`));
  };

  const control = 'h-10 rounded-xl border border-line-strong bg-white px-3 text-[14px] text-ink-900 outline-none focus:border-primary-500';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative min-w-0 flex-1 basis-60"
        onSubmit={(e) => { e.preventDefault(); go({ q: new FormData(e.currentTarget).get('q')?.toString().trim() || '' }); }}
      >
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
        <input
          name="q"
          defaultValue={value.q}
          placeholder="Search URL, heading, city…"
          aria-label="Search pages"
          className={`${control} w-full pl-9`}
        />
      </form>
      <select value={value.type} onChange={(e) => go({ type: e.target.value })} aria-label="Service type" className={`${control} max-w-64 cursor-pointer`}>
        <option value="">All service types</option>
        <option value="__national">National pages (one per service)</option>
        {families.filter((f) => f.pages > 1).map((f) => (
          <option key={f.type} value={f.type}>{`${f.type || '(none)'} · ${f.pages.toLocaleString('en-IN')}`}</option>
        ))}
      </select>
      <select value={value.status} onChange={(e) => go({ status: e.target.value })} aria-label="Status" className={`${control} cursor-pointer`}>
        <option value="">Live & hidden</option>
        <option value="live">Live only</option>
        <option value="hidden">Hidden only</option>
      </select>
      {pending ? <Loader2 size={18} className="animate-spin text-primary-500" aria-label="Loading" /> : null}
    </div>
  );
}
