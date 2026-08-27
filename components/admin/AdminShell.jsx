'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, Layers, Users, Inbox,
  Newspaper, Ticket, Settings, ExternalLink, LogOut, Menu, X,
} from 'lucide-react';
import { cx, imageUrl } from '@/lib/utils';

// Remembered per browser, so the rail is how it was left on the next visit.
const COLLAPSED_KEY = 'df-admin-sidebar-collapsed';

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
export default function AdminShell({ admin, brand, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Read after mount: the server cannot know the preference, and rendering the
  // wrong width first would make the sidebar jump.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === '1');
    } catch {
      // private browsing, or storage switched off — the default is fine
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((was) => {
      const next = !was;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch { /* not worth failing the click over */ }
      return next;
    });
  }

  const isActive = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  async function signOut() {
    setBusy(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  /** The drawer is never collapsed, so the state is passed in rather than read. */
  const renderNav = (isCollapsed) => (
    <nav className={cx('flex-1 space-y-0.5 overflow-y-auto', isCollapsed ? 'px-2 py-3' : 'p-3')}>
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            // The label is gone when collapsed, so it becomes the accessible
            // name and the hover tooltip instead.
            title={isCollapsed ? item.label : undefined}
            aria-label={isCollapsed ? item.label : undefined}
            className={cx(
              'flex items-center rounded-lg text-[14px] transition-colors',
              isCollapsed ? 'justify-center px-0 py-3' : 'gap-2.5 px-3 py-2.5',
              isActive(item)
                ? 'bg-primary-500 font-medium text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon size={isCollapsed ? 19 : 17} aria-hidden="true" />
            {isCollapsed ? null : item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface-muted lg:flex">
      {/* --------------------------------------------------------- sidebar */}
      <aside
        className={cx(
          'hidden shrink-0 flex-col bg-ink-900 transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        <div
          className={cx(
            'flex h-14 shrink-0 items-center',
            collapsed ? 'justify-center px-2' : 'gap-2 pl-4 pr-2',
          )}
        >
          {collapsed ? null : (
            <Link href="/admin" className="flex min-w-0 items-center gap-2">
              <Wordmark brand={brand} />
              <span className="text-[13px] text-white/50">admin</span>
            </Link>
          )}

          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse to icons'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse to icons'}
            aria-expanded={!collapsed}
            className={cx(
              'rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white',
              collapsed ? '' : 'ml-auto',
            )}
          >
            {collapsed
              ? <Menu size={19} aria-hidden="true" />
              : <X size={18} aria-hidden="true" />}
          </button>
        </div>

        {renderNav(collapsed)}

        <div className={cx('shrink-0 border-t border-white/10', collapsed ? 'p-2' : 'p-3')}>
          <Link
            href="/"
            title={collapsed ? 'View site' : undefined}
            aria-label={collapsed ? 'View site' : undefined}
            className={cx(
              'flex items-center rounded-lg text-[13.5px] text-white/60 transition-colors hover:text-white',
              collapsed ? 'justify-center py-2.5' : 'gap-2 px-3 py-2',
            )}
          >
            <ExternalLink size={collapsed ? 17 : 14} aria-hidden="true" />
            {collapsed ? null : 'View site'}
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
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <Wordmark brand={brand} />
                <span className="text-[13px] text-white/50">admin</span>
              </Link>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-white/70">
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            {renderNav(false)}
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

/**
 * The brand mark on the navy rail.
 *
 * The artwork is opaque white, so it gets a plate of its own; dropped straight
 * onto the sidebar it would read as a bright rectangle cut into it.
 */
function Wordmark({ brand }) {
  if (!brand?.logo) {
    return <span className="text-[15px] font-semibold text-white">Doctor Fresh</span>;
  }
  return (
    <span className="inline-flex rounded-lg bg-white px-2 py-1.5">
      <Image
        src={imageUrl(brand.logo)}
        alt={brand.name || 'Doctor Fresh'}
        width={878}
        height={188}
        className="h-5 w-auto"
      />
    </span>
  );
}
