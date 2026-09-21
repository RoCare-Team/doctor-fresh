'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu, LayoutTemplate, FileText, PanelBottom, Scale, Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2,
  CheckCircle2, AlertTriangle, Upload, ExternalLink,
} from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { uploadMedia } from '@/components/admin/editor/uploadMedia';
import { Can, ViewOnlyNote } from '@/components/admin/AdminAccess';
import { cx } from '@/lib/utils';

const TABS = [
  { id: 'nav', label: 'Header menu', icon: Menu },
  { id: 'home_sections', label: 'Home sections', icon: LayoutTemplate },
  { id: 'pages', label: 'Contact · Partner · Careers', icon: FileText },
  { id: 'footer', label: 'Footer', icon: PanelBottom },
  { id: 'legal', label: 'Legal pages', icon: Scale },
];

const input = 'h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-primary-500';

/**
 * Site content: every piece of copy that used to be written into the code —
 * header menu, home sections, the contact / partner / careers pages, the
 * footer and the policy pages. Each tab saves to the database on its own.
 */
export default function SiteContentEditor({ initial, legal }) {
  const [tab, setTab] = useState('nav');

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[22px] font-semibold text-ink-900">Site content</h1>
      <p className="mt-0.5 text-[13.5px] text-ink-400">The menu, home sections, page text, footer and policy pages — saved in the database and shown on the site at once.</p>

      <nav className="mt-4 flex flex-wrap gap-1 border-b border-line" aria-label="Site content">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cx('relative inline-flex items-center gap-2 px-3.5 py-2.5 text-[14px] font-medium', tab === id ? 'text-primary-700' : 'text-ink-400 hover:text-ink-700')}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
            {tab === id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary-500" /> : null}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {tab === 'legal' ? <LegalEditor pages={legal} /> : <ContentForm key={tab} sectionKey={tab} initial={initial[tab]} />}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- content */

function ContentForm({ sectionKey, initial }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const set = (patch) => { setV((x) => ({ ...x, ...patch })); setStatus('idle'); };

  async function save() {
    setStatus('saving');
    setError('');
    const res = await fetch('/api/admin/content', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: sectionKey, value: v }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not save.'); setStatus('error'); return; }
    setV(data.value);
    setStatus('saved');
    router.refresh();
  }

  return (
    <div className="space-y-5 pb-24">
      {sectionKey === 'nav' ? <NavFields v={v} set={set} /> : null}
      {sectionKey === 'home_sections' ? <HomeFields v={v} set={set} /> : null}
      {sectionKey === 'pages' ? <PageFields v={v} set={set} /> : null}
      {sectionKey === 'footer' ? (
        <Card title="Newsletter strip" hint="The band at the top of the footer, on every page.">
          <Field label="Heading" value={v.newsletterTitle} onChange={(x) => set({ newsletterTitle: x })} />
          <Field label="Text" value={v.newsletterText} onChange={(x) => set({ newsletterText: x })} long />
          <p className="text-[12.5px] text-ink-400">Contact details, address and the footer about text are in Settings; the service and city links come from the service pages.</p>
        </Card>
      ) : null}

      <SaveBar status={status} error={error} onSave={save} />
    </div>
  );
}

function NavFields({ v, set }) {
  return (
    <>
      <LinkList title="Menu links" hint="The row of links under the logo, left to right. Links start with / (a page on this site) or https://." items={v.items || []} onChange={(items) => set({ items })} />
      <LinkList title="Phone menu — extra links" hint="Shown in the phone menu under the category list." items={v.mobileItems || []} onChange={(mobileItems) => set({ mobileItems })} />
      <Card title="Button at the end of the menu">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Label" value={v.ctaLabel} onChange={(x) => set({ ctaLabel: x })} />
          <Field label="Link" value={v.ctaHref} onChange={(x) => set({ ctaHref: x })} mono />
        </div>
      </Card>
    </>
  );
}

function LinkList({
  title, hint, items, onChange,
}) {
  const set = ({ items: next }) => onChange(next);
  const update = (i, patch) => set({ items: items.map((it, k) => (k === i ? { ...it, ...patch } : it)) });
  const move = (i, to) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(to, 0, x);
    set({ items: next });
  };
  return (
    <>
      <Card title={title} hint={hint}>
        <ul className="space-y-2">
          {items.map((it, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-muted/40 p-2">
              <span className="w-6 text-center text-[12.5px] text-ink-300">{i + 1}</span>
              <input value={it.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Label" aria-label={`Menu label ${i + 1}`} className={cx(input, 'min-w-0 flex-1 basis-40')} />
              <input value={it.href} onChange={(e) => update(i, { href: e.target.value })} placeholder="/category/…" aria-label={`Menu link ${i + 1}`} className={cx(input, 'min-w-0 flex-1 basis-56 font-mono text-[13px]')} />
              <IconBtn label="Move up" icon={ArrowUp} onClick={() => move(i, i - 1)} disabled={!i} />
              <IconBtn label="Move down" icon={ArrowDown} onClick={() => move(i, i + 1)} disabled={i === items.length - 1} />
              <IconBtn label="Remove" icon={Trash2} danger onClick={() => set({ items: items.filter((_, k) => k !== i) })} />
            </li>
          ))}
        </ul>
        <AddBtn label="Add link" onClick={() => set({ items: [...items, { label: '', href: '/' }] })} disabled={items.length >= 16} />
      </Card>
    </>
  );
}

function IconList({ list, field, onChange, addLabel }) {
  const [busy, setBusy] = useState(-1);
  const fileRef = useRef(null);
  const target = useRef(-1);
  const update = (i, patch) => onChange(list.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  async function upload(file) {
    if (!file) return;
    setBusy(target.current);
    try {
      update(target.current, { icon: await uploadMedia(file, { folder: 'home' }) });
    } catch {
      // eslint-disable-next-line no-alert
      window.alert('The icon could not be uploaded.');
    } finally {
      setBusy(-1);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((it, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={i} className="flex items-center gap-2 rounded-xl border border-line bg-white p-2">
            <button
              type="button"
              onClick={() => { target.current = i; fileRef.current?.click(); }}
              title="Change icon"
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-surface-muted hover:border-primary-400"
            >
              {busy === i ? <Loader2 size={16} className="animate-spin text-primary-500" aria-hidden="true" />
                // eslint-disable-next-line @next/next/no-img-element
                : it.icon ? <img src={it.icon} alt="" className="h-9 w-9 object-contain" /> : <Upload size={16} className="text-ink-300" aria-hidden="true" />}
            </button>
            <input value={it[field]} onChange={(e) => update(i, { [field]: e.target.value })} aria-label={`Text ${i + 1}`} className={cx(input, 'min-w-0 flex-1')} />
            <IconBtn label="Remove" icon={Trash2} danger onClick={() => onChange(list.filter((_, k) => k !== i))} />
          </li>
        ))}
      </ul>
      <AddBtn label={addLabel} onClick={() => onChange([...list, { icon: '', [field]: '' }])} disabled={list.length >= 12} />
      <p className="mt-1 text-[12px] text-ink-400">Click an icon to replace it. Square PNG/WebP, about 96×96.</p>
    </>
  );
}

function HomeFields({ v, set }) {
  return (
    <>
      <Card title="Trust badges" hint="The strip of promises under the home banner.">
        <IconList list={v.trustBadges || []} field="title" onChange={(trustBadges) => set({ trustBadges })} addLabel="Add badge" />
      </Card>
      <Card title="Free water test section" hint="The water test band on the home page with its booking form.">
        <Field label="Section heading" value={v.waterTitle} onChange={(x) => set({ waterTitle: x })} />
        <Field label="Form heading" value={v.waterFormTitle} onChange={(x) => set({ waterFormTitle: x })} />
        <p className="mb-2 mt-1 text-[13.5px] font-medium text-ink-800">What the test checks</p>
        <IconList list={v.waterParameters || []} field="label" onChange={(waterParameters) => set({ waterParameters })} addLabel="Add parameter" />
      </Card>
      <Card title="Banner highlights (phones)" hint="The three small promises under the banner buttons on a phone.">
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Field
              key={i}
              label={`Highlight ${i + 1}`}
              value={(v.highlights || [])[i] || ''}
              onChange={(x) => { const h = [...(v.highlights || ['', '', ''])]; h[i] = x; set({ highlights: h }); }}
            />
          ))}
        </div>
      </Card>
    </>
  );
}

