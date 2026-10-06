'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Download, Check, Loader2 } from 'lucide-react';
import { cx, formatDateTime } from '@/lib/utils';
import { MESSAGE_STATUSES } from '@/lib/admin/message-status';
import { Can } from '@/components/admin/AdminAccess';

/** A message's status, changed where it is read. */
function StatusPicker({ id, name, status }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(next) {
    const previous = value;
    setValue(next);
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save.');
      router.refresh();
    } catch (err) {
      // Put the control back where it was: the message did not move.
      setValue(previous);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <span className="relative">
        <select
          value={value}
          onChange={(e) => save(e.target.value)}
          disabled={busy}
          aria-label={`Status of the message from ${name || 'this customer'}`}
          className={cx(
            'h-8 cursor-pointer appearance-none rounded-lg border bg-white py-0 pl-2.5 pr-7 text-[13px] font-medium outline-none transition-colors disabled:opacity-60',
            value === 'resolved' ? 'border-success text-success'
              : value === 'in_progress' ? 'border-warning text-warning'
                : 'border-primary-400 text-primary-700',
          )}
        >
          {MESSAGE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-300">
          {busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
        </span>
      </span>
      {error ? <span className="text-[12px] text-danger">{error}</span> : null}
    </span>
  );
}

/** Hidden from anyone whose role cannot edit here; the server checks again. */
export function MessageStatus(props) {
  return (
    <Can section="messages" action="edit">
      <StatusPicker {...props} />
    </Can>
  );
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;

/**
 * Refresh, and the list as a spreadsheet.
 *
 * The export takes what is on screen — the current filter and search — because
 * that is what somebody means when they ask for "these messages in Excel".
 */
export default function MessageTools({ rows = [], filename = 'messages' }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function exportCsv() {
    const head = ['Name', 'Mobile', 'Email', 'Subject', 'Status', 'Message', 'Details', 'Received'];
    const body = rows.map((m) => [
      m.name, m.mobile, m.email, m.subject,
      MESSAGE_STATUSES.find((s) => s.id === m.status)?.label || m.status,
      m.message,
      (m.fields || []).map(([k, v]) => `${k}: ${v}`).join(' | '),
      m.at ? formatDateTime(m.at) : '',
    ].map(csvCell).join(','));

    // The BOM is what makes Excel read the rupee sign and Hindi names right.
    const blob = new Blob([`﻿${[head.map(csvCell).join(','), ...body].join('\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => start(() => router.refresh())}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 text-[13.5px] font-medium text-ink-700 transition-colors hover:border-primary-300 hover:text-primary-700"
      >
        <RefreshCw size={14} className={cx(pending && 'animate-spin')} aria-hidden="true" />
        Refresh
      </button>
      <button
        type="button"
        onClick={exportCsv}
        disabled={!rows.length}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
      >
        <Download size={14} aria-hidden="true" />
        Export
      </button>
    </span>
  );
}
