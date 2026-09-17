'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '@/lib/utils';

/*
 * The two dialogs the rich text editor opens: a link, and a block of raw HTML.
 *
 * Neither uses a <form>. The editor itself sits inside the product and blog
 * forms, and a form inside a form both breaks the HTML and lets a submit
 * bubble up — which would save the whole product the moment "Insert Link" is
 * pressed. Enter in a text box and the buttons call the action directly, and
 * the dialog is portalled out to <body> so it is never inside that form's DOM.
 */

function Dialog({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-ink-900/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-900"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Enter in a single-line box runs the dialog's main action. */
function onEnter(action) {
  return (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
      e.stopPropagation();
      action();
    }
  };
}

// What each SEO choice writes into rel. "Follow" writes nothing: a plain link
// passes value, which is what search engines assume by default.
const LINK_TYPES = [
  { id: 'follow', label: 'Follow', note: 'Allow search engines to follow (default)', rel: null },
  { id: 'nofollow', label: 'NoFollow', note: 'Do not pass SEO value', rel: 'nofollow' },
  { id: 'nofollow-noindex', label: 'NoFollow NoIndex', note: 'Do not follow or index', rel: 'nofollow noindex' },
];

function typeFromRel(rel) {
  const r = String(rel || '');
  if (r.includes('noindex')) return 'nofollow-noindex';
  if (r.includes('nofollow')) return 'nofollow';
  return 'follow';
}

export function LinkDialog({ editor, onClose }) {
  const current = editor.getAttributes('link');
  const [url, setUrl] = useState(current.href || '');
  const [type, setType] = useState(typeFromRel(current.rel));
  const [newTab, setNewTab] = useState(current.target === '_blank');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit() {
    let href = url.trim();
    if (!href) {
      setError('Enter the link address.');
      return;
    }
    // "doctorfresh.in/page" is meant as a web address, not a relative path.
    if (!/^(https?:|mailto:|tel:|\/|#)/i.test(href)) href = `https://${href}`;

    const rel = [LINK_TYPES.find((t) => t.id === type).rel, newTab ? 'noopener noreferrer' : null]
      .filter(Boolean).join(' ');
    const attrs = { href, rel: rel || null, target: newTab ? '_blank' : null };

    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !editor.isActive('link')) {
      // Nothing selected: the address itself becomes the link text.
      chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs }] }).run();
    } else {
      chain.extendMarkRange('link').setLink(attrs).run();
    }
    onClose();
  }

  return (
    <Dialog title={current.href ? 'Edit Link' : 'Insert/Edit Link'} onClose={onClose}>
      <div onKeyDown={onEnter(submit)}>
        <label className="block">
          <span className="text-[14px] font-medium text-ink-800">
            URL <span className="text-danger">*</span>
          </span>
          <input
            ref={inputRef}
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="https://example.com"
            className={cx(
              'mt-1.5 h-12 w-full rounded-xl border-2 px-3.5 text-[15px] text-ink-900 outline-none placeholder:text-ink-300',
              error ? 'border-danger' : 'border-line-strong focus:border-primary-500',
            )}
          />
          {error ? <span className="mt-1 block text-[12.5px] text-danger">{error}</span> : null}
        </label>

        <fieldset className="mt-4">
          <legend className="text-[14px] font-medium text-ink-800">Link Type (SEO)</legend>
          <div className="mt-2 space-y-2">
            {LINK_TYPES.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-start gap-2.5 text-[14px] text-ink-500">
                <input
                  type="radio"
                  name="df-editor-link-type"
                  checked={type === t.id}
                  onChange={() => setType(t.id)}
                  className="mt-1 h-4 w-4 accent-primary-600"
                />
                <span>
                  <strong className="font-semibold text-ink-900">{t.label}</strong>
                  {` - ${t.note}`}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[14px] text-ink-700">
          <input
            type="checkbox"
            checked={newTab}
            onChange={(e) => setNewTab(e.target.checked)}
            className="h-4 w-4 accent-primary-600"
          />
          Open in a new tab
        </label>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={submit}
            className="h-11 flex-1 rounded-xl bg-primary-500 text-[15px] font-semibold text-white transition-colors hover:bg-ink-900"
          >
            {current.href ? 'Update Link' : 'Insert Link'}
          </button>
          {current.href ? (
            <button
              type="button"
              onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); onClose(); }}
              className="h-11 rounded-xl border border-danger/30 px-4 text-[14px] font-medium text-danger transition-colors hover:bg-danger/5"
            >
              Remove
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-line-strong px-5 text-[14px] font-medium text-ink-700 transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function RawHtmlDialog({ editor, onClose }) {
  // With a raw block selected, the dialog edits it; otherwise it inserts one.
  const editing = editor.isActive('rawHtml');
  const [code, setCode] = useState(editing ? editor.getAttributes('rawHtml').html || '' : '');
  const areaRef = useRef(null);

  useEffect(() => { areaRef.current?.focus(); }, []);

  function submit() {
    const html = code.trim();
    if (editing) {
      if (html) editor.chain().focus().updateAttributes('rawHtml', { html }).run();
      else editor.chain().focus().deleteSelection().run();
    } else if (html) {
      editor.chain().focus().insertContent({ type: 'rawHtml', attrs: { html } }).run();
    }
    onClose();
  }

  return (
    <Dialog title={editing ? 'Edit raw HTML' : 'Insert raw HTML'} onClose={onClose}>
      <div>
        <p className="text-[13px] leading-relaxed text-ink-400">
          Kept exactly as written — for a YouTube or Maps embed, a custom block, or anything
          the toolbar does not offer.
        </p>
        <textarea
          ref={areaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder={'<iframe src="https://www.youtube.com/embed/…"></iframe>'}
          className="df-scrollbar mt-3 w-full resize-y rounded-xl bg-ink-900 px-3.5 py-3 font-mono text-[13px] leading-relaxed text-[#e6f4f9] outline-none placeholder:text-white/35"
        />
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={submit}
            className="h-11 flex-1 rounded-xl bg-primary-500 text-[15px] font-semibold text-white transition-colors hover:bg-ink-900"
          >
            {editing ? 'Update HTML' : 'Insert HTML'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-line-strong px-5 text-[14px] font-medium text-ink-700 transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}
