'use client';

import { useMemo, useState } from 'react';
import { MessageCircle, X, Search, CheckCircle2, ImagePlus } from 'lucide-react';
import { cx } from '@/lib/utils';

/**
 * Customers → Send WhatsApp: pick customers from the current list (all of it,
 * not only this page), name the limbu.ai campaign, and send it once
 * (POST /api/admin/whatsapp-campaign).
 */
export default function WhatsAppCampaign({ customers = [] }) {
  const [open, setOpen] = useState(false);
  const [campaign, setCampaign] = useState('diwali_bonus_campaign');
  const [withName, setWithName] = useState(false);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, text }
  // The header image, as a public address: uploaded here or pasted.
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/whatsapp-campaign/media', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not upload the image.');
      setMediaUrl(data.url);
    } catch (err) {
      setResult({ ok: false, text: err.message });
    } finally {
      setUploading(false);
    }
  }

  // Only customers with a mobile number can be messaged.
  const reachable = useMemo(() => customers.filter((c) => /\d{10}/.test(String(c.mobile || '').replace(/\D/g, ''))), [customers]);
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return reachable;
    return reachable.filter((c) => `${c.name} ${c.mobile} ${c.email}`.toLowerCase().includes(q));
  }, [reachable, filter]);

  const allShownSelected = shown.length > 0 && shown.every((c) => selected.has(c.id));

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    shown.forEach((c) => (allShownSelected ? next.delete(c.id) : next.add(c.id)));
    return next;
  });

  async function send() {
    if (!selected.size) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Send "${campaign}" on WhatsApp to ${selected.size} customer(s)? This cannot be undone.`)) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/whatsapp-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: campaign.trim(), ids: [...selected], withName, mediaUrl: mediaUrl.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not send the campaign.');
      setResult({
        ok: true,
        text: `Queued for ${data.sent} customer(s) on limbu.ai — they start sending within a minute.`
          + `${data.invalid ? ` ${data.invalid} number(s) rejected by limbu.ai.` : ''}`
          + `${data.skipped ? ` ${data.skipped} skipped (no valid or repeated number).` : ''}`
          + ' Delivery status is in the campaign report on limbu.ai.',
      });
      setSelected(new Set());
    } catch (err) {
      setResult({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#25D366] px-3 text-[13.5px] font-semibold text-white hover:bg-[#1fb457]"
      >
        <MessageCircle size={16} aria-hidden="true" />
        Send WhatsApp
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/40" onClick={() => !busy && setOpen(false)} role="presentation">
          <div
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Send WhatsApp campaign"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-[17px] font-semibold text-ink-900">Send WhatsApp campaign</h2>
                <p className="text-[12.5px] text-ink-400">To the customers you select from this list</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 border-b border-line px-5 py-4">
              <label className="block">
                <span className="text-[13px] font-medium text-ink-700">Campaign name (as on limbu.ai)</span>
                <input
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-line-strong px-3 text-[14px] text-ink-900 outline-none focus:border-primary-500"
                  placeholder="diwali_bonus_campaign"
                />
              </label>
              <div>
                <span className="text-[13px] font-medium text-ink-700">Header image</span>
                <p className="text-[12px] text-ink-400">
                  For a template with an image header. Without one, the campaign&apos;s saved image is used — which fails once WhatsApp lets it expire (#131053).
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  {mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" />
                  ) : null}
                  <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-muted">
                    <ImagePlus size={15} aria-hidden="true" />
                    {uploading ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => upload(e.target.files?.[0])}
                    />
                  </label>
                  <input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong px-3 text-[13px] text-ink-900 outline-none focus:border-primary-500"
                    placeholder="or paste an https:// image link"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-ink-700">
                <input type="checkbox" checked={withName} onChange={(e) => setWithName(e.target.checked)} />
                Send the customer&apos;s first name as the template&apos;s first parameter
              </label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="h-9 w-full rounded-lg border border-line pl-9 pr-3 text-[13.5px] outline-none focus:border-primary-500"
                  placeholder="Find a customer"
                />
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <label className="flex items-center gap-2 font-medium text-ink-700">
                  <input type="checkbox" checked={allShownSelected} onChange={toggleAll} />
                  Select all{filter ? ' shown' : ''} ({shown.length})
                </label>
                <span className="text-ink-400">{selected.size} selected</span>
              </div>
            </div>

            <ul className="flex-1 divide-y divide-line overflow-y-auto">
              {shown.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-5 py-2.5 hover:bg-surface-muted">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink-900">{c.name || 'No name'}</span>
                      <span className="block text-[12.5px] text-ink-400">{c.mobile}</span>
                    </span>
                    {c.orders ? <span className="rounded-full bg-surface-muted px-2 text-[11.5px] text-ink-500">{c.orders} order(s)</span> : null}
                  </label>
                </li>
              ))}
              {!shown.length ? <li className="px-5 py-10 text-center text-[13.5px] text-ink-400">No customers with a mobile number here.</li> : null}
            </ul>

            <div className="space-y-2 border-t border-line px-5 py-4">
              {result ? (
                <p className={cx('flex items-start gap-2 rounded-lg px-3 py-2 text-[13px]', result.ok ? 'bg-[#e8f7ee] text-[#0a7a50]' : 'bg-[#fdecec] text-danger')}>
                  {result.ok ? <CheckCircle2 size={16} className="mt-px shrink-0" /> : null}
                  {result.text}
                </p>
              ) : null}
              <button
                type="button"
                onClick={send}
                disabled={busy || uploading || !selected.size || !campaign.trim()}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-[14.5px] font-semibold text-white disabled:opacity-50"
              >
                <MessageCircle size={17} aria-hidden="true" />
                {busy ? 'Sending…' : `Send to ${selected.size} customer(s)`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
