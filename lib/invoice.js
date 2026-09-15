// Builds a customer's invoice as a PDF, from the order row itself.
//
// Nothing is stored: the sheet is drawn from the same `sale` row the order page
// renders, so an invoice can never disagree with what the customer was
// charged, and every order has one the moment it is placed.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const A4 = [595.28, 841.89];
const MARGIN = 40;

const INK = rgb(0.02, 0.23, 0.30); //   --color-ink-900
const BODY = rgb(0.29, 0.39, 0.44); //  --color-ink-500
const MUTED = rgb(0.42, 0.5, 0.53); //  --color-ink-400
const BRAND = rgb(0.08, 0.59, 0.77); // --color-primary-500
const BRAND_DARK = rgb(0.04, 0.38, 0.51); // --color-primary-700
const LINE = rgb(0.85, 0.92, 0.94); //  --color-line
const WASH = rgb(0.95, 0.98, 0.99); //  --color-surface-muted
const TINT = rgb(0.89, 0.95, 0.98); //  --color-primary-100
const WHITE = rgb(1, 1, 1);
const PAID = rgb(0.09, 0.55, 0.33);
const DUE = rgb(0.75, 0.2, 0.2);

/* ----------------------------------------------------------------- helpers */

// Helvetica cannot draw ₹, so amounts are written the way a printed invoice
// in India writes them.
const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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
  easebuzz: 'Online (Easebuzz)',
  sslcommerz: 'Online (SSLCommerz)',
  paytm: 'Paytm',
  ccavenue: 'CCAvenue',
  pum: 'PayUmoney',
  stripe: 'Card',
  paypal: 'PayPal',
};

const longDate = (value) => (value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '-');

