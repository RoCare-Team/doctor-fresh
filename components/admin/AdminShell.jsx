'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, Layers, Users, Inbox,
  Newspaper, Ticket, Settings, ExternalLink, LogOut, Menu, X,
} from 'lucide-react';
import { cx } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: Layers },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
  { href: '/admin/blogs', label: 'Blogs', icon: Newspaper },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

/**
 * The admin frame: a fixed sidebar on desktop, a drawer on a phone.
 *
 * Only the frame is a client component — every page inside it stays a server
 * component and reads straight from the database.
 */
export default function AdminShell({ admin, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isActive = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  async function signOut() {
    setBusy(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cx(
              'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] transition-colors',
              isActive(item)
                ? 'bg-primary-500 font-medium text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon size={17} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface-muted lg:flex">
      {/* --------------------------------------------------------- sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-ink-900 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link href="/admin" className="flex h-14 shrink-0 items-center px-5 text-[15px] font-semibold text-white">
          Doctor Fresh <span className="ml-1.5 text-white/50">admin</span>
        </Link>
        {nav}
        <div className="shrink-0 border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13.5px] text-white/60 transition-colors hover:text-white"
          >
            <ExternalLink size={14} aria-hidden="true" />
            View site
          </Link>
        </div>
      </aside>

      {/* ---------------------------------------------------------- drawer */}
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-ink-900/50 lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink-900 lg:hidden">
            <div className="flex h-14 shrink-0 items-center justify-between px-5">
              <span className="text-[15px] font-semibold text-white">Admin</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-white/70">
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            {nav}
          </aside>
        </>
      ) : null}

      {/* ------------------------------------------------------------ main */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-surface-muted lg:hidden"
          >
            <Menu size={19} aria-hidden="true" />
          </button>

          <span className="ml-auto text-[13.5px] text-ink-500">{admin.name}</span>
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[13.5px] text-ink-700 transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
          >
            <LogOut size={14} aria-hidden="true" />
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
