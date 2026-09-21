'use client';

import {
  useMemo, useRef, useState, useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw, Search, Eye, CheckCircle2, Ban, Copy, Trash2, RotateCcw, FileDown, Phone, Mail, MapPin,
  Package, ChevronLeft, ChevronRight, Plus, Pencil, FileSpreadsheet, Loader2, FlaskConical, X, Settings2,
} from 'lucide-react';
import RangeSelect from '@/components/admin/RangeSelect';
import StatusPill from '@/components/admin/StatusPill';
import { useCan } from '@/components/admin/AdminAccess';
import { cx, formatPrice } from '@/lib/utils';

const PER_PAGE = 25;

/** An email in lower case or a phone's last 10 digits — as the server stores test contacts. */
const contactKey = (value) => {
  const v = String(value ?? '').trim();
  if (v.includes('@')) return v.toLowerCase();
  const digits = v.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
};

const PAYMENT_TABS = [
  { id: '', label: 'All Orders' },
  { id: 'success', label: 'Success' },
  { id: 'pending', label: 'Pending' },
  { id: 'cod', label: 'COD' },
  { id: 'failure', label: 'Failure' },
];

const DELIVERY_LABEL = {
  pending: 'Pending', shipped: 'Shipped', delivered: 'Delivered', 'order cancelled': 'Cancelled',
};

const when = (ms) => (ms ? new Date(ms).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
}) : '');

function paymentBadge(row) {
  if (row.payment === 'success') return { text: row.paymentType === 'cash_on_delivery' ? 'COD - Paid' : 'Paid', tone: 'border-success/40 bg-success/10 text-success' };
  if (row.payment === 'cod') return row.meta.codCollected
    ? { text: 'COD - Collected', tone: 'border-success/40 bg-success/10 text-success' }
    : { text: 'COD - Pending', tone: 'border-warning/50 bg-warning/10 text-warning' };
  if (row.payment === 'failure') return { text: 'Failed', tone: 'border-danger/40 bg-danger/10 text-danger' };
  return { text: 'Pending', tone: 'border-line-strong bg-surface-muted text-ink-500' };
}

