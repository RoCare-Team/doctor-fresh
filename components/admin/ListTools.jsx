'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Download } from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * Refresh, and the list as a spreadsheet.
 *
 * The export takes what is on screen — the filter and the search that are
 * applied — because that is what somebody means when they ask for "these in
 * Excel". `columns` is a plain [{ label, key }] list, so one component serves
 * every admin list — and so nothing but data crosses from the server.
 */

const cell = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;

export default function ListTools({ rows = [], columns = [], filename = 'export' }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function exportCsv() {
    const head = columns.map((c) => cell(c.label)).join(',');
    const body = rows.map((row) => columns.map((c) => cell(row[c.key])).join(','));

    // The BOM is what makes Excel read the rupee sign and Hindi names right.
    const blob = new Blob([`﻿${[head, ...body].join('\n')}`], { type: 'text/csv;charset=utf-8;' });
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
