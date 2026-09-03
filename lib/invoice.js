// Builds a customer's invoice as a PDF, from the order row itself.
//
// Nothing is stored: the sheet is drawn from the same `sale` row the order page
// renders, so an invoice can never disagree with what the customer was
// charged, and every order has one the moment it is placed.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const A4 = [595.28, 841.89];
const MARGIN = 48;
const INK = rgb(0.02, 0.23, 0.30); // --color-ink-900
const BODY = rgb(0.29, 0.39, 0.44);
const BRAND = rgb(0.08, 0.59, 0.77); // --color-primary-500
const LINE = rgb(0.85, 0.92, 0.94);
const WASH = rgb(0.95, 0.98, 0.99); // --color-surface-muted

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
  const words = printable(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const PAYMENT_LABEL = {
  cash_on_delivery: 'Cash on delivery',
  easebuzz: 'Paid online',
  sslcommerz: 'Paid online (SSLCommerz)',
  paytm: 'Paytm',
  ccavenue: 'CCAvenue',
  pum: 'PayUmoney',
  stripe: 'Card',
  paypal: 'PayPal',
};

const date = (value) => (value
  ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

/**
 * @param {object} order  the shape `getOrder` returns
 * @param {object} brand  `getBrand()` — the seller's own details
 */
export async function buildInvoice({ order, brand }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const [pageWidth, pageHeight] = A4;
  const right = pageWidth - MARGIN;
  const width = pageWidth - MARGIN * 2;

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const text = (value, x, y, { font = regular, size = 10, color = BODY } = {}) => {
    page.drawText(printable(value), { x, y, size, font, color });
  };

  /** Right-aligned, for every figure in the money column. */
  const textRight = (value, x, y, { font = regular, size = 10, color = BODY } = {}) => {
    const printed = printable(value);
    page.drawText(printed, {
      x: x - font.widthOfTextAtSize(printed, size), y, size, font, color,
    });
  };

  /* ------------------------------------------------------------- letterhead */

  page.drawRectangle({ x: 0, y: pageHeight - 118, width: pageWidth, height: 118, color: WASH });
  page.drawRectangle({ x: 0, y: pageHeight - 122, width: pageWidth, height: 4, color: BRAND });

  let y = pageHeight - 58;
  text(brand?.name || 'Doctor Fresh', MARGIN, y, { font: bold, size: 20, color: INK });

  y -= 16;
  for (const line of wrap(brand?.address || '', regular, 8.5, 260).slice(0, 3)) {
    text(line, MARGIN, y, { size: 8.5 });
    y -= 11;
  }
  if (brand?.phone) text(`Phone ${brand.phone}`, MARGIN, y, { size: 8.5 });

  // The document's own title sits opposite the sender.
  textRight('TAX INVOICE', right, pageHeight - 55, { font: bold, size: 15, color: BRAND });
  textRight(`Invoice ${order.code || order.id}`, right, pageHeight - 74, { size: 9.5, color: INK });
  textRight(date(order.placedAt), right, pageHeight - 88, { size: 9.5 });
  textRight(
    order.paid ? 'PAID' : (PAYMENT_LABEL[order.paymentType] || 'Payment due'),
    right,
    pageHeight - 102,
    { font: bold, size: 9.5, color: order.paid ? BRAND : BODY },
  );

  /* ----------------------------------------------------------------- billed */

  y = pageHeight - 158;
  const a = order.address || {};
  const name = [a.firstname, a.lastname].filter(Boolean).join(' ');

  text('BILL TO', MARGIN, y, { font: bold, size: 8.5, color: BRAND });
  y -= 15;
  if (name) { text(name, MARGIN, y, { font: bold, size: 11, color: INK }); y -= 14; }

  const addressLines = [
    a.address1, a.address2,
    [a.city, a.state, a.zip].filter(Boolean).join(', '),
    a.country,
    a.phone ? `Phone ${a.phone}` : '',
    a.email,
  ].filter(Boolean);

  for (const line of addressLines) {
    for (const wrapped of wrap(line, regular, 9.5, 300)) {
      text(wrapped, MARGIN, y, { size: 9.5 });
      y -= 12.5;
    }
  }

  /* ------------------------------------------------------------------ items */

  y -= 18;
  const qtyX = MARGIN + width * 0.62;
  const priceX = MARGIN + width * 0.8;

  page.drawRectangle({ x: MARGIN, y: y - 6, width, height: 22, color: WASH });
  text('ITEM', MARGIN + 10, y, { font: bold, size: 8.5, color: INK });
  textRight('QTY', qtyX, y, { font: bold, size: 8.5, color: INK });
  textRight('PRICE', priceX, y, { font: bold, size: 8.5, color: INK });
  textRight('AMOUNT', right - 10, y, { font: bold, size: 8.5, color: INK });
  y -= 26;

  for (const item of order.items || []) {
    const lines = wrap(item.name || 'Item', regular, 10, width * 0.56);
    const qty = Number(item.qty) || 1;

    text(lines[0] || '', MARGIN + 10, y, { size: 10, color: INK });
    textRight(String(qty), qtyX, y, { size: 10 });
    textRight(money(item.price), priceX, y, { size: 10 });
    textRight(money(item.subtotal), right - 10, y, { size: 10, color: INK });

    // A long product name continues under itself, not into the figures.
    for (const extra of lines.slice(1, 3)) {
      y -= 12;
      text(extra, MARGIN + 10, y, { size: 10, color: INK });
    }

    y -= 10;
    page.drawLine({
      start: { x: MARGIN, y }, end: { x: right, y }, thickness: 0.5, color: LINE,
    });
    y -= 18;

    if (y < 150) break; // one page; a longer order is summarised by its totals
  }

  /* ----------------------------------------------------------------- totals */

  const totals = order.totals || {};
  const rows = [
    ['Subtotal', totals.subtotal],
    ['Shipping', totals.shipping],
    ['Tax', totals.tax],
  ].filter(([, value]) => Number(value) > 0);

  y -= 4;
  for (const [label, value] of rows) {
    textRight(label, priceX, y, { size: 10 });
    textRight(money(value), right - 10, y, { size: 10, color: INK });
    y -= 16;
  }

  page.drawRectangle({ x: priceX - 90, y: y - 8, width: right - priceX + 90, height: 26, color: WASH });
  textRight('Grand total', priceX, y, { font: bold, size: 11, color: INK });
  textRight(money(totals.grandTotal), right - 10, y, { font: bold, size: 12, color: BRAND });

  /* ------------------------------------------------------------------- foot */

  page.drawLine({
    start: { x: MARGIN, y: 84 }, end: { x: right, y: 84 }, thickness: 0.5, color: LINE,
  });
  text('This is a computer-generated invoice and needs no signature.', MARGIN, 68, { size: 8.5 });
  if (brand?.website) text(brand.website, MARGIN, 55, { size: 8.5, color: BRAND });

  return pdf.save();
}

/** A file name a customer can find again on their desktop. */
export function invoiceFileName(order) {
  const ref = String(order.code || order.id || 'order').replace(/[^A-Za-z0-9-]+/g, '-');
  return `doctor-fresh-invoice-${ref}.pdf`;
}
