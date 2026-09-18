'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import {
  Table, TableRow, TableCell, TableHeader,
} from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { RawHtml, expandRawHtml, wrapRawHtml } from '@/components/admin/editor/rawHtml';
import { LinkDialog, RawHtmlDialog } from '@/components/admin/editor/EditorDialogs';
import {
  Bold, Italic, Underline, Strikethrough, Code, Heading2, Heading3, Heading4, Pilcrow,
  List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link, Unlink, ImagePlus, Minus, SquareCode, Table as TableIcon, RemoveFormatting,
  Undo2, Redo2, CodeXml, Eye, EyeOff, Upload, Trash2, Merge, Split,
  BetweenHorizontalStart, BetweenHorizontalEnd, BetweenVerticalStart, BetweenVerticalEnd,
  TableProperties, Loader2, X, FileCode2,
} from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * The rich text box the admin writes product and blog copy in.
 *
 * It saves plain HTML — the same `description`, `installation_commision` and
 * blog columns the storefront and the PHP panel already read — through a hidden
 * input, so any existing form that posts FormData keeps working unchanged.
 *
 * Three views of one document: the visual editor, the HTML source (for the
 * odd embed or attribute the toolbar does not offer), and a preview in the
 * storefront's own prose styles.
 */
export default function RichTextEditor({
  name, label, hint, defaultValue = '', placeholder = 'Start writing…', minHeight = 'min-h-60',
}) {
  const [html, setHtml] = useState(defaultValue || '');
  // Set once the text is actually edited, so a form can leave stored HTML
  // untouched when only other fields changed.
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState('edit'); // edit | source
  const [preview, setPreview] = useState(false);

  const editor = useEditor({
    // Rendered on the server as an empty shell; the document mounts in the
    // browser, which is what keeps Next.js hydration clean.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          // No blanket rel/target: each link carries the SEO type chosen for
          // it in the link dialog.
          HTMLAttributes: { rel: null, target: null },
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
      RawHtml,
    ],
    content: wrapRawHtml(defaultValue || ''),
    editorProps: {
      attributes: { class: cx('df-prose max-w-none px-4 py-3', minHeight) },
    },
    onUpdate: ({ editor: e }) => { setDirty(true); setHtml(e.isEmpty ? '' : expandRawHtml(e.getHTML())); },
  });

  const [linkDialog, setLinkDialog] = useState(false);
  const [rawDialog, setRawDialog] = useState(false);

  function toSource() {
    if (editor) setHtml(editor.isEmpty ? '' : expandRawHtml(editor.getHTML()));
    setMode('source');
  }

  function toVisual() {
    // Whatever was typed into the source view becomes the document again.
    editor?.commands.setContent(wrapRawHtml(html || ''), { emitUpdate: false });
    setMode('edit');
  }

  return (
    <div>
      {label || hint ? (
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            {label ? <p className="text-[14px] font-semibold text-ink-800">{label}</p> : null}
            {hint ? <p className="mt-0.5 text-[12.5px] text-ink-400">{hint}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary-700 hover:text-primary-800"
          >
            {preview ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
            {preview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      ) : null}

      <input type="hidden" name={name} value={html} />
      <input type="hidden" name={`${name}Changed`} value={dirty ? '1' : ''} />

      <div className="df-editor overflow-hidden rounded-xl border border-line-strong bg-white focus-within:border-primary-500">
        <Toolbar
          editor={editor}
          mode={mode}
          onSource={toSource}
          onVisual={toVisual}
          onLink={() => setLinkDialog(true)}
          onRawHtml={() => setRawDialog(true)}
        />

        {mode === 'source' ? (
          <textarea
            value={html}
            onChange={(e) => { setDirty(true); setHtml(e.target.value); }}
            spellCheck={false}
            aria-label={`${label || 'Content'} HTML source`}
            className={cx(
              'df-scrollbar block max-h-[520px] w-full resize-y bg-ink-900 px-4 py-3 font-mono text-[13px] leading-relaxed text-[#e6f4f9] outline-none',
              minHeight,
            )}
          />
        ) : (
          <div className="df-scrollbar max-h-[520px] overflow-y-auto">
            <EditorContent editor={editor} />
            {!editor ? <div className={cx('px-4 py-3 text-[14px] text-ink-300', minHeight)}>Loading editor…</div> : null}
          </div>
        )}

        <TableBar editor={editor} hidden={mode === 'source'} />
      </div>

      {linkDialog && editor ? <LinkDialog editor={editor} onClose={() => setLinkDialog(false)} /> : null}
      {rawDialog && editor ? <RawHtmlDialog editor={editor} onClose={() => setRawDialog(false)} /> : null}

      {preview ? (
        <div className="mt-3 rounded-xl border border-dashed border-line-strong bg-surface-muted/60 p-4">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-400">
            Preview — as it shows on the website
          </p>
          {html ? (
            <div className="df-prose max-w-none rounded-lg bg-white p-4" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-[14px] text-ink-300">Nothing written yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ toolbar */

function Toolbar({
  editor, mode, onSource, onVisual, onLink, onRawHtml,
}) {
  // Re-render the buttons only when what they show actually changes.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? {
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      paragraph: e.isActive('paragraph'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      h4: e.isActive('heading', { level: 4 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      justify: e.isActive({ textAlign: 'justify' }),
      link: e.isActive('link'),
      raw: e.isActive('rawHtml'),
      table: e.isActive('table'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    } : {}),
  }) || {};

  const source = mode === 'source';
  const disabled = !editor || source;
  const run = (fn) => () => { if (editor) fn(editor.chain().focus()).run(); };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-muted/80 px-2 py-1.5 backdrop-blur">
      <Group>
        <Btn label="Bold" icon={Bold} active={state.bold} disabled={disabled} onClick={run((c) => c.toggleBold())} />
        <Btn label="Italic" icon={Italic} active={state.italic} disabled={disabled} onClick={run((c) => c.toggleItalic())} />
        <Btn label="Underline" icon={Underline} active={state.underline} disabled={disabled} onClick={run((c) => c.toggleUnderline())} />
        <Btn label="Strikethrough" icon={Strikethrough} active={state.strike} disabled={disabled} onClick={run((c) => c.toggleStrike())} />
        <Btn label="Inline code" icon={Code} active={state.code} disabled={disabled} onClick={run((c) => c.toggleCode())} />
      </Group>

      <Group>
        <Btn label="Paragraph" icon={Pilcrow} active={state.paragraph} disabled={disabled} onClick={run((c) => c.setParagraph())} />
        <Btn label="Heading 2" icon={Heading2} active={state.h2} disabled={disabled} onClick={run((c) => c.toggleHeading({ level: 2 }))} />
        <Btn label="Heading 3" icon={Heading3} active={state.h3} disabled={disabled} onClick={run((c) => c.toggleHeading({ level: 3 }))} />
        <Btn label="Heading 4" icon={Heading4} active={state.h4} disabled={disabled} onClick={run((c) => c.toggleHeading({ level: 4 }))} />
      </Group>

      <Group>
        <Btn label="Bullet list" icon={List} active={state.bullet} disabled={disabled} onClick={run((c) => c.toggleBulletList())} />
        <Btn label="Numbered list" icon={ListOrdered} active={state.ordered} disabled={disabled} onClick={run((c) => c.toggleOrderedList())} />
        <Btn label="Quote" icon={Quote} active={state.quote} disabled={disabled} onClick={run((c) => c.toggleBlockquote())} />
      </Group>

      <Group>
        <Btn label="Align left" icon={AlignLeft} active={state.left} disabled={disabled} onClick={run((c) => c.setTextAlign('left'))} />
        <Btn label="Align center" icon={AlignCenter} active={state.center} disabled={disabled} onClick={run((c) => c.setTextAlign('center'))} />
        <Btn label="Align right" icon={AlignRight} active={state.right} disabled={disabled} onClick={run((c) => c.setTextAlign('right'))} />
        <Btn label="Justify" icon={AlignJustify} active={state.justify} disabled={disabled} onClick={run((c) => c.setTextAlign('justify'))} />
      </Group>

      <Group>
        <Btn label="Add link" icon={Link} active={state.link} disabled={disabled} onClick={onLink} />
        <Btn label="Remove link" icon={Unlink} disabled={disabled || !state.link} onClick={run((c) => c.extendMarkRange('link').unsetLink())} />
        <ImageButton editor={editor} disabled={disabled} />
      </Group>

      <Group>
        <Btn label="Horizontal line" icon={Minus} disabled={disabled} onClick={run((c) => c.setHorizontalRule())} />
        <Btn label="Code block" icon={SquareCode} active={state.codeBlock} disabled={disabled} onClick={run((c) => c.toggleCodeBlock())} />
        <Btn label="Insert raw HTML" icon={FileCode2} active={state.raw} disabled={disabled} onClick={onRawHtml} text="HTML" />
        <Btn
          label="Insert table"
          icon={TableIcon}
          active={state.table}
          disabled={disabled}
          onClick={run((c) => c.insertTable({ rows: 3, cols: 2, withHeaderRow: false }))}
        />
      </Group>

      <Group>
        <Btn label="Clear formatting" icon={RemoveFormatting} disabled={disabled} onClick={run((c) => c.unsetAllMarks().clearNodes())} />
        <Btn label="Undo" icon={Undo2} disabled={disabled || !state.canUndo} onClick={run((c) => c.undo())} />
        <Btn label="Redo" icon={Redo2} disabled={disabled || !state.canRedo} onClick={run((c) => c.redo())} />
      </Group>

      <Btn
        label={source ? 'Back to the visual editor' : 'Edit HTML source'}
        icon={CodeXml}
        active={source}
        disabled={!editor}
        onClick={source ? onVisual : onSource}
      />
    </div>
  );
}

/** Table controls, shown only while the cursor is inside a table. */
function TableBar({ editor, hidden }) {
  const inTable = useEditorState({
    editor,
    selector: ({ editor: e }) => Boolean(e?.isActive('table')),
  });
  if (!editor || hidden || !inTable) return null;

  const run = (fn) => () => fn(editor.chain().focus()).run();

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-t border-line bg-primary-50/60 px-2 py-1.5">
      <span className="mr-1.5 text-[12px] font-semibold uppercase tracking-wide text-primary-700">Table</span>
      <Btn label="Row above" icon={BetweenHorizontalStart} onClick={run((c) => c.addRowBefore())} />
      <Btn label="Row below" icon={BetweenHorizontalEnd} onClick={run((c) => c.addRowAfter())} />
      <Btn label="Column left" icon={BetweenVerticalStart} onClick={run((c) => c.addColumnBefore())} />
      <Btn label="Column right" icon={BetweenVerticalEnd} onClick={run((c) => c.addColumnAfter())} />
      <span className="mx-1 h-5 w-px bg-line-strong" />
      <Btn label="Header row on/off" icon={TableProperties} onClick={run((c) => c.toggleHeaderRow())} />
      <Btn label="Merge cells" icon={Merge} onClick={run((c) => c.mergeCells())} />
      <Btn label="Split cell" icon={Split} onClick={run((c) => c.splitCell())} />
      <span className="mx-1 h-5 w-px bg-line-strong" />
      <Btn label="Delete row" icon={X} tone="danger" onClick={run((c) => c.deleteRow())} text="Row" />
      <Btn label="Delete column" icon={X} tone="danger" onClick={run((c) => c.deleteColumn())} text="Column" />
      <Btn label="Delete table" icon={Trash2} tone="danger" onClick={run((c) => c.deleteTable())} text="Table" />
    </div>
  );
}

/** Upload a picture, or point at one already online. */
function ImageButton({ editor, disabled }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const fileRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  function insert(src, alt = '') {
    editor.chain().focus().setImage({ src, alt }).run();
    setOpen(false);
    setUrl('');
    setError('');
  }

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/uploads', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed.');
      insert(data.url, file.name.replace(/\.[a-z]+$/i, ''));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <span ref={boxRef} className="relative">
      <Btn label="Image" icon={ImagePlus} active={open} disabled={disabled} onClick={() => setOpen((v) => !v)} />

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-72 rounded-xl border border-line bg-white p-3 shadow-[0_16px_40px_-20px_rgb(6_59_76/0.5)]">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-500 text-[13.5px] font-semibold text-white transition-colors hover:bg-ink-900 disabled:opacity-70"
          >
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Upload size={15} aria-hidden="true" />}
            {busy ? 'Uploading…' : 'Upload from computer'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />

          <p className="my-2 text-center text-[12px] text-ink-300">or paste an image address</p>
          <div className="flex gap-1.5">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              // This box lives inside the product form: a bare Enter here would
              // submit — and save — the whole product.
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (url.trim()) insert(url.trim());
              }}
              placeholder="https://…"
              className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong px-2.5 text-[13px] outline-none focus:border-primary-500"
            />
            <button
              type="button"
              onClick={() => url.trim() && insert(url.trim())}
              className="h-9 rounded-lg border border-primary-500 px-3 text-[13px] font-semibold text-primary-700 hover:bg-primary-50"
            >
              Add
            </button>
          </div>
          {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
        </div>
      ) : null}
    </span>
  );
}

function Group({ children }) {
  return (
    <span className="mr-0.5 flex items-center gap-0.5 border-r border-line-strong/70 pr-1">
      {children}
    </span>
  );
}

function Btn({
  label, icon: Icon, onClick, active = false, disabled = false, tone, text,
}) {
  return (
    <button
      type="button"
      // mousedown would move focus out of the editor and lose the selection
      // the command is meant to act on.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cx(
        'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35',
        active
          ? 'bg-primary-500 text-white'
          : tone === 'danger'
            ? 'text-danger hover:bg-danger/10'
            : 'text-ink-500 hover:bg-white hover:text-ink-900',
      )}
    >
      <Icon size={16} aria-hidden="true" />
      {text || null}
    </button>
  );
}
