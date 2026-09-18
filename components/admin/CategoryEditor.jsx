'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Save, Loader2, CheckCircle2, AlertTriangle, Search, Type, FileText, HelpCircle,
} from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { cx } from '@/lib/utils';

// What search engines show before cutting a listing short.
const TITLE_IDEAL = 60;
const DESCRIPTION_IDEAL = 160;
const COLUMN_MAX = 255;

/**
 * Editing one category or subcategory page: its name, the search listing, the
 * heading and intro at the top of the page, the long SEO copy under the
 * products, and the FAQ. Everything saves to the same `category` or
 * `sub_category` row the storefront and the PHP panel read.
 *
 * `kind` picks the endpoint and wording; `path` is the page's address, shown
 * in the Google preview. Subcategories also carry meta keywords.
 */
export default function CategoryEditor({ category, kind = 'category', path = '' }) {
  const isSub = kind === 'subcategory';
  const noun = isSub ? 'subcategory' : 'category';
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [metaTitle, setMetaTitle] = useState(category.metaTitle);
  const [metaDescription, setMetaDescription] = useState(category.metaDescription);
  const [heading, setHeading] = useState(category.heading);
  const [intro, setIntro] = useState(category.intro);
  const [keywords, setKeywords] = useState(category.keywords || '');
  const [faqs, setFaqs] = useState(category.faqs.length ? category.faqs : [{ question: '', answer: '' }]);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError(`Enter a ${noun} name.`);
      setStatus('error');
      return;
    }

    setStatus('saving');
    setError('');
    const pageContentHtml = new FormData(event.currentTarget).get('pageContentHtml');

    try {
      const res = await fetch(isSub ? '/api/admin/subcategories' : '/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: category.id,
          name,
          metaTitle,
          metaDescription,
          heading,
          intro,
          ...(isSub ? { keywords } : {}),
          pageContentHtml,
          faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save.');
      setStatus('saved');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  const editFaq = (index, patch) => {
    setFaqs((list) => list.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    setStatus('idle');
  };

  const touched = (setter) => (e) => { setter(e.target.value); setStatus('idle'); };

  return (
    <form onSubmit={save} className="space-y-5 pb-24">
      {/* ------------------------------------------------------------ basics */}
      <Card icon={Type} title="Name" hint={`How the ${noun} is named in menus, filters and breadcrumbs.`}>
        <input
          value={name}
          onChange={touched(setName)}
          maxLength={255}
          required
          className="h-11 w-full rounded-xl border border-line-strong px-3.5 text-[15px] outline-none focus:border-primary-500"
        />
      </Card>

      {/* ---------------------------------------------------- search listing */}
      <Card icon={Search} title="Search listing" hint={`What Google shows for this ${noun} page.`}>
        <Label text="Meta title" count={metaTitle.length} ideal={TITLE_IDEAL} />
        <input
          value={metaTitle}
          onChange={touched(setMetaTitle)}
          maxLength={COLUMN_MAX}
          placeholder={`${name} | Doctor Fresh`}
          className="h-11 w-full rounded-xl border border-line-strong px-3.5 text-[14.5px] outline-none focus:border-primary-500"
        />

        <div className="mt-4">
          <Label text="Meta description" count={metaDescription.length} ideal={DESCRIPTION_IDEAL} />
          <textarea
            value={metaDescription}
            onChange={touched(setMetaDescription)}
            maxLength={COLUMN_MAX}
            rows={3}
            className="w-full resize-y rounded-xl border border-line-strong px-3.5 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-primary-500"
          />
        </div>

        {/* Roughly how the result reads in Google, cut where Google cuts. */}
        <div className="mt-4 rounded-xl border border-line bg-white p-4">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-300">Google preview</p>
          <p className="mt-2 truncate text-[13px] text-ink-500">{`www.doctorfresh.in${(path || `/category/${category.slug}`).split('/').join(' › ')}`}</p>
          <p className="mt-0.5 line-clamp-1 text-[18px] leading-snug text-[#1a0dab]">
            {metaTitle || `${name} | Doctor Fresh`}
          </p>
          <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-[#4d5156]">
            {metaDescription || 'Add a meta description — without one, Google picks a line from the page.'}
          </p>
        </div>

        {isSub ? (
          <div className="mt-4">
            <Label text="Meta keywords" count={keywords.length} />
            <input
              value={keywords}
              onChange={touched(setKeywords)}
              maxLength={1000}
              placeholder="water ionizer for home, alkaline water machine"
              className="h-11 w-full rounded-xl border border-line-strong px-3.5 text-[14.5px] outline-none focus:border-primary-500"
            />
          </div>
        ) : null}
      </Card>

      {/* ---------------------------------------------------------- page top */}
      <Card icon={FileText} title="Page heading" hint={`The large heading and short intro at the top of the ${noun} page.`}>
        <Label text="Heading" count={heading.length} />
        <input
          value={heading}
          onChange={touched(setHeading)}
          maxLength={2000}
          placeholder={name}
          className="h-11 w-full rounded-xl border border-line-strong px-3.5 text-[14.5px] outline-none focus:border-primary-500"
        />
        <div className="mt-4">
          <Label text="Intro" count={intro.length} />
          <textarea
            value={intro}
            onChange={touched(setIntro)}
            maxLength={2000}
            rows={4}
            className="w-full resize-y rounded-xl border border-line-strong px-3.5 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-primary-500"
          />
        </div>
      </Card>

      {/* ------------------------------------------------------ page content */}
      <section className="rounded-2xl border border-line bg-white p-5">
        <RichTextEditor
          name="pageContentHtml"
          label="Page content"
          hint="The long article under the products — headings here become the sections of the page."
          defaultValue={category.pageContentHtml}
          placeholder={`Write about this ${noun}: what to look for, types, prices, care…`}
          minHeight="min-h-80"
        />
      </section>

      {/* --------------------------------------------------------------- FAQ */}
      <Card icon={HelpCircle} title="Frequently asked questions" hint={`Shown at the bottom of the ${noun} page and given to Google as FAQ markup.`}>
        <div className="space-y-3">
          {faqs.map((f, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className="rounded-xl border border-line bg-surface-muted/50 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[12px] font-semibold text-primary-700">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={f.question}
                    onChange={(e) => editFaq(index, { question: e.target.value })}
                    placeholder="Question"
                    aria-label={`Question ${index + 1}`}
                    className="h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-[14px] font-medium outline-none focus:border-primary-500"
                  />
                  <textarea
                    value={f.answer}
                    onChange={(e) => editFaq(index, { answer: e.target.value })}
                    rows={3}
                    placeholder="Answer"
                    aria-label={`Answer ${index + 1}`}
                    className="w-full resize-y rounded-lg border border-line-strong bg-white px-3 py-2 text-[14px] leading-relaxed outline-none focus:border-primary-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setFaqs((list) => (list.length > 1 ? list.filter((_, i) => i !== index) : [{ question: '', answer: '' }])); setStatus('idle'); }}
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
          onClick={() => setFaqs((list) => [...list, { question: '', answer: '' }])}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3.5 py-2 text-[13.5px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-700"
        >
          <Plus size={15} aria-hidden="true" />
          Add a question
        </button>
      </Card>

      {/* ----------------------------------------------------- save bar */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={status === 'saving'}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-500 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-ink-900 disabled:opacity-70"
          >
            {status === 'saving' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {status === 'saving' ? 'Saving…' : `Save ${noun}`}
          </button>
          {status === 'saved' ? (
            <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-success">
              <CheckCircle2 size={16} aria-hidden="true" />
              {`Saved — the ${noun} page on the website is updated.`}
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

/** A field label with a character count that turns amber past the ideal length. */
function Label({ text, count, ideal }) {
  const over = ideal && count > ideal;
  return (
    <span className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-[14px] font-medium text-ink-800">{text}</span>
      <span className={cx('text-[12.5px] tabular-nums', over ? 'font-semibold text-warning' : 'text-ink-300')}>
        {ideal ? `${count} / ${ideal}` : count}
        {over ? ' · may be cut off in Google' : ''}
      </span>
    </span>
  );
}
