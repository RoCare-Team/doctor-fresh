'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Type, Images, Save, Loader2, CheckCircle2, AlertTriangle, Upload, Trash2, ArrowUp, ArrowDown,
  ExternalLink, Link2, RotateCcw,
} from 'lucide-react';
import { uploadMedia } from '@/components/admin/editor/uploadMedia';
import { Can, ViewOnlyNote } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

const TITLE_IDEAL = 60;
const DESCRIPTION_IDEAL = 160;

/** Home page: its search listing, the hero banner's copy and its pictures. */
export default function HomeContentEditor({ content, defaults, quickLinkCount = 0 }) {
  const router = useRouter();
  const [f, setF] = useState(content);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState('');
  const bannerRef = useRef(null);
  const ogRef = useRef(null);

  const set = (patch) => { setF((x) => ({ ...x, ...patch })); setStatus('idle'); };
  const bind = (key) => ({ value: f[key] || '', onChange: (e) => set({ [key]: e.target.value }) });

  async function upload(file, target) {
    if (!file) return;
    setUploading(target);
    setError('');
    try {
      const url = await uploadMedia(file, { folder: 'home' });
      if (target === 'og') set({ ogImage: url });
      else set({ banners: [...(f.banners || []), url] });
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading('');
      if (bannerRef.current) bannerRef.current.value = '';
      if (ogRef.current) ogRef.current.value = '';
    }
  }

  const moveBanner = (i, to) => {
    const list = [...(f.banners || [])];
    if (to < 0 || to >= list.length) return;
    const [item] = list.splice(i, 1);
    list.splice(to, 0, item);
    set({ banners: list });
  };

  async function save() {
    setStatus('saving');
    setError('');
    const res = await fetch('/api/admin/home', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not save.'); setStatus('error'); return; }
    setF(data.content);
    setStatus('saved');
    router.refresh();
  }

  const input = 'h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-[14.5px] outline-none focus:border-primary-500';

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Home page</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-400">The home page’s Google listing and the big banner at the top. Saved changes show on the site at once.</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-medium text-ink-700 hover:border-primary-500 hover:text-primary-700">
          View home page
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      {/* ------------------------------------------------------------- SEO */}
      <Card icon={Search} title="Search listing (SEO)" hint="What Google and social apps show for doctorfresh.in.">
        <Label text="Meta title" count={(f.metaTitle || '').length} ideal={TITLE_IDEAL} />
        <input {...bind('metaTitle')} maxLength={200} className={input} />
        <div className="mt-4">
          <Label text="Meta description" count={(f.metaDescription || '').length} ideal={DESCRIPTION_IDEAL} />
          <textarea {...bind('metaDescription')} maxLength={400} rows={3} className={cx(input, 'h-auto resize-y py-2.5 leading-relaxed')} />
        </div>
        <div className="mt-4">
          <Label text="Meta keywords" />
          <input {...bind('keywords')} maxLength={200} placeholder="water purifier, RO service, …" className={input} />
        </div>

        <div className="mt-4 rounded-xl border border-line bg-white p-4">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-300">Google preview</p>
          <p className="mt-2 text-[13px] text-ink-500">www.doctorfresh.in</p>
          <p className="mt-0.5 line-clamp-1 text-[18px] leading-snug text-[#1a0dab]">{f.metaTitle}</p>
          <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-[#4d5156]">{f.metaDescription}</p>
        </div>

        <div className="mt-4">
          <Label text="Share image (WhatsApp, Facebook, X)" />
          <div className="flex flex-wrap items-center gap-3">
            {f.ogImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.ogImage} alt="" className="h-20 w-36 rounded-lg border border-line object-cover" />
            ) : null}
            <button type="button" onClick={() => ogRef.current?.click()} disabled={Boolean(uploading)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary-500 px-3.5 text-[13.5px] font-semibold text-primary-700 hover:bg-primary-50">
              {uploading === 'og' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Upload size={15} aria-hidden="true" />}
              {f.ogImage ? 'Change image' : 'Upload image'}
            </button>
            <span className="text-[12.5px] text-ink-400">1200×630 works best.</span>
            <input ref={ogRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0], 'og')} />
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------- hero */}
      <Card icon={Type} title="Banner text" hint="The words and buttons over the big banner at the top of the home page.">
        <Label text="Small line above the heading" />
        <input {...bind('eyebrow')} maxLength={80} className={input} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block"><Label text="Heading — first part" /><input {...bind('headingLine1')} maxLength={80} className={input} /></label>
          <label className="block"><Label text="Heading — coloured part" /><input {...bind('headingLine2')} maxLength={80} className={input} /></label>
        </div>
        <div className="mt-4">
          <Label text="Intro" count={(f.intro || '').length} />
          <textarea {...bind('intro')} maxLength={400} rows={3} className={cx(input, 'h-auto resize-y py-2.5 leading-relaxed')} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line p-3">
            <p className="mb-2 text-[13px] font-semibold text-ink-900">Main button</p>
            <input {...bind('primaryLabel')} maxLength={40} placeholder="Label" className={input} />
            <input {...bind('primaryHref')} maxLength={300} placeholder="/category/water-purifier" className={cx(input, 'mt-2 font-mono text-[13px]')} />
          </div>
          <div className="rounded-xl border border-line p-3">
            <p className="mb-2 text-[13px] font-semibold text-ink-900">Second button</p>
            <input {...bind('secondaryLabel')} maxLength={40} placeholder="Label" className={input} />
            <input {...bind('secondaryHref')} maxLength={300} placeholder="#water-test" className={cx(input, 'mt-2 font-mono text-[13px]')} />
          </div>
        </div>
        <p className="mt-2 text-[12.5px] text-ink-400">Links start with / (a page on this site), # (a part of the home page) or https://.</p>
      </Card>

      {/* ---------------------------------------------------------- banners */}
      <Card icon={Images} title="Banner pictures" hint="They change every 5 seconds. Keep the left third plain — the text sits there on a computer screen. About 1920×700.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {(f.banners || []).map((src, i) => (
            <li key={`${src}-${i}`} className="overflow-hidden rounded-xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-[16/6] w-full object-cover" />
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span className="flex-1 text-[12.5px] text-ink-400">{`Banner ${i + 1}`}</span>
                <button type="button" onClick={() => moveBanner(i, i - 1)} disabled={!i} aria-label="Move earlier" className="rounded p-1.5 text-ink-400 hover:bg-surface-muted disabled:opacity-30"><ArrowUp size={15} aria-hidden="true" /></button>
                <button type="button" onClick={() => moveBanner(i, i + 1)} disabled={i === f.banners.length - 1} aria-label="Move later" className="rounded p-1.5 text-ink-400 hover:bg-surface-muted disabled:opacity-30"><ArrowDown size={15} aria-hidden="true" /></button>
                <button type="button" onClick={() => set({ banners: f.banners.filter((_, k) => k !== i) })} disabled={f.banners.length < 2} aria-label="Remove banner" className="rounded p-1.5 text-danger hover:bg-danger/10 disabled:opacity-30"><Trash2 size={15} aria-hidden="true" /></button>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => bannerRef.current?.click()} disabled={Boolean(uploading)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-[14px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
          {uploading === 'banner' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Upload size={15} aria-hidden="true" />}
          Add banner picture
        </button>
        <input ref={bannerRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0], 'banner')} />
      </Card>

      {/* ------------------------------------------------------ quick links */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><Link2 size={17} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink-900">Quick Links at the bottom of the home page</p>
          <p className="text-[13px] text-ink-400">{quickLinkCount ? `${quickLinkCount} section${quickLinkCount === 1 ? '' : 's'} showing now.` : 'None yet — nothing shows until a section is added.'}</p>
        </div>
        <Link href="/admin/quick-links" className="inline-flex h-10 items-center rounded-lg border border-line-strong px-4 text-[14px] font-medium text-ink-700 hover:border-primary-500 hover:text-primary-700">Manage quick links</Link>
      </section>

      {/* -------------------------------------------------------- save bar */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Can section="home" action="edit" fallback={<ViewOnlyNote />}>
            <button type="button" onClick={save} disabled={status === 'saving' || Boolean(uploading)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-500 px-6 text-[15px] font-semibold text-white hover:bg-ink-900 disabled:opacity-70">
              {status === 'saving' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
              {status === 'saving' ? 'Saving…' : 'Save home page'}
            </button>
            <button type="button" onClick={() => set({ ...defaults })} className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13.5px] text-ink-500 hover:bg-surface-muted">
              <RotateCcw size={14} aria-hidden="true" />
              Original copy
            </button>
          </Can>
          {status === 'saved' ? <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-success"><CheckCircle2 size={16} aria-hidden="true" />Saved — the home page is updated.</span> : null}
          {error ? <span className="inline-flex items-center gap-1.5 text-[14px] text-danger"><AlertTriangle size={16} aria-hidden="true" />{error}</span> : null}
        </div>
      </div>
    </div>
  );
}

function Card({
  icon: Icon, title, hint, children,
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><Icon size={17} aria-hidden="true" /></span>
        <div>
          <h2 className="text-[16px] font-semibold text-ink-900">{title}</h2>
          {hint ? <p className="mt-0.5 text-[13px] text-ink-400">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Label({ text, count, ideal }) {
  const over = ideal && count > ideal;
  return (
    <span className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-[14px] font-medium text-ink-800">{text}</span>
      {count !== undefined ? (
        <span className={cx('text-[12.5px] tabular-nums', over ? 'font-semibold text-warning' : 'text-ink-300')}>
          {ideal ? `${count} / ${ideal}` : count}
          {over ? ' · may be cut off in Google' : ''}
        </span>
      ) : null}
    </span>
  );
}