/** A CSV the team opens in Excel: one line per order, with its notes. */
function exportCsv(list) {
  const head = ['Order', 'Date', 'Customer', 'Mobile', 'Email', 'Address', 'PIN', 'Products', 'Amount', 'Payment', 'Payment via',
    'Delivery', 'Courier', 'Tracking', 'Stage', 'Remarks'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const lines = list.map((r) => [
    r.code || r.id, when(r.placedAt), r.customer.name, r.customer.mobile, r.customer.email, r.customer.address, r.customer.pincode,
    r.items.map((i) => `${i.name} x ${i.qty}`).join('; '), r.total, paymentBadge(r).text,
    r.paymentType === 'cash_on_delivery' ? 'Cash on delivery' : r.paymentType, DELIVERY_LABEL[r.delivery] || r.delivery,
    r.meta.courier, r.meta.tracking, r.meta.stage, r.meta.remarks.map((m, i) => `Call ${i + 1}: ${m.text}`).join(' | '),
  ].map(esc).join(','));
  // The BOM tells Excel the file is UTF-8, so ₹ and Hindi names come out right.
  const blob = new Blob([`﻿${[head.map(esc).join(','), ...lines].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `doctorfresh-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function OrdersBoard({
  rows: initialRows, stages, couriers, deliveryStatuses, ranges, rangeId, testContacts: initialContacts = [],
}) {
  const router = useRouter();
  const allow = useCan();
  const [refreshing, startRefresh] = useTransition();
  const [rows, setRows] = useState(initialRows);
  const [stage, setStage] = useState('active');
  const [payment, setPayment] = useState('');
  const [showTest, setShowTest] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const scroller = useRef(null);
  const [testContacts, setTestContacts] = useState(initialContacts);
  const [contactsOpen, setContactsOpen] = useState(false);

  // A test order: marked "Test", or placed from a test phone / email and not
  // marked "Not test".
  const testKeys = useMemo(() => new Set(testContacts), [testContacts]);
  const isTest = (r) => r.meta.isTest || (!r.meta.notTest && [r.customer?.mobile, r.customer?.email]
    .some((c) => testKeys.has(contactKey(c))));

  // A fresh server list (after Refresh) replaces the local copy.
  const [seen, setSeen] = useState(initialRows);
  if (seen !== initialRows) { setSeen(initialRows); setRows(initialRows); }

  const testCount = useMemo(() => rows.filter(isTest).length, [rows, testKeys]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(() => rows.filter((r) => showTest || !isTest(r)), [rows, showTest, testKeys]); // eslint-disable-line react-hooks/exhaustive-deps
  const stageCount = (id) => (id === 'all' ? visible.length : visible.filter((r) => r.meta.stage === id).length);
  const inStage = useMemo(() => (stage === 'all' ? visible : visible.filter((r) => r.meta.stage === stage)), [visible, stage]);
  const payCount = (id) => (id ? inStage.filter((r) => r.payment === id).length : inStage.length);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return inStage
      .filter((r) => !payment || r.payment === payment)
      .filter((r) => !term || [
        r.code, r.id, r.total, r.customer.name, r.customer.mobile, r.customer.email, r.customer.address,
        r.meta.tracking, r.meta.courier, ...r.items.map((i) => i.name),
      ].join(' ').toLowerCase().includes(term));
  }, [inStage, payment, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const say = (ok, text) => setNotice({ ok, text });

  /* ------------------------------------------------------------ writes */

  async function meta(ids, patch, label) {
    setBusy(label || 'saving');
    const res = await fetch('/api/admin/orders/meta', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, patch }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy('');
    if (!res?.ok || !data?.ok) { say(false, data?.error || 'Could not save the change.'); return false; }
    setRows((list) => list.map((r) => (data.meta[r.id] ? { ...r, meta: data.meta[r.id] } : r)));
    return true;
  }

  async function order(saleId, patch) {
    setBusy(`order-${saleId}`);
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ saleId, ...patch }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy('');
    if (!res?.ok || !data?.ok) { say(false, data?.error || 'Could not save the change.'); return false; }
    setRows((list) => list.map((r) => {
      if (r.id !== saleId) return r;
      const next = { ...r };
      if (patch.delivery) next.delivery = patch.delivery;
      if (patch.paid !== undefined) {
        next.paid = patch.paid;
        next.payment = patch.paid ? 'success' : r.paymentType === 'cash_on_delivery' ? 'cod' : 'pending';
      }
      return next;
    }));
    return true;
  }

  async function moveTo(ids, target) {
    if (target === 'deleted') {
      // eslint-disable-next-line no-alert
      if (!window.confirm(`Move ${ids.length} order${ids.length === 1 ? '' : 's'} to Deleted? They can be restored from the Deleted tab.`)) return;
    }
    if (await meta(ids, { stage: target }, `stage-${target}`)) {
      say(true, `${ids.length} order${ids.length === 1 ? '' : 's'} moved to ${stages.find((s) => s.id === target)?.label}.`);
      setSelected(new Set());
    }
  }

  async function toggleCod(row, collected) {
    // Collecting COD cash marks the order paid too, the way the PHP panel reads it.
    if (await meta([row.id], { codCollected: collected })) await order(row.id, { paid: collected });
  }

  /* ------------------------------------------------------------ render */

  const tab = (active) => cx(
    'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
    active ? 'bg-white text-ink-900 shadow-sm ring-1 ring-line' : 'text-ink-500 hover:text-ink-900',
  );
  const count = (active, n) => <span className={cx('text-[11.5px] tabular-nums', active ? 'text-primary-700' : 'text-ink-300')}>{n}</span>;

  return (
    <div className="space-y-4">
      {/* ------------------------------------------- header, tabs, search */}
      <div className="rounded-2xl border border-line bg-white">
        {/* title + tools */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2.5 pt-3.5 md:px-5">
          <div className="min-w-0">
            <h1 className="text-[19px] font-bold leading-tight text-ink-900">Orders Dashboard</h1>
            <p className="text-[12.5px] text-ink-400">Delivery, courier, payment tracking and call remarks.</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* A switch, so it reads as what is happening now: off = test orders hidden. */}
            <button
              type="button"
              role="switch"
              aria-checked={showTest}
              onClick={() => { setShowTest((v) => !v); setPage(1); }}
              title={showTest ? 'Test orders are shown — click to hide them' : 'Test orders are hidden — click to show them'}
              className={cx('inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors', showTest ? 'border-warning/50 bg-warning/10 text-ink-900' : 'border-line-strong text-ink-700 hover:border-primary-300')}
            >
              <span className={cx('relative h-4 w-7 shrink-0 rounded-full transition-colors', showTest ? 'bg-warning' : 'bg-ink-300')}>
                <span className={cx('absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all', showTest ? 'left-3.5' : 'left-0.5')} />
              </span>
              {showTest ? 'Test orders shown' : 'Test orders hidden'}
              <span className="rounded-full bg-surface-muted px-1.5 text-[11px] tabular-nums text-ink-500">{testCount}</span>
            </button>

            <span className="relative">
              <button
                type="button"
                onClick={() => setContactsOpen((v) => !v)}
                aria-expanded={contactsOpen}
                title="Phone numbers / emails you place test orders from"
                className={cx('inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors', contactsOpen ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-line-strong text-ink-700 hover:border-primary-300')}
              >
                <Settings2 size={14} aria-hidden="true" />
                Test numbers
                <span className="rounded-full bg-surface-muted px-1.5 text-[11px] tabular-nums text-ink-500">{testContacts.length}</span>
              </button>
              {contactsOpen ? (
                <TestContacts
                  contacts={testContacts}
                  canEdit={allow('orders', 'edit')}
                  onClose={() => setContactsOpen(false)}
                  onSaved={(list) => { setTestContacts(list); say(true, 'Test numbers saved.'); }}
                  onError={(text) => say(false, text)}
                />
              ) : null}
            </span>

            <button
              type="button"
              onClick={() => startRefresh(() => router.refresh())}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-900 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-700"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>

        {/* stage + payment tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 md:px-5">
          <nav className="flex flex-wrap gap-0.5 rounded-lg bg-surface-muted p-0.5" aria-label="Order stage">
            {[...stages, { id: 'all', label: 'All' }].map((s) => (
              <button key={s.id} type="button" onClick={() => { setStage(s.id); setPage(1); setSelected(new Set()); }} className={tab(stage === s.id)}>
                {s.label}
                {count(stage === s.id, stageCount(s.id))}
              </button>
            ))}
          </nav>

          <nav className="flex flex-wrap gap-1" aria-label="Payment">
            {PAYMENT_TABS.map((p) => (
              <button
                key={p.id || 'all'}
                type="button"
                onClick={() => { setPayment(p.id); setPage(1); }}
                className={cx(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors',
                  payment === p.id ? 'border-primary-600 bg-primary-600 text-white' : 'border-line-strong bg-white text-ink-700 hover:border-primary-300',
                )}
              >
                {p.label}
                <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', payment === p.id ? 'bg-white/25' : 'bg-surface-muted text-ink-400')}>{payCount(p.id)}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* search + range + export */}
        <div className="border-t border-line px-4 py-2.5 md:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="relative min-w-0 flex-1 basis-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search customer, phone, order ID, amount, product or tracking…"
                aria-label="Search orders"
                className="h-9 w-full rounded-lg border border-line-strong pl-9 pr-8 text-[13.5px] outline-none focus:border-primary-500"
              />
              {q ? <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-300 hover:text-ink-700"><X size={14} aria-hidden="true" /></button> : null}
            </span>
            <RangeSelect ranges={ranges} value={rangeId} basePath="/admin/orders" />
            <button
              type="button"
              onClick={() => exportCsv(selected.size ? filtered.filter((r) => selected.has(r.id)) : filtered)}
              disabled={!filtered.length}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success px-3 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              <FileSpreadsheet size={15} aria-hidden="true" />
              {selected.size ? `Export ${selected.size}` : 'Export Excel'}
            </button>
          </div>

          <div className="mt-2 flex min-h-7 flex-wrap items-center gap-2 text-[12.5px] text-ink-500">
            <span>
              Showing <b className="font-semibold text-ink-900">{shown.length}</b> of <b className="font-semibold text-ink-900">{filtered.length}</b> orders
            </span>
            <span className="text-ink-300">·</span>
            <span>{`${selected.size} selected`}</span>
            {filtered.length ? (
              <button
                type="button"
                onClick={() => setSelected(allFilteredSelected ? new Set() : new Set(filtered.map((r) => r.id)))}
                className="font-medium text-primary-700 hover:underline"
              >
                {allFilteredSelected ? 'Clear selection' : `Select all ${filtered.length}`}
              </button>
            ) : null}

            {selected.size && allow('orders', 'edit') ? (
              <span className="ml-1 flex flex-wrap gap-1.5">
                {stage !== 'completed' ? <Action tone="success" icon={CheckCircle2} label="Done" onClick={() => moveTo([...selected], 'completed')} /> : null}
                {stage !== 'not_interested' ? <Action tone="warning" icon={Ban} label="Not Interested" onClick={() => moveTo([...selected], 'not_interested')} /> : null}
                {stage !== 'duplicate' ? <Action tone="violet" icon={Copy} label="Duplicate" onClick={() => moveTo([...selected], 'duplicate')} /> : null}
                {stage !== 'active' && stage !== 'all' ? <Action tone="dark" icon={RotateCcw} label="Back to Active" onClick={() => moveTo([...selected], 'active')} /> : null}
                {stage !== 'deleted' && allow('orders', 'delete') ? <Action tone="danger" icon={Trash2} label="Delete" onClick={() => moveTo([...selected], 'deleted')} /> : null}
              </span>
            ) : null}

            {/* the table is wide: scroll it sideways */}
            <span className="ml-auto flex gap-1">
              <button type="button" onClick={() => scroller.current?.scrollBy({ left: -500, behavior: 'smooth' })} aria-label="Scroll left" className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong text-ink-500 hover:border-primary-400"><ChevronLeft size={16} aria-hidden="true" /></button>
              <button type="button" onClick={() => scroller.current?.scrollBy({ left: 500, behavior: 'smooth' })} aria-label="Scroll right" className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong text-ink-500 hover:border-primary-400"><ChevronRight size={16} aria-hidden="true" /></button>
            </span>
          </div>

          {notice ? (
            <p role="status" className={cx('mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px]', notice.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
              {notice.text}
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="ml-auto"><X size={14} aria-hidden="true" /></button>
            </p>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------------ table */}
      <div className="rounded-2xl border border-line bg-white">
        <div ref={scroller} className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1850px] text-left text-[13.5px]">
            <thead className="sticky top-0 z-10 bg-surface-muted text-[12px] font-semibold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={shown.length > 0 && shown.every((r) => selected.has(r.id))}
                    onChange={(e) => setSelected((s) => {
                      const next = new Set(s);
                      shown.forEach((r) => (e.target.checked ? next.add(r.id) : next.delete(r.id)));
                      return next;
                    })}
                    className="h-4 w-4 accent-primary-500"
                  />
                </th>
                <th className="min-w-72 px-3 py-3">Customer</th>
                <th className="min-w-64 px-3 py-3">Address</th>
                <th className="min-w-72 px-3 py-3">Remarks</th>
                <th className="min-w-64 px-3 py-3">Products</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="min-w-36 px-3 py-3">Date</th>
                <th className="px-3 py-3">Payment status</th>
                <th className="px-3 py-3">COD payment</th>
                <th className="px-3 py-3">Delivery status</th>
                <th className="px-3 py-3">Delivery method</th>
                <th className="px-3 py-3">Tracking no.</th>
                <th className="px-3 py-3">Payment via</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {shown.map((r) => (
                <OrderRow
                  key={r.id}
                  row={r}
                  test={isTest(r)}
                  selected={selected.has(r.id)}
                  onSelect={(on) => setSelected((s) => { const n = new Set(s); if (on) n.add(r.id); else n.delete(r.id); return n; })}
                  stage={stage}
                  couriers={couriers}
                  deliveryStatuses={deliveryStatuses}
                  busy={busy}
                  allow={allow}
                  moveTo={moveTo}
                  meta={meta}
                  order={order}
                  toggleCod={toggleCod}
                />
              ))}
              {!shown.length ? (
                <tr><td colSpan={13} className="px-4 py-16 text-center text-ink-400">
                  <Package size={28} className="mx-auto text-ink-300" aria-hidden="true" />
                  <p className="mt-2 font-medium text-ink-700">No orders here</p>
                  <p className="text-[13px]">Try another tab, date or search.</p>
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {pages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[13px] text-ink-500">
            <span>{`Page ${current} of ${pages}`}</span>
            <div className="flex gap-1.5">
              <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="h-8 rounded-lg border border-line-strong px-3 disabled:opacity-40">Previous</button>
              <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="h-8 rounded-lg border border-line-strong px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- row */

const TONES = {
  success: 'bg-success text-white hover:opacity-90',
  warning: 'bg-warning text-white hover:opacity-90',
  violet: 'bg-violet-600 text-white hover:opacity-90',
  danger: 'bg-danger text-white hover:opacity-90',
  dark: 'bg-ink-900 text-white hover:bg-primary-700',
  blue: 'bg-primary-500 text-white hover:bg-primary-700',
  plain: 'border border-line-strong bg-white text-ink-700 hover:border-primary-400',
};

function Action({
  tone, icon: Icon, label, onClick, href, download, disabled,
}) {
  const cls = cx('inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] font-semibold transition-opacity disabled:opacity-40', TONES[tone]);
  const body = <><Icon size={13} aria-hidden="true" />{label}</>;
  if (href) return <a href={href} className={cls} download={download} target={download ? undefined : '_blank'} rel="noreferrer">{body}</a>;
  return <button type="button" onClick={onClick} disabled={disabled} className={cls}>{body}</button>;
}

function OrderRow({
  row: r, test, selected, onSelect, stage, couriers, deliveryStatuses, busy, allow, moveTo, meta, order, toggleCod,
}) {
  const [remark, setRemark] = useState('');
  const [tracking, setTracking] = useState(r.meta.tracking);
  const canEdit = allow('orders', 'edit');
  const pay = paymentBadge(r);
  const cod = r.paymentType === 'cash_on_delivery';
  const remarks = r.meta.remarks;

  async function addRemark() {
    if (!remark.trim()) return;
    if (await meta([r.id], { addRemark: remark })) setRemark('');
  }

  function editLast() {
    const index = remarks.length - 1;
    if (index < 0) return;
    // eslint-disable-next-line no-alert
    const text = window.prompt('Edit the last remark', remarks[index].text);
    if (text !== null && text.trim()) meta([r.id], { editRemark: { index, text } });
  }

  return (
    <tr className={cx('transition-colors', selected ? 'bg-primary-50/60' : 'hover:bg-surface-muted/60', test && 'opacity-70')}>
      <td className="px-3 py-3">
        <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} aria-label={`Select order ${r.code}`} className="h-4 w-4 accent-primary-500" />
      </td>

      {/* customer + actions */}
      <td className="px-3 py-3">
        <p className="font-semibold capitalize text-ink-900">
          {r.customer.name || '—'}
          {test ? <span className="ml-1.5 rounded bg-warning/15 px-1.5 text-[10.5px] font-bold uppercase text-warning">Test</span> : null}
        </p>
        <p className="text-[12px] text-ink-400">{`Order: ${r.code || r.id}${r.guest ? ' · guest' : ''}`}</p>
        {r.customer.mobile ? (
          <a href={`tel:${r.customer.mobile}`} className="mt-0.5 flex items-center gap-1 text-[12.5px] text-primary-700 hover:underline"><Phone size={12} aria-hidden="true" />{r.customer.mobile}</a>
        ) : null}
        {r.customer.email ? <p className="flex items-center gap-1 truncate text-[12px] text-ink-400"><Mail size={12} aria-hidden="true" />{r.customer.email}</p> : null}

        <div className="mt-2 flex flex-wrap gap-1">
          {canEdit && r.meta.stage !== 'completed' ? <Action tone="success" icon={CheckCircle2} label="Done" onClick={() => moveTo([r.id], 'completed')} disabled={Boolean(busy)} /> : null}
          {canEdit && r.meta.stage !== 'not_interested' ? <Action tone="warning" icon={Ban} label="Not Interested" onClick={() => moveTo([r.id], 'not_interested')} disabled={Boolean(busy)} /> : null}
          {canEdit && r.meta.stage !== 'duplicate' ? <Action tone="violet" icon={Copy} label="Duplicate" onClick={() => moveTo([r.id], 'duplicate')} disabled={Boolean(busy)} /> : null}
          {canEdit && r.meta.stage !== 'active' ? <Action tone="plain" icon={RotateCcw} label="Active" onClick={() => moveTo([r.id], 'active')} disabled={Boolean(busy)} /> : null}
          {allow('orders', 'delete') && r.meta.stage !== 'deleted' ? <Action tone="danger" icon={Trash2} label="Delete" onClick={() => moveTo([r.id], 'deleted')} disabled={Boolean(busy)} /> : null}
          <Action tone="dark" icon={Eye} label="View" href={`/admin/orders/${r.id}`} />
          <Action tone="blue" icon={FileDown} label="PDF" href={`/api/admin/orders/invoice/${r.id}`} download />
          {canEdit ? (
            <Action tone="plain" icon={FlaskConical} label={test ? 'Not test' : 'Test'} onClick={() => meta([r.id], { isTest: !test })} disabled={Boolean(busy)} />
          ) : null}
        </div>
      </td>

      {/* address */}
      <td className="px-3 py-3 text-[12.5px] leading-relaxed text-ink-500">
        {r.customer.address ? (
          <p className="flex gap-1"><MapPin size={12} className="mt-1 shrink-0 text-ink-300" aria-hidden="true" /><span>{r.customer.address}</span></p>
        ) : '—'}
        {r.customer.pincode ? <p className="mt-0.5 pl-4 text-ink-400">{`PIN ${r.customer.pincode}`}</p> : null}
      </td>

      {/* remarks */}
      <td className="px-3 py-3">
        {remarks.length ? (
          <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-violet-200 bg-violet-50/60 p-2">
            {remarks.map((m, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i}>
                <span className="rounded bg-violet-600 px-1.5 text-[10.5px] font-bold text-white">{`Call ${i + 1}`}</span>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-700">{m.text}</p>
                <p className="text-[10.5px] text-ink-400">{`${when(m.at)}${m.by ? ` · ${m.by}` : ''}`}</p>
              </div>
            ))}
          </div>
        ) : null}
        {canEdit ? (
          <div className="mt-1.5 flex gap-1">
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addRemark(); }}
              placeholder="Add remark…"
              className="h-8 min-w-0 flex-1 rounded-md border border-line-strong px-2 text-[12.5px] outline-none focus:border-violet-500"
            />
            <button type="button" onClick={addRemark} aria-label="Add remark" className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500 text-white hover:bg-violet-600"><Plus size={14} aria-hidden="true" /></button>
            {remarks.length ? <button type="button" onClick={editLast} aria-label="Edit the last remark" className="flex h-8 w-8 items-center justify-center rounded-md border border-line-strong text-ink-500 hover:border-violet-400"><Pencil size={13} aria-hidden="true" /></button> : null}
          </div>
        ) : null}
      </td>

      {/* products */}
      <td className="px-3 py-3 text-[12.5px] text-ink-700">
        {r.items.map((i, k) => (
          // eslint-disable-next-line react/no-array-index-key
          <p key={k} className="flex gap-1"><Package size={12} className="mt-1 shrink-0 text-ink-300" aria-hidden="true" /><span>{`${i.name} × ${i.qty} @ ${formatPrice(i.price)} = ${formatPrice(i.subtotal || i.price * i.qty)}`}</span></p>
        ))}
      </td>

      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-ink-900">{formatPrice(r.total)}</td>
      <td className="whitespace-nowrap px-3 py-3 text-[12.5px] text-ink-500">{when(r.placedAt)}</td>

      <td className="px-3 py-3">
        <span className={cx('inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-semibold', pay.tone)}>{pay.text}</span>
      </td>

      {/* COD collected */}
      <td className="px-3 py-3">
        {cod ? (
          <label className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px]">
            <input
              type="checkbox"
              checked={r.meta.codCollected || r.paid}
              disabled={!canEdit || Boolean(busy)}
              onChange={(e) => toggleCod(r, e.target.checked)}
              className="h-4 w-4 accent-success"
            />
            {r.meta.codCollected || r.paid ? <span className="font-semibold text-success">Collected</span> : <span className="font-semibold text-warning">Pending</span>}
          </label>
        ) : <span className="text-[12px] text-ink-300">—</span>}
      </td>

      {/* delivery */}
      <td className="px-3 py-3">
        {canEdit ? (
          <select
            value={r.delivery}
            onChange={(e) => order(r.id, { delivery: e.target.value })}
            disabled={busy === `order-${r.id}`}
            aria-label="Delivery status"
            className="h-8 rounded-lg border border-line-strong bg-white px-2 text-[12.5px] font-medium text-ink-700 outline-none focus:border-primary-500"
          >
            {deliveryStatuses.map((s) => <option key={s} value={s}>{DELIVERY_LABEL[s] || s}</option>)}
          </select>
        ) : <StatusPill status={r.delivery} />}
        {busy === `order-${r.id}` ? <Loader2 size={13} className="ml-1 inline animate-spin text-primary-500" aria-hidden="true" /> : null}
      </td>

      <td className="px-3 py-3">
        <select
          value={r.meta.courier}
          onChange={(e) => meta([r.id], { courier: e.target.value })}
          disabled={!canEdit}
          aria-label="Delivery method"
          className={cx('h-8 max-w-40 rounded-lg border px-2 text-[12.5px] font-medium outline-none focus:border-primary-500', r.meta.courier ? 'border-primary-300 bg-primary-50 text-primary-800' : 'border-line-strong bg-white text-ink-400')}
        >
          <option value="">Not assigned</option>
          {couriers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>

      <td className="px-3 py-3">
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          onBlur={() => { if (tracking.trim() !== r.meta.tracking) meta([r.id], { tracking }); }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          disabled={!canEdit}
          placeholder="Tracking #"
          aria-label="Tracking number"
          className="h-8 w-36 rounded-lg border border-line-strong px-2 text-[12.5px] outline-none focus:border-primary-500"
        />
      </td>

      <td className="px-3 py-3">
        <span className="inline-block whitespace-nowrap rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[12px] font-medium text-primary-800">
          {cod ? 'Cash on delivery' : r.paymentType === 'easebuzz' ? 'Online (Easebuzz)' : r.paymentType || 'Website'}
        </span>
      </td>
    </tr>
  );
}

/**
 * The phones / emails the team places test orders from. Orders from them are
 * treated as tests: hidden until "Show test orders", tagged Test when shown.
 */
function TestContacts({
  contacts, canEdit, onSaved, onError, onClose,
}) {
  const [list, setList] = useState(contacts);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // Adding or removing saves straight away — no separate Save step.
  async function add() {
    const key = contactKey(draft);
    if (!key) { onError('Enter a 10 digit phone number or an email address.'); return; }
    setDraft('');
    if (!list.includes(key)) await save([...list, key]);
  }

  async function save(next) {
    setSaving(true);
    const res = await fetch('/api/admin/orders/meta', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testContacts: next }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok || !data?.ok) { onError(data?.error || 'Could not save the test numbers.'); return; }
    setList(data.testContacts);
    onSaved(data.testContacts);
  }

  return (
    <div className="absolute right-0 top-full z-30 mt-1.5 w-[min(92vw,380px)] rounded-xl border border-line bg-white p-3 text-left shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-ink-900">Test phone numbers &amp; emails</p>
          <p className="text-[12px] leading-snug text-ink-400">Orders from these stay hidden while test orders are off.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-ink-300 hover:bg-surface-muted hover:text-ink-700">
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {list.map((c) => (
          <span key={c} className="inline-flex h-6 items-center gap-0.5 rounded-full border border-line-strong bg-surface-muted/60 pl-2 pr-0.5 text-[12px] text-ink-700">
            {c}
            {canEdit ? (
              <button type="button" onClick={() => save(list.filter((x) => x !== c))} disabled={saving} className="rounded-full p-0.5 text-ink-300 hover:bg-danger/10 hover:text-danger" aria-label={`Remove ${c}`}>
                <X size={11} aria-hidden="true" />
              </button>
            ) : null}
          </span>
        ))}
        {!list.length ? <span className="text-[12px] text-ink-300">None added yet.</span> : null}
      </div>

      {canEdit ? (
        <div className="mt-2.5 flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } if (e.key === 'Escape') onClose(); }}
            placeholder="Phone number or email"
            aria-label="Test phone number or email"
            className="h-8 min-w-0 flex-1 rounded-lg border border-line-strong px-2.5 text-[13px] outline-none focus:border-primary-500"
          />
          <button type="button" onClick={add} disabled={saving} className="inline-flex h-8 items-center gap-1 rounded-lg bg-ink-900 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Plus size={12} aria-hidden="true" />}
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}