function PageFields({ v, set }) {
  const f = (key, label, extra = {}) => <Field label={label} value={v[key]} onChange={(x) => set({ [key]: x })} {...extra} />;
  return (
    <>
      <Card title="Contact Us page" link="/contact">
        {f('contactMetaTitle', 'Meta title')}
        {f('contactMetaDescription', 'Meta description', { long: true })}
        {f('contactHeading', 'Page heading')}
        {f('contactIntro', 'Intro under the heading', { long: true })}
        <div className="grid gap-3 md:grid-cols-2">
          {f('contactFormTitle', 'Form heading')}
          {f('contactOtherInfoTitle', 'Contact details heading')}
        </div>
      </Card>
      <Card title="Become a Partner page" link="/partner">
        {f('partnerMetaTitle', 'Meta title')}
        {f('partnerMetaDescription', 'Meta description', { long: true })}
        {f('partnerHeading', 'Page heading')}
        {f('partnerIntro', 'Intro under the heading', { long: true })}
        <p className="mb-1.5 text-[13.5px] font-medium text-ink-800">Benefit cards</p>
        <div className="grid gap-2 md:grid-cols-2">
          {(v.partnerBenefits || []).map((b, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="space-y-1.5 rounded-xl border border-line p-2">
              <input value={b.title} onChange={(e) => set({ partnerBenefits: v.partnerBenefits.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)) })} placeholder="Title" aria-label={`Benefit ${i + 1} title`} className={input} />
              <textarea value={b.text} onChange={(e) => set({ partnerBenefits: v.partnerBenefits.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)) })} rows={2} placeholder="Text" aria-label={`Benefit ${i + 1} text`} className={cx(input, 'h-auto resize-y py-2')} />
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {f('partnerAsideTitle', 'Side box heading')}
          {f('partnerAsideText', 'Side box text')}
        </div>
        <p className="mb-1.5 text-[13.5px] font-medium text-ink-800">Partnership types (tabs on the form)</p>
        <div className="space-y-2">
          {(v.partnerTabs || []).map((t, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="flex gap-2">
              <input value={t} onChange={(e) => set({ partnerTabs: v.partnerTabs.map((x, k) => (k === i ? e.target.value : x)) })} aria-label={`Tab ${i + 1}`} className={input} />
              <IconBtn label="Remove" icon={Trash2} danger onClick={() => set({ partnerTabs: v.partnerTabs.filter((_, k) => k !== i) })} disabled={v.partnerTabs.length < 2} />
            </div>
          ))}
        </div>
        <AddBtn label="Add type" onClick={() => set({ partnerTabs: [...(v.partnerTabs || []), ''] })} disabled={(v.partnerTabs || []).length >= 6} />
      </Card>
      <Card title="Careers page" link="/careers">
        {f('careersMetaTitle', 'Meta title')}
        {f('careersMetaDescription', 'Meta description', { long: true })}
        {f('careersTitle', 'Heading')}
        {f('careersIntro', 'Intro', { long: true })}
        {f('careersOpeningsTitle', 'Openings box heading')}
        {f('careersOpeningsText', 'Openings box text', { long: true })}
      </Card>
    </>
  );
}

