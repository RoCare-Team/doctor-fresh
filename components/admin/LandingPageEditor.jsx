'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Save, Loader2, CheckCircle2, AlertTriangle, Search, Type, HelpCircle, MapPin, Package, X,
  Eye, EyeOff,
} from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import VideoField from '@/components/admin/VideoField';
import SafeImage from '@/components/common/SafeImage';
import { cx } from '@/lib/utils';
import { Can, ViewOnlyNote } from '@/components/admin/AdminAccess';

const TITLE_IDEAL = 60;
const DESCRIPTION_IDEAL = 160;

const slugify = (text) => String(text || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Editing one service / city page (a `landing_pages` row): heading and URL,
 * search listing, where and what it is for, the products it shows, the page
 * copy and the FAQ. The copy is only sent when it was edited, so opening a
 * page to fix its meta title never rewrites its stored HTML.
 */
export default function LandingPageEditor({ page, families = [], products = [] }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: page.name,
    slug: page.slug,
    linkLabel: page.linkLabel,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    keywords: page.keywords,
    canonical: page.canonical,
    type: page.type,
    city: page.city,
    state: page.state,
    locality: page.locality,
    live: page.live,
  });
  const [productIds, setProductIds] = useState(page.productIds);
  const [faqs, setFaqs] = useState(page.faqs.length ? page.faqs : [{ question: '', answer: '' }]);
  const [faqsTouched, setFaqsTouched] = useState(false);
  const [redirectOld, setRedirectOld] = useState(true);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const set = (patch) => { setF((x) => ({ ...x, ...patch })); setStatus('idle'); };
  const bind = (key) => ({ value: f[key], onChange: (e) => set({ [key]: e.target.value }) });
  const slugChanged = slugify(f.slug) !== page.slug;
  const byId = new Map(products.map((p) => [Number(p.id), p]));

  async function save(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');
    const form = new FormData(event.currentTarget);

    try {
      const res = await fetch('/api/admin/service-pages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: page.id,
          ...f,
          slug: slugify(f.slug),
          productIds,
          videoUrl: form.get('videoUrl') ?? '',
          redirectOld: slugChanged && redirectOld,
          ...(form.get('pageContentHtmlChanged') ? { pageContentHtml: form.get('pageContentHtml') } : {}),
          ...(faqsTouched ? { faqs: faqs.filter((q) => q.question.trim() && q.answer.trim()) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save.');
      setStatus('saved');
      setFaqsTouched(false);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  const editFaq = (index, patch) => {
    setFaqs((list) => list.map((q, i) => (i === index ? { ...q, ...patch } : q)));
    setFaqsTouched(true);
    setStatus('idle');
  };

  const input = 'h-11 w-full rounded-xl border border-line-strong bg-white px-3.5 text-[14.5px] outline-none focus:border-primary-500';

  return (
    <form onSubmit={save} className="space-y-5 pb-24">
      {/* ------------------------------------------------------------ status */}
      <section className={cx('flex flex-wrap items-center gap-3 rounded-2xl border p-4', f.live ? 'border-success/30 bg-success/5' : 'border-warning/40 bg-warning/5')}>
        <span className={cx('flex h-9 w-9 items-center justify-center rounded-lg', f.live ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
          {f.live ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink-900">{f.live ? 'Live on the website' : 'Hidden from the website'}</p>
          <p className="text-[13px] text-ink-500">{f.live ? 'Visitors and Google can open this page.' : 'The address shows the not-found page until it is made live again.'}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={f.live}
          onClick={() => set({ live: !f.live })}
          className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', f.live ? 'bg-success' : 'bg-ink-300')}
        >
          <span className="sr-only">Page is live</span>
          <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', f.live ? 'left-6' : 'left-1')} />
        </button>
      </section>

      {/* ------------------------------------------------------------ basics */}
      <Card icon={Type} title="Heading & address" hint="The large heading on the page and where it lives.">
        <Label text="Page heading" />
        <input {...bind('name')} maxLength={255} required className={input} />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <Label text="URL" />
            <div className="flex h-11 items-center overflow-hidden rounded-xl border border-line-strong bg-white focus-within:border-primary-500">
              <span className="border-r border-line bg-surface-muted px-3 py-3 text-[13px] text-ink-400">doctorfresh.in/</span>
              <input {...bind('slug')} maxLength={255} className="h-full min-w-0 flex-1 px-3 font-mono text-[13.5px] outline-none" />
            </div>
          </label>
          <label className="block">
            <Label text="Link name" />
            <input {...bind('linkLabel')} maxLength={350} placeholder={f.name} className={input} />
            <span className="mt-1 block text-[12px] text-ink-400">Used when other pages link here (“nearby cities”).</span>
          </label>
        </div>

        {slugChanged ? (
          <label className="mt-3 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/5 p-3 text-[13.5px] text-ink-700">
            <input type="checkbox" checked={redirectOld} onChange={(e) => setRedirectOld(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary-500" />
            <span>
              {'Redirect the old address '}
              <span className="font-mono font-medium">{`/${page.slug}`}</span>
              {' to the new one (301), so existing links and Google results keep working.'}
            </span>
          </label>
        ) : null}
      </Card>

      {/* ---------------------------------------------------- search listing */}
      <Card icon={Search} title="Search listing" hint="What Google shows for this page.">
        <Label text="Meta title" count={f.metaTitle.length} ideal={TITLE_IDEAL} />
        <input {...bind('metaTitle')} maxLength={255} placeholder={f.name} className={input} />

        <div className="mt-4">
          <Label text="Meta description" count={f.metaDescription.length} ideal={DESCRIPTION_IDEAL} />
          <textarea {...bind('metaDescription')} maxLength={1000} rows={3} className={cx(input, 'h-auto resize-y py-2.5 leading-relaxed')} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <Label text="Meta keywords" />
            <input {...bind('keywords')} maxLength={255} className={input} />
          </label>
          <label className="block">
            <Label text="Canonical URL" />
            <input {...bind('canonical')} maxLength={255} placeholder="Leave empty — the page itself" className={input} />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-white p-4">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-300">Google preview</p>
          <p className="mt-2 truncate text-[13px] text-ink-500">{`www.doctorfresh.in › ${slugify(f.slug)}`}</p>
          <p className="mt-0.5 line-clamp-1 text-[18px] leading-snug text-[#1a0dab]">{f.metaTitle || f.name}</p>
          <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-[#4d5156]">
            {f.metaDescription || 'Add a meta description — without one, Google picks a line from the page.'}
          </p>
        </div>
      </Card>

      {/* ----------------------------------------------------------- details */}
      <Card icon={MapPin} title="Service & place" hint="Groups the page with others of its kind and fills the “nearby” links.">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <Label text="Service type" />
            <input {...bind('type')} list="df-service-types" maxLength={350} className={input} />
            <datalist id="df-service-types">
              {families.map((fam) => <option key={fam.type} value={fam.type} />)}
            </datalist>
          </label>
          <label className="block">
            <Label text="City" />
            <input {...bind('city')} maxLength={350} className={input} />
          </label>
          <label className="block">
            <Label text="State" />
            <input {...bind('state')} maxLength={350} className={input} />
          </label>
          <label className="block">
            <Label text="Locality" />
            <input {...bind('locality')} maxLength={300} placeholder="Only for area pages" className={input} />
          </label>
        </div>
      </Card>

      {/* ---------------------------------------------------------- products */}
      <Card icon={Package} title="Products on this page" hint="The product slider shown on the page, in this order.">
        <div className="flex flex-wrap gap-2">
          {productIds.map((id) => {
            const p = byId.get(Number(id));
            return (
              <span key={id} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-surface-muted/50 py-1 pl-1 pr-2">
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white">
                  {p?.image ? <SafeImage src={p.image} alt="" fill sizes="32px" className="object-contain p-0.5" iconSize={12} /> : null}
                </span>
                <span className="truncate text-[13px] text-ink-700">{p ? p.name : `Product #${id} (not found)`}</span>
                <button
                  type="button"
                  onClick={() => { setProductIds((l) => l.filter((x) => x !== id)); setStatus('idle'); }}
                  aria-label={`Remove ${p?.name || id}`}
                  className="rounded p-0.5 text-ink-300 hover:bg-danger/10 hover:text-danger"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </span>
            );
          })}
          {!productIds.length ? <p className="text-[13.5px] text-ink-400">No products — the slider is hidden.</p> : null}
        </div>
        <select
          value=""
          onChange={(e) => { const id = Number(e.target.value); if (id && !productIds.includes(id)) setProductIds((l) => [...l, id]); setStatus('idle'); }}
          className={cx(input, 'mt-3 cursor-pointer md:w-96')}
          aria-label="Add a product"
        >
          <option value="">+ Add a product…</option>
          {products.filter((p) => !productIds.includes(Number(p.id))).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Card>

      {/* ------------------------------------------------------------- video */}
      <section className="rounded-2xl border border-line bg-white p-5">
        <VideoField
          name="videoUrl"
          label="Page video"
          hint="Shown near the top of the page, under the introduction."
          defaultValue={page.videoUrl}
        />
      </section>

      {/* ------------------------------------------------------ page content */}
      <section className="rounded-2xl border border-line bg-white p-5">
        <RichTextEditor
          name="pageContentHtml"
          label="Page content"
          hint="The article on the page — headings here become its sections."
          defaultValue={page.pageContentHtml}
          placeholder="Write about this service: what is included, prices, why choose us…"
          minHeight="min-h-80"
        />
      </section>

      {/* --------------------------------------------------------------- FAQ */}
      <Card icon={HelpCircle} title="Frequently asked questions" hint="Shown on the page and given to Google as FAQ markup.">
        {page.usesNewFaqs ? (
          <p className="mb-3 rounded-lg bg-primary-50 px-3 py-2 text-[13px] text-primary-800">
            These questions were saved as ready-made HTML by the old panel. Editing them here saves them as a normal list.
          </p>
        ) : null}
        <div className="space-y-3">
          {faqs.map((q, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className="rounded-xl border border-line bg-surface-muted/50 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[12px] font-semibold text-primary-700">{index + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={q.question}
                    onChange={(e) => editFaq(index, { question: e.target.value })}
                    placeholder="Question"
                    aria-label={`Question ${index + 1}`}
                    className="h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] font-medium outline-none focus:border-primary-500"
                  />
                  <textarea
                    value={q.answer}
                    onChange={(e) => editFaq(index, { answer: e.target.value })}
                    rows={3}
                    placeholder="Answer"
                    aria-label={`Answer ${index + 1}`}
                    className="w-full resize-y rounded-lg border border-line-strong bg-white px-3 py-2 text-[14px] leading-relaxed outline-none focus:border-primary-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setFaqs((l) => (l.length > 1 ? l.filter((_, i) => i !== index) : [{ question: '', answer: '' }])); setFaqsTouched(true); setStatus('idle'); }}
                  aria-label={`Remove question ${index + 1}`}
                  className="mt-1.5 rounded-lg p-2 text-ink-300 transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setFaqs((l) => [...l, { question: '', answer: '' }]); }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3.5 py-2 text-[13.5px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-700"
        >
          <Plus size={15} aria-hidden="true" />
          Add a question
        </button>
      </Card>

      {/* ----------------------------------------------------- save bar */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Can section="service_pages" action="edit" fallback={<ViewOnlyNote />}>
          <button
              type="submit"
              disabled={status === 'saving'}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-500 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-ink-900 disabled:opacity-70"
            >
              {status === 'saving' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
              {status === 'saving' ? 'Saving…' : 'Save page'}
            </button>
          </Can>
          {status === 'saved' ? (
            <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-success">
              <CheckCircle2 size={16} aria-hidden="true" />
              Saved — the page on the website is updated.
            </span>
          ) : null}
          {status === 'error' ? (
            <span className="inline-flex items-center gap-1.5 text-[14px] text-danger">
              <AlertTriangle size={16} aria-hidden="true" />
              {error}
            </span>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function Card({
  icon: Icon, title, hint, children,
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
          <Icon size={17} aria-hidden="true" />
        </span>
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
