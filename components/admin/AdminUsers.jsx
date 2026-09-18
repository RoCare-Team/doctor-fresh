'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, CheckCircle2, XCircle, ShieldCheck, Search, Mail, Phone, Calendar, MoreVertical,
  Pencil, Power, Trash2, X, Loader2, AlertTriangle, Eye, EyeOff, Wand2, Shield, Crown,
} from 'lucide-react';
import {
  SECTIONS, ACTIONS, ROLES, roleInfo,
} from '@/lib/admin/access';
import { cx } from '@/lib/utils';
import { useCan } from '@/components/admin/AdminAccess';

const initials = (name = '') => String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const dateOf = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');

const ROLE_TONE = {
  owner: 'border-violet-200 bg-violet-50 text-violet-700',
  admin: 'border-primary-200 bg-primary-50 text-primary-800',
  manager: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  sales: 'border-amber-200 bg-amber-50 text-amber-700',
  seo: 'border-sky-200 bg-sky-50 text-sky-700',
  writer: 'border-pink-200 bg-pink-50 text-pink-700',
  viewer: 'border-line-strong bg-surface-muted text-ink-500',
};

/** The Admin users screen: who can sign in, with which role and rights. */
export default function AdminUsers({ users, meId }) {
  const router = useRouter();
  const allow = useCan();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | user
  const [menu, setMenu] = useState(null);
  const [notice, setNotice] = useState('');

  const active = users.filter((u) => u.active).length;
  const owners = users.filter((u) => u.role === 'owner').length;
  const shown = users.filter((u) => !q || [u.name, u.email, u.phone, roleInfo(u.role)?.label || 'custom']
    .join(' ').toLowerCase().includes(q.toLowerCase()));

  async function call(method, url, body) {
    setNotice('');
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) { setNotice(data.error || 'That did not work.'); return false; }
    router.refresh();
    return true;
  }

  const stats = [
    { label: 'Total users', value: users.length, icon: Users, tone: 'text-ink-900', chip: 'bg-primary-50 text-primary-700' },
    { label: 'Active', value: active, icon: CheckCircle2, tone: 'text-success', chip: 'bg-success/12 text-success' },
    { label: 'Inactive', value: users.length - active, icon: XCircle, tone: 'text-danger', chip: 'bg-danger/10 text-danger' },
    { label: 'Owners', value: owners, icon: ShieldCheck, tone: 'text-violet-600', chip: 'bg-violet-50 text-violet-600' },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-ink-900">
            <Users size={22} className="text-primary-600" aria-hidden="true" />
            Admin users
          </h1>
          <p className="mt-0.5 text-[13.5px] text-ink-400">Manage admin users, their roles and what they are allowed to do.</p>
        </div>
        {allow('users', 'create') ? (
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-500 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-primary-700"
        >
          <UserPlus size={17} aria-hidden="true" />
          Add new user
        </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({
          label, value, icon: Icon, tone, chip,
        }) => (
          <div key={label} className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
            <div>
              <p className="text-[13px] font-medium text-ink-400">{label}</p>
              <p className={cx('mt-1 text-[24px] font-bold leading-none', tone)}>{value}</p>
            </div>
            <span className={cx('flex h-11 w-11 items-center justify-center rounded-xl', chip)}>
              <Icon size={21} aria-hidden="true" />
            </span>
          </div>
        ))}
      </div>

      <div className="relative mt-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, phone or role…"
          aria-label="Search admin users"
          className="h-11 w-full rounded-2xl border border-line bg-white pl-10 pr-3 text-[14.5px] outline-none focus:border-primary-500"
        />
      </div>

      {notice ? (
        <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[14px] text-danger">
          <AlertTriangle size={16} aria-hidden="true" />
          {notice}
        </p>
      ) : null}

      {/* Wide screens let the row menu hang below the table instead of being clipped. */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white xl:overflow-visible">
        <table className="w-full min-w-220 text-left text-[14px]">
          <thead className="border-b border-line bg-surface-muted/70 text-[12.5px] font-semibold text-ink-500">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Permissions</th>
              <th className="px-4 py-3">Sections</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((u) => {
              const role = roleInfo(u.role);
              const isMe = Number(u.id) === Number(meId);
              return (
                <tr key={u.id} className={cx('transition-colors hover:bg-primary-50/30', !u.active && 'opacity-60')}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-400 to-primary-700 text-[14px] font-semibold text-white">
                        {initials(u.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                          {u.name || '—'}
                          {isMe ? <span className="rounded bg-surface-muted px-1.5 text-[11px] font-medium text-ink-400">You</span> : null}
                        </p>
                        <p className="flex items-center gap-1 text-[12.5px] text-ink-400"><Mail size={12} aria-hidden="true" />{u.email}</p>
                        {u.phone ? <p className="flex items-center gap-1 text-[12.5px] text-ink-400"><Phone size={12} aria-hidden="true" />{u.phone}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12.5px] font-medium', ROLE_TONE[u.role] || 'border-line-strong bg-white text-ink-700')}>
                      {u.role === 'owner' ? <Crown size={13} aria-hidden="true" /> : <Shield size={13} aria-hidden="true" />}
                      {role?.label || 'Custom'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex max-w-44 flex-wrap gap-1">
                      {u.actions.map((a) => <span key={a} className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[12px] text-ink-500">{a}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span title={u.sections.map((s) => SECTIONS.find((x) => x.id === s)?.label).join(', ')} className="text-[13px] text-ink-500">
                      {u.sections.length === SECTIONS.length ? 'All sections' : `${u.sections.length} of ${SECTIONS.length}`}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-[12.5px] font-medium text-success"><CheckCircle2 size={13} aria-hidden="true" />Active</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 text-[12.5px] font-medium text-danger"><XCircle size={13} aria-hidden="true" />Inactive</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-ink-500">
                    <span className="inline-flex items-center gap-1.5"><Calendar size={13} aria-hidden="true" />{dateOf(u.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <RowMenu
                      open={menu === u.id}
                      onToggle={() => setMenu(menu === u.id ? null : u.id)}
                      onClose={() => setMenu(null)}
                      user={u}
                      isMe={isMe}
                      onEdit={() => { setMenu(null); setEditing(u); }}
                      onToggleActive={() => { setMenu(null); call('PATCH', '/api/admin/users', { id: u.id, active: !u.active }); }}
                      onDelete={() => {
                        setMenu(null);
                        // eslint-disable-next-line no-alert
                        if (window.confirm(`Delete ${u.name || u.email}? They will no longer be able to sign in.`)) call('DELETE', `/api/admin/users?id=${u.id}`);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
            {!shown.length ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-ink-400">No users match.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <UserDialog
          user={editing === 'new' ? null : editing}
          isMe={editing !== 'new' && Number(editing.id) === Number(meId)}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      ) : null}
    </>
  );
}

function RowMenu({
  open, onToggle, onClose, user, isMe, onEdit, onToggleActive, onDelete,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open, onClose]);

  const item = 'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[14px] transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${user.name || user.email}`}
        className={cx('flex h-9 w-9 items-center justify-center rounded-lg border transition-colors', open ? 'border-primary-500 text-primary-700' : 'border-transparent text-ink-500 hover:bg-surface-muted')}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 text-ink-700 shadow-[0_18px_40px_-18px_rgb(6_59_76/0.45)]">
          <button type="button" role="menuitem" onClick={onEdit} className={cx(item, 'hover:bg-surface-muted')}>
            <Pencil size={15} aria-hidden="true" />
            Edit user
          </button>
          <button type="button" role="menuitem" onClick={onToggleActive} disabled={isMe} className={cx(item, 'hover:bg-surface-muted')}>
            <Power size={15} aria-hidden="true" />
            {user.active ? 'Deactivate' : 'Activate'}
          </button>
          <div className="my-1 border-t border-line" />
          <button type="button" role="menuitem" onClick={onDelete} disabled={isMe} className={cx(item, 'text-danger hover:bg-danger/5')}>
            <Trash2 size={15} aria-hidden="true" />
            Delete user
          </button>
        </div>
      ) : null}
    </div>
  );
}

const randomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

function UserDialog({
  user, isMe, onClose, onSaved,
}) {
  const creating = !user;
  const start = roleInfo('manager');
  const [f, setF] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    role: user?.role || 'manager',
    sections: user?.sections || [...start.sections],
    actions: user?.actions || [...start.actions],
    active: user ? user.active : true,
  });
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape' && status !== 'saving') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose, status]);

  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const pickRole = (id) => {
    const r = roleInfo(id);
    set(r ? { role: id, sections: [...r.sections], actions: [...r.actions] } : { role: id });
  };
  // Changing a checkbox away from the role's preset makes the access custom.
  const toggle = (key, id) => {
    setF((x) => {
      const list = x[key].includes(id) ? x[key].filter((v) => v !== id) : [...x[key], id];
      const next = { ...x, [key]: list };
      const preset = roleInfo(x.role);
      const same = (a, b) => a.length === b.length && a.every((v) => b.includes(v));
      if (preset && !(same(next.sections, preset.sections) && same(next.actions, preset.actions))) next.role = 'custom';
      return next;
    });
  };

  async function save() {
    setStatus('saving');
    setError('');
    const res = await fetch('/api/admin/users', {
      method: creating ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(user ? { id: user.id } : {}), ...f }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      setError(data?.error || 'Could not save.');
      setStatus('idle');
      return;
    }
    onSaved();
  }

  const input = 'h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[14.5px] text-ink-900 outline-none placeholder:text-ink-300 focus:border-primary-500';
  const check = (on) => cx('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13.5px] transition-colors', on ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-line-strong bg-white text-ink-700 hover:border-primary-300');

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={() => status !== 'saving' && onClose()} className="absolute inset-0 bg-ink-900/55" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-dialog-title"
        className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        style={{ animation: 'df-fade-in 0.2s ease-out' }}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
            {creating ? <UserPlus size={19} aria-hidden="true" /> : <Pencil size={18} aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="user-dialog-title" className="text-[17px] font-semibold text-ink-900">{creating ? 'Add new user' : `Edit ${user.name || user.email}`}</h2>
            <p className="text-[12.5px] text-ink-400">They sign in at /admin/login with this email and password.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted"><X size={18} aria-hidden="true" /></button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">Full name <span className="text-danger">*</span></span>
              <input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">Email (for sign in) <span className="text-danger">*</span></span>
              <input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} maxLength={200} className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">Mobile</span>
              <input value={f.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} inputMode="numeric" placeholder="10 digits" className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13.5px] font-medium text-ink-800">
                {creating ? 'Password' : 'New password'}
                {creating ? <span className="text-danger"> *</span> : <span className="font-normal text-ink-300"> — leave empty to keep</span>}
              </span>
              <span className="relative block">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={f.password}
                  onChange={(e) => set({ password: e.target.value })}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={cx(input, 'pr-20')}
                />
                <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-0.5">
                  <button type="button" title="Generate a strong password" onClick={() => { set({ password: randomPassword() }); setShowPw(true); }} className="rounded-md p-1.5 text-ink-400 hover:bg-surface-muted hover:text-primary-700">
                    <Wand2 size={16} aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((v) => !v)} className="rounded-md p-1.5 text-ink-400 hover:bg-surface-muted hover:text-primary-700">
                    {showPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </span>
              </span>
            </label>
          </div>

          <div>
            <p className="mb-2 text-[13.5px] font-semibold text-ink-900">Role</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pickRole(r.id)}
                  aria-pressed={f.role === r.id}
                  className={cx('rounded-xl border-2 p-3 text-left transition-colors', f.role === r.id ? 'border-primary-500 bg-primary-50/50' : 'border-line hover:border-primary-200')}
                >
                  <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900">
                    {r.id === 'owner' ? <Crown size={14} className="text-violet-600" aria-hidden="true" /> : <Shield size={14} className="text-primary-600" aria-hidden="true" />}
                    {r.label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-400">{r.description}</span>
                </button>
              ))}
            </div>
            {f.role === 'custom' ? <p className="mt-2 text-[12.5px] font-medium text-primary-700">Custom access — the boxes below were changed from the role’s default.</p> : null}
          </div>

          <div>
            <p className="mb-2 text-[13.5px] font-semibold text-ink-900">Permissions</p>
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map((a) => (
                <label key={a.id} className={check(f.actions.includes(a.id))}>
                  <input type="checkbox" checked={f.actions.includes(a.id)} onChange={() => toggle('actions', a.id)} className="h-4 w-4 accent-primary-500" />
                  {a.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13.5px] font-semibold text-ink-900">Sections they can open</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {SECTIONS.map((s) => (
                <label key={s.id} className={check(f.sections.includes(s.id))}>
                  <input type="checkbox" checked={f.sections.includes(s.id)} onChange={() => toggle('sections', s.id)} className="h-4 w-4 accent-primary-500" />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <label className={cx('flex items-center justify-between gap-3 rounded-xl border p-3', f.active ? 'border-success/30 bg-success/5' : 'border-line bg-surface-muted/50')}>
            <span>
              <span className="block text-[14px] font-semibold text-ink-900">{f.active ? 'Active — can sign in' : 'Inactive — cannot sign in'}</span>
              <span className="block text-[12.5px] text-ink-400">Switch off instead of deleting to keep the account for later.</span>
            </span>
            <input type="checkbox" checked={f.active} disabled={isMe} onChange={(e) => set({ active: e.target.checked })} className="h-5 w-5 accent-success" />
          </label>

          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[13.5px] text-danger">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-surface-muted/50 px-5 py-3">
          <button type="button" onClick={onClose} disabled={status === 'saving'} className="h-10 rounded-lg border border-line-strong bg-white px-4 text-[14px] font-medium text-ink-700">Cancel</button>
          <button
            type="button"
            onClick={save}
            disabled={status === 'saving'}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-5 text-[14px] font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
          >
            {status === 'saving' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {status === 'saving' ? 'Saving…' : creating ? 'Create user' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