/* ---------------------------------------------------------- amount in words */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]} ${ONES[rest % 10]}`.trim());
  return parts.join(' ');
}

/** Indian grouping — crore, lakh, thousand — as a printed invoice spells it. */
function indianWords(n) {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  return [
    crore && `${indianWords(crore)} Crore`,
    lakh && `${belowThousand(lakh)} Lakh`,
    thousand && `${belowThousand(thousand)} Thousand`,
    rest && belowThousand(rest),
  ].filter(Boolean).join(' ');
}

export function amountInWords(amount) {
  const rupees = Math.floor(round2(amount));
  const paise = Math.round((round2(amount) - rupees) * 100);
  return `Rupees ${indianWords(rupees)}${paise ? ` and ${indianWords(paise)} Paise` : ''} Only`;
}

/* ------------------------------------------------------------------- data */

/**
 * `shipping_address` comes in two shapes. Orders placed on the PHP site use
 * firstname / lastname / address1 / address2 / zip / phone; orders placed
 * here use name / house_no / area / near_by / c_pincode / mobile.
 */
function billedTo(address = {}) {
  const a = address || {};
  const pin = a.zip || a.c_pincode;
  const phone = a.phone || a.mobile;

  return {
    name: a.name || [a.firstname, a.lastname].filter(Boolean).join(' '),
    lines: [
      a.address1 || a.house_no,
      a.address2 || a.area,
      a.near_by ? `Near ${a.near_by}` : '',
      [a.city, a.state].filter(Boolean).join(', ') + (pin ? ` - ${pin}` : ''),
      a.country && String(a.country).toLowerCase() !== 'india' ? a.country : '',
    ].filter((line) => line && line.trim() && line.trim() !== '-'),
    phone,
    email: a.email,
  };
}

/**
 * The figures printed at the foot. `getOrder` only knows the grand total, tax
 * and shipping; the item total is added up from the lines, and whatever the
 * three do not account for is the coupon discount.
 */
function figures(order) {
  const itemsTotal = round2((order.items || [])
    .reduce((sum, item) => sum + (Number(item.subtotal) || Number(item.price) * (Number(item.qty) || 1) || 0), 0));
  const t = order.totals || {};
  const tax = round2(t.tax);
  const shipping = round2(t.shipping);
  const grandTotal = round2(t.grandTotal);
  const recorded = Number(order.address?.coupon_discount);
  const discount = round2(Number.isFinite(recorded) && recorded > 0
    ? recorded
    : Math.max(0, itemsTotal + tax + shipping - grandTotal));

  return { itemsTotal, discount, shipping, tax, grandTotal };
}

async function loadLogo(pdf, origin, src) {
  if (!origin || !src) return null;
  try {
    const res = await fetch(new URL(src, origin));
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    return isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch {
    return null; // the wordmark is drawn as text instead
  }
}

/* --------------------------------------------------------------- the sheet */

/**
 * @param {object} order   the shape `getOrder` returns
 * @param {object} brand   `getBrand()` — the seller's own details
 * @param {string} gstin   printed only when it is a real GSTIN
 * @param {string} origin  where to fetch the logo from
 */
export async function buildInvoice({ order, brand = {}, gstin = null, origin = null }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${order.code || order.id}`);
  pdf.setAuthor(brand.name || 'Doctor Fresh');

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(pdf, origin, brand.logo);

  const [W, H] = A4;
  const left = MARGIN;
  const right = W - MARGIN;
  const width = right - left;
  const FOOTER_TOP = 70;

  let page;
  let y;

  const text = (value, x, atY, { font = regular, size = 9.5, color = BODY } = {}) => {
    page.drawText(printable(value), { x, y: atY, size, font, color });
  };
  const textRight = (value, x, atY, { font = regular, size = 9.5, color = BODY } = {}) => {
    const s = printable(value);
    page.drawText(s, { x: x - font.widthOfTextAtSize(s, size), y: atY, size, font, color });
  };
  const box = (x, atY, w, h, color) => page.drawRectangle({ x, y: atY, width: w, height: h, color });
  const rule = (atY, x1 = left, x2 = right, color = LINE, thickness = 0.75) => {
    page.drawLine({ start: { x: x1, y: atY }, end: { x: x2, y: atY }, thickness, color });
  };

  const isTaxInvoice = Boolean(gstin);
  const title = isTaxInvoice ? 'TAX INVOICE' : 'INVOICE';
  const office = brand.offices?.[0]?.address || brand.address || '';
  const who = billedTo(order.address);
  const sums = figures(order);
  const paymentLabel = PAYMENT_LABEL[order.paymentType] || PAYMENT_LABEL[order.address?.payment] || 'Cash on delivery';

  /* ---------------------------------------------------------------- footer */

  const drawFooter = (pageNumber, pageCount) => {
    box(0, 0, W, FOOTER_TOP - 22, WASH);
    rule(FOOTER_TOP - 22, 0, W, LINE);
    text('Thank you for choosing Doctor Fresh.', left, 28, { font: bold, size: 9, color: INK });
    text('This is a computer-generated invoice.', left, 16, { size: 8, color: MUTED });
    const contact = [brand.phone, brand.email, brand.website].filter(Boolean).join('   |   ');
    textRight(contact, right, 28, { size: 8, color: BODY });
    textRight(`Page ${pageNumber} of ${pageCount}`, right, 16, { size: 8, color: MUTED });
  };

  /* ---------------------------------------------------------------- header */

  const drawHeader = () => {
    page = pdf.addPage(A4);
    box(0, H - 6, W, 6, BRAND);
    y = H - 34;

    // Seller, top left.
    if (logo) {
      const h = 32;
      const w = (logo.width / logo.height) * h;
      page.drawImage(logo, { x: left, y: y - h + 8, width: w, height: h });
      y -= h + 4;
    } else {
      text(brand.name || 'Doctor Fresh', left, y - 14, { font: bold, size: 20, color: INK });
      y -= 30;
    }

    let sellerY = y - 6;
    for (const line of wrap(office, regular, 8.5, 250).slice(0, 3)) {
      text(line, left, sellerY, { size: 8.5 });
      sellerY -= 11;
    }
    const contactLine = [brand.phone && `Ph: ${brand.phone}`, brand.email].filter(Boolean).join('   ');
    if (contactLine) { text(contactLine, left, sellerY, { size: 8.5 }); sellerY -= 11; }
    if (gstin) { text(`GSTIN: ${gstin}`, left, sellerY, { font: bold, size: 8.5, color: INK }); sellerY -= 11; }

    // Document title and reference, top right.
    textRight(title, right, H - 44, { font: bold, size: 22, color: BRAND_DARK });

    const meta = [
      ['Invoice No.', String(order.code || order.id)],
      ['Invoice Date', longDate(order.placedAt)],
      ['Order ID', `#${order.id}`],
    ];
    let metaY = H - 66;
    const labelX = right - 170;
    for (const [label, value] of meta) {
      text(label, labelX, metaY, { size: 8.5, color: MUTED });
      textRight(value, right, metaY, { font: bold, size: 9, color: INK });
      metaY -= 14;
    }

    // Status pill.
    const status = order.paid ? 'PAID' : 'PAYMENT DUE';
    const pillW = bold.widthOfTextAtSize(status, 8) + 16;
    page.drawRectangle({
      x: right - pillW, y: metaY - 5, width: pillW, height: 15,
      color: order.paid ? rgb(0.9, 0.97, 0.93) : rgb(0.99, 0.93, 0.93),
      borderColor: order.paid ? PAID : DUE, borderWidth: 0.75,
    });
    textRight(status, right - 8, metaY, { font: bold, size: 8, color: order.paid ? PAID : DUE });
    metaY -= 18;

    y = Math.min(sellerY, metaY) - 10;
    rule(y, left, right, LINE, 1);
  };

  /* -------------------------------------------------------------- parties */

  const drawParties = () => {
    const colGap = 24;
    const colW = (width - colGap) / 2;
    const top = y - 14;
    const pad = 12;

    const billLines = [];
    if (who.name) billLines.push({ s: who.name, font: bold, size: 11, color: INK, gap: 15 });
    for (const line of who.lines) {
      for (const w of wrap(line, regular, 9, colW - pad * 2)) billLines.push({ s: w, size: 9, gap: 12 });
    }
    if (who.phone) billLines.push({ s: `Phone: ${who.phone}`, size: 9, gap: 12 });
    if (who.email) billLines.push({ s: who.email, size: 9, gap: 12 });

    const payLines = [
      ['Payment method', paymentLabel],
      ['Payment status', order.paid ? 'Paid' : 'Due'],
      ['Amount', money(sums.grandTotal)],
    ];

    const billHeight = 30 + billLines.reduce((h, l) => h + l.gap, 0) + pad;
    const payHeight = 30 + payLines.length * 17 + pad;
    const height = Math.max(billHeight, payHeight, 96);

    for (const [x, heading] of [[left, 'BILLED & SHIPPED TO'], [left + colW + colGap, 'PAYMENT DETAILS']]) {
      page.drawRectangle({
        x, y: top - height, width: colW, height, color: WASH, borderColor: LINE, borderWidth: 0.75,
      });
      text(heading, x + pad, top - 18, { font: bold, size: 8, color: BRAND_DARK });
    }

    let by = top - 36;
    for (const l of billLines) {
      text(l.s, left + pad, by, { font: l.font || regular, size: l.size, color: l.color || BODY });
      by -= l.gap;
    }

    let py = top - 36;
    const px = left + colW + colGap + pad;
    const pr = left + colW * 2 + colGap - pad;
    for (const [label, value] of payLines) {
      text(label, px, py, { size: 9, color: MUTED });
      const color = label === 'Payment status' ? (order.paid ? PAID : DUE) : INK;
      textRight(value, pr, py, { font: bold, size: 9.5, color });
      py -= 17;
    }

    y = top - height - 20;
  };

  /* ---------------------------------------------------------------- items */

  const COLS = {
    num: left + 10,
    desc: left + 34,
    qty: left + width * 0.66,
    rate: left + width * 0.83,
    amount: right - 10,
  };
  const descWidth = COLS.qty - COLS.desc - 40;

  const drawTableHead = () => {
    box(left, y - 22, width, 24, INK);
    const headY = y - 14;
    text('#', COLS.num, headY, { font: bold, size: 8.5, color: WHITE });
    text('ITEM DESCRIPTION', COLS.desc, headY, { font: bold, size: 8.5, color: WHITE });
    textRight('QTY', COLS.qty, headY, { font: bold, size: 8.5, color: WHITE });
    textRight('UNIT PRICE', COLS.rate, headY, { font: bold, size: 8.5, color: WHITE });
    textRight('AMOUNT', COLS.amount, headY, { font: bold, size: 8.5, color: WHITE });
    y -= 24;
  };

  drawHeader();
  drawParties();
  drawTableHead();

  (order.items || []).forEach((item, index) => {
    const lines = wrap(item.name || 'Item', regular, 9.5, descWidth);
    const rowHeight = Math.max(26, 14 + lines.length * 12);

    // Leave room for the totals block on the last page as well as the footer.
    if (y - rowHeight < FOOTER_TOP + 20) {
      drawHeader();
      drawTableHead();
    }

    if (index % 2 === 1) box(left, y - rowHeight, width, rowHeight, WASH);

    const qty = Number(item.qty) || 1;
    const lineTotal = Number(item.subtotal) || Number(item.price) * qty;
    const firstY = y - 16;

    text(String(index + 1), COLS.num, firstY, { size: 9.5, color: MUTED });
    lines.forEach((line, i) => text(line, COLS.desc, firstY - i * 12, { size: 9.5, color: INK }));
    textRight(String(qty), COLS.qty, firstY, { size: 9.5 });
    textRight(money(item.price), COLS.rate, firstY, { size: 9.5 });
    textRight(money(lineTotal), COLS.amount, firstY, { font: bold, size: 9.5, color: INK });

    y -= rowHeight;
    rule(y);
  });

  /* --------------------------------------------------------------- totals */

  const totalRows = [
    ['Subtotal', money(sums.itemsTotal)],
    sums.discount > 0 ? ['Discount', `- ${money(sums.discount)}`] : null,
    ['Shipping', sums.shipping > 0 ? money(sums.shipping) : 'Free'],
    [isTaxInvoice ? 'GST' : 'Tax', money(sums.tax)],
  ].filter(Boolean);

  const ROW = 18;
  const GRAND = 30;
  const totalsHeight = 12 + totalRows.length * ROW + 8 + GRAND;
  // Words, terms and signature sit beside and below the totals.
  const blockHeight = Math.max(totalsHeight, 70) + 90;

  if (y - blockHeight < FOOTER_TOP + 10) drawHeader();

  const totalsW = 230;
  const tx = right - totalsW;
  let ty = y - 12;

  // Each row owns its band, so nothing is ever drawn over the row above it.
  for (const [label, value] of totalRows) {
    const baseline = ty - 13;
    text(label, tx + 10, baseline, { size: 9.5 });
    textRight(value, right - 10, baseline, {
      size: 9.5,
      color: label === 'Discount' ? PAID : INK,
      font: label === 'Discount' ? bold : regular,
    });
    ty -= ROW;
  }

  ty -= 8;
  box(tx, ty - GRAND, totalsW, GRAND, BRAND);
  text('GRAND TOTAL', tx + 10, ty - 19, { font: bold, size: 10, color: WHITE });
  textRight(money(sums.grandTotal), right - 10, ty - 19.5, { font: bold, size: 12, color: WHITE });
  const totalsBottom = ty - GRAND;

  // Amount in words, beside the totals.
  const wordsW = tx - left - 24;
  let wy = y - 26;
  text('AMOUNT IN WORDS', left, wy, { font: bold, size: 8, color: BRAND_DARK });
  wy -= 14;
  for (const line of wrap(amountInWords(sums.grandTotal), bold, 9.5, wordsW)) {
    text(line, left, wy, { font: bold, size: 9.5, color: INK });
    wy -= 13;
  }

  wy -= 10;
  text('NOTES', left, wy, { font: bold, size: 8, color: BRAND_DARK });
  wy -= 13;
  const notes = [
    `For support call ${brand.phone || 'us'}${brand.email ? ` or write to ${brand.email}` : ''}.`,
    'Billing terms: doctorfresh.in/legal/billing-terms-and-conditions',
  ];
  for (const note of notes) {
    for (const line of wrap(note, regular, 8.5, wordsW)) {
      text(line, left, wy, { size: 8.5, color: BODY });
      wy -= 11;
    }
  }

  // Signature, under the totals.
  const signTop = Math.min(totalsBottom, wy) - 28;
  textRight(`For ${brand.name || 'Doctor Fresh'}`, right, signTop, { font: bold, size: 9.5, color: INK });
  rule(signTop - 30, right - 150, right, BODY, 0.6);
  textRight('Authorised Signatory', right, signTop - 42, { size: 8.5, color: MUTED });

  /* ------------------------------------------------------------ finishing */

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p;
    drawFooter(i + 1, pages.length);
  });

  return pdf.save();
}

/** A file name a customer can find again on their desktop. */
export function invoiceFileName(order) {
  const ref = String(order.code || order.id || 'order').replace(/[^A-Za-z0-9-]+/g, '-');
  return `doctor-fresh-invoice-${ref}.pdf`;
}

/**
 * `business_settings.gst_in_number` currently holds a template placeholder
 * ("ABCXXXXX…"), not a registration. Printing it — or titling the document a
 * tax invoice without one — would put a false GSTIN on a customer's invoice,
 * so it is used only when it has the shape of a real one.
 */
export function realGstin(value) {
  const v = String(value || '').trim().toUpperCase();
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v) ? v : null;
}
