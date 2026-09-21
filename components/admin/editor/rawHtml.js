import { Node } from '@tiptap/core';

/**
 * A block of HTML the editor keeps exactly as written.
 *
 * TipTap only understands the tags its extensions describe; anything else — a
 * YouTube iframe, a script, a styled div from the old panel — would be quietly
 * dropped the moment the document is opened. Such blocks are held here as an
 * opaque string instead, shown as a code card while editing, and written back
 * out untouched when the HTML is saved.
 *
 * Inside the editor the block is `<div data-raw-html="…encoded…">`; that form
 * never reaches the database, because `expandRawHtml` swaps it back for the
 * original markup.
 */

const MARKER = 'data-raw-html';

export const RawHtml = Node.create({
  name: 'rawHtml',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      html: {
        default: '',
        parseHTML: (el) => safeDecode(el.getAttribute(MARKER) || ''),
        renderHTML: (attrs) => ({ [MARKER]: encodeURIComponent(attrs.html || '') }),
      },
    };
  },

  parseHTML() {
    return [{ tag: `div[${MARKER}]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'df-raw-html';
      dom.contentEditable = 'false';

      const label = document.createElement('span');
      label.className = 'df-raw-html__label';

      // A video block shows the video itself, so the writer sees what readers will.
      if (/^\s*(<div class="df-embed">\s*<iframe\b[^>]*><\/iframe>\s*<\/div>|<video\b[^>]*>(<\/video>)?)\s*$/i.test(node.attrs.html)) {
        label.textContent = 'Video — click it and press Delete to remove';
        const preview = document.createElement('div');
        preview.className = 'df-raw-html__video';
        preview.innerHTML = node.attrs.html;
        dom.append(label, preview);
        return { dom };
      }

      label.textContent = 'Raw HTML — select and press the HTML button to edit';
      const code = document.createElement('pre');
      code.textContent = node.attrs.html;

      dom.append(label, code);
      return { dom };
    };
  },
});

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Editor HTML → the HTML that is saved: placeholders become their markup. */
export function expandRawHtml(html) {
  return String(html || '').replace(
    /<div data-raw-html="([^"]*)"><\/div>/g,
    (_, encoded) => safeDecode(encoded),
  );
}

// Tags the editor has no extension for, and would otherwise strip.
const FOREIGN = 'iframe, script, style, video, audio, embed, object, form, noscript, svg, canvas, section, article, figure, details';

/**
 * Saved HTML → what the editor opens. Every top-level block that contains a
 * tag the editor cannot represent is parked in a raw block whole, so its
 * surrounding markup survives with it. Plain paragraphs, lists and tables are
 * left for the editor to handle normally.
 */
export function wrapRawHtml(html) {
  const source = String(html || '');
  if (!source || typeof window === 'undefined' || !window.DOMParser) return source;

  const doc = new window.DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
  const body = doc.body;

  for (const child of [...body.children]) {
    const foreign = child.matches(FOREIGN) || child.querySelector(FOREIGN);
    if (!foreign) continue;

    const holder = doc.createElement('div');
    holder.setAttribute(MARKER, encodeURIComponent(child.outerHTML));
    child.replaceWith(holder);
  }

  return body.innerHTML;
}