/* ----------------------------------------------------------------- legal */

function LegalEditor({ pages }) {
  const router = useRouter();
  const [slug, setSlug] = useState(pages[0]?.slug);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const page = pages.find((p) => p.slug === slug);

  async function save() {
    const html = document.querySelector('input[name="legalHtml"]')?.value ?? '';
    setStatus('saving');
    setError('');
    const res = await fetch('/api/admin/content', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ legal: slug, html }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) { setError(data?.error || 'Could not save.'); setStatus('error'); return; }
    setStatus('saved');
    router.refresh();
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap gap-2">
        {pages.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => { setSlug(p.slug); setStatus('idle'); }}
            className={cx('rounded-lg border px-3 py-1.5 text-[13.5px] font-medium', p.slug === slug ? 'border-primary-500 bg-primary-500 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-primary-300')}
          >
            {p.title}
          </button>
        ))}
      </div>
      {page ? (
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[13px] text-ink-400">{`Shown at /legal/${page.slug}`}</p>
            <a href={`/legal/${page.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary-700 hover:underline">
              View page
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
          <RichTextEditor key={page.slug} name="legalHtml" label={page.title} defaultValue={page.html} minHeight="min-h-96" />
        </section>
      ) : null}
      <SaveBar status={status} error={error} onSave={save} label="Save page" />
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

function Card({
  title, hint, link, children,
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink-900">{title}</h2>
          {hint ? <p className="mt-0.5 text-[13px] text-ink-400">{hint}</p> : null}
        </div>
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-primary-700 hover:underline">
            View
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label, value, onChange, long = false, mono = false,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">{label}</span>
      {long ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3} className={cx(input, 'h-auto resize-y py-2 leading-relaxed')} />
      ) : (
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} className={cx(input, mono && 'font-mono text-[13px]')} />
      )}
    </label>
  );
}

function IconBtn({
  label, icon: Icon, onClick, disabled, danger,
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-30', danger ? 'text-danger hover:bg-danger/10' : 'text-ink-400 hover:bg-surface-muted')}>
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}

function AddBtn({ label, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 text-[13.5px] font-medium text-ink-700 hover:border-primary-500 hover:text-primary-700 disabled:opacity-40">
      <Plus size={15} aria-hidden="true" />
      {label}
    </button>
  );
}

function SaveBar({
  status, error, onSave, label = 'Save changes',
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Can section="content" action="edit" fallback={<ViewOnlyNote />}>
          <button type="button" onClick={onSave} disabled={status === 'saving'} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-500 px-6 text-[15px] font-semibold text-white hover:bg-ink-900 disabled:opacity-70">
            {status === 'saving' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {status === 'saving' ? 'Saving…' : label}
          </button>
        </Can>
        {status === 'saved' ? <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-success"><CheckCircle2 size={16} aria-hidden="true" />Saved to the database — the site is updated.</span> : null}
        {error ? <span className="inline-flex items-center gap-1.5 text-[14px] text-danger"><AlertTriangle size={16} aria-hidden="true" />{error}</span> : null}
      </div>
    </div>
  );
}
