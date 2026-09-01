// Builds a product brochure as a PDF, from the product itself.
//
// Nothing is uploaded: the sheet is drawn from the same catalogue row the
// product page renders, so it can never fall out of step with the site and
// every product has one the moment it exists.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const A4 = [595.28, 841.89];
const MARGIN = 48;
const INK = rgb(0.02, 0.23, 0.30); // --color-ink-900
const BODY = rgb(0.29, 0.39, 0.44);
const BRAND = rgb(0.08, 0.59, 0.77); // --color-primary-500
const LINE = rgb(0.85, 0.92, 0.94);

// Helvetica cannot draw ₹, so prices are written the way an invoice would.
const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

/** Anything Helvetica cannot encode would throw, so it is replaced up front. */
function printable(text) {
  return String(text ?? '')
    .replace(/[₹]/g, 'Rs.')
    .replace(/[–—]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E\n]/g, '');
}

/** Greedy wrap — pdf-lib draws a line at a time and has no layout of its own. */
function wrap(text, font, size, maxWidth) {
  const lines = [];

  for (const paragraph of printable(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }

  return lines;
}

const stripHtml = (html) => String(html || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
  .replace(/<li[^>]*>/gi, '- ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#8377;/g, 'Rs.')
  .replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

/**
 * Fetches the product photo over HTTP rather than off disk: on a serverless
 * host the files are served by the CDN and are not in the function's bundle.
 *
 * The format is read from the bytes, not the file name — a third of the
 * catalogue photos are PNGs saved as `.jpg`, and embedding one as a JPEG fails.
 */
async function loadImage(pdf, origin, src) {
  if (!src) return null;

  try {
    const res = await fetch(new URL(src, origin), { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length < 4) return null;

    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await pdf.embedJpg(bytes);
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await pdf.embedPng(bytes);
    return null; // WebP and the rest: pdf-lib cannot embed them
  } catch {
    return null; // a missing photo must not cost the customer the brochure
  }
}

export async function buildBrochure({ product, brand, origin }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const width = A4[0];
  const contentWidth = width - MARGIN * 2;

  let page = pdf.addPage(A4);
  let y = A4[1] - MARGIN;

  const newPage = () => {
    page = pdf.addPage(A4);
    y = A4[1] - MARGIN;
  };
  const room = (needed) => {
    if (y - needed < MARGIN + 40) newPage();
  };

  const text = (value, { font = regular, size = 10.5, color = BODY, lead = 1.45, x = MARGIN, maxWidth = contentWidth } = {}) => {
    for (const line of wrap(value, font, size, maxWidth)) {
      room(size * lead);
      page.drawText(line, { x, y: y - size, size, font, color });
      y -= size * lead;
    }
  };

  /* ------------------------------------------------------------- letterhead */

  const logo = await loadImage(pdf, origin, brand.logo);
  if (logo) {
    const h = 26;
    const w = (logo.width / logo.height) * h;
    page.drawImage(logo, { x: MARGIN, y: y - h, width: w, height: h });
  } else {
    page.drawText(printable(brand.name || 'Doctor Fresh'), {
      x: MARGIN, y: y - 20, size: 18, font: bold, color: BRAND,
    });
  }

  page.drawText('PRODUCT BROCHURE', {
    x: width - MARGIN - bold.widthOfTextAtSize('PRODUCT BROCHURE', 9),
    y: y - 18,
    size: 9,
    font: bold,
    color: BRAND,
  });

  y -= 40;
  page.drawLine({
    start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 1, color: LINE,
  });
  y -= 26;

  /* ----------------------------------------------------------- name + price */

  text(product.name, { font: bold, size: 17, color: INK, lead: 1.3 });
  y -= 8;

  if (product.price) {
    page.drawText(money(product.price), { x: MARGIN, y: y - 16, size: 16, font: bold, color: BRAND });
    const priceWidth = bold.widthOfTextAtSize(money(product.price), 16);

    if (product.mrp > product.price) {
      page.drawText(`MRP ${money(product.mrp)}`, {
        x: MARGIN + priceWidth + 10, y: y - 14, size: 10, font: regular, color: BODY,
      });
    }
    y -= 24;
    text('Inclusive of all taxes', { size: 9 });
  } else {
    text('Price on request', { font: bold, size: 13, color: BRAND });
  }
  y -= 18;

  /* ----------------------------------------------------------------- photo */

  const photo = await loadImage(pdf, origin, product.images?.[0]);
  if (photo) {
    const boxWidth = contentWidth;
    const boxHeight = 250;
    const scale = Math.min(boxWidth / photo.width, boxHeight / photo.height);
    const w = photo.width * scale;
    const h = photo.height * scale;

    room(boxHeight + 16);
    page.drawRectangle({
      x: MARGIN, y: y - boxHeight, width: boxWidth, height: boxHeight,
      borderColor: LINE, borderWidth: 1, color: rgb(1, 1, 1),
    });
    page.drawImage(photo, {
      x: MARGIN + (boxWidth - w) / 2,
      y: y - boxHeight + (boxHeight - h) / 2,
      width: w,
      height: h,
    });
    y -= boxHeight + 24;
  }

  /* --------------------------------------------------------------- section */

  const heading = (label) => {
    room(38);
    y -= 6;
    page.drawText(printable(label).toUpperCase(), {
      x: MARGIN, y: y - 11, size: 10, font: bold, color: BRAND,
    });
    y -= 18;
    page.drawLine({
      start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 0.75, color: LINE,
    });
    y -= 14;
  };

  const description = stripHtml(product.descriptionHtml);
  if (description) {
    heading('About this product');
    text(description, { size: 10.5, lead: 1.5 });
    y -= 10;
  }

  const specs = (product.specifications || []).filter((s) => s.label && s.value && s.value !== '-');
  if (specs.length) {
    heading('Specifications');

    const labelWidth = contentWidth * 0.42;
    for (const spec of specs) {
      const labelLines = wrap(spec.label, bold, 10, labelWidth - 10);
      const valueLines = wrap(spec.value, regular, 10, contentWidth - labelWidth - 10);
      const rowHeight = Math.max(labelLines.length, valueLines.length) * 14 + 8;

      room(rowHeight);
      const top = y;

      labelLines.forEach((line, i) => page.drawText(line, {
        x: MARGIN, y: top - 11 - i * 14, size: 10, font: bold, color: INK,
      }));
      valueLines.forEach((line, i) => page.drawText(line, {
        x: MARGIN + labelWidth, y: top - 11 - i * 14, size: 10, font: regular, color: BODY,
      }));

      y = top - rowHeight;
      page.drawLine({
        start: { x: MARGIN, y: y + 4 }, end: { x: width - MARGIN, y: y + 4 }, thickness: 0.5, color: LINE,
      });
    }
    y -= 12;
  }

  const faqs = (product.faqs || []).slice(0, 6);
  if (faqs.length) {
    heading('Frequently asked questions');
    for (const faq of faqs) {
      text(faq.question, { font: bold, size: 10, color: INK });
      text(faq.answer, { size: 10, lead: 1.45 });
      y -= 8;
    }
  }

  /* ---------------------------------------------------------------- footer */

  const contact = [
    brand.phone ? `Phone: ${brand.phone}` : '',
    brand.email ? `Email: ${brand.email}` : '',
    'www.doctorfresh.in',
  ].filter(Boolean).join('   |   ');

  const address = stripHtml(brand.address);

  for (const p of pdf.getPages()) {
    p.drawLine({
      start: { x: MARGIN, y: MARGIN + 34 },
      end: { x: width - MARGIN, y: MARGIN + 34 },
      thickness: 0.75,
      color: LINE,
    });
    p.drawText(printable(contact), { x: MARGIN, y: MARGIN + 20, size: 8.5, font: bold, color: INK });
    if (address) {
      p.drawText(printable(address).slice(0, 120), {
        x: MARGIN, y: MARGIN + 8, size: 8, font: regular, color: BODY,
      });
    }
  }

  return pdf.save();
}
