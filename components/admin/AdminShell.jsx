'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, Layers, Users, Inbox,
  Newspaper, Ticket, Settings, ExternalLink, LogOut, Menu, X, FileText, Shuffle, Loader2,
  Wrench, Mail, Handshake, UserCog, MapPin, Link2, House, Map as MapIcon, PanelsTopLeft,
} from 'lucide-react';
import { cx, imageUrl } from '@/lib/utils';
import { can, roleInfo } from '@/lib/admin/access';
import { AdminAccessProvider } from '@/components/admin/AdminAccess';

// Remembered per browser, so the rail is how it was left on the next visit.
const COLLAPSED_KEY = 'df-admin-sidebar-collapsed';

// `section` ties each entry to a permission; entries the signed-in admin
// cannot open are left out of the menu.
const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, section: 'dashboard' },
  { href: '/admin/home', label: 'Home page', icon: House, section: 'home' },
  { href: '/admin/content', label: 'Site content', icon: PanelsTopLeft, section: 'content' },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, section: 'orders' },
  { href: '/admin/products', label: 'Products', icon: Package, section: 'products' },
  { href: '/admin/categories', label: 'Categories', icon: Layers, section: 'categories' },
  { href: '/admin/service-pages', label: 'Service pages', icon: Wrench, section: 'service_pages' },
  { href: '/admin/quick-links', label: 'Quick links', icon: Link2, section: 'quick_links' },
  { href: '/admin/uniredirect', label: 'uniredirected urls redirecting', icon: Shuffle, section: 'redirects' },
  { href: '/admin/brochures', label: 'Brochures', icon: FileText, section: 'brochures' },
  { href: '/admin/locations', label: 'GMB Locations', icon: MapPin, section: 'locations' },
  { href: '/admin/cities', label: 'States & Cities', icon: MapIcon, section: 'cities' },
  { href: '/admin/customers', label: 'Customers', icon: Users, section: 'customers' },
  { href: '/admin/enquiries', label: 'Enquiries', icon: Inbox, section: 'enquiries' },
  { href: '/admin/messages', label: 'Contact messages', icon: Mail, section: 'messages' },
  { href: '/admin/partners', label: 'Partner requests', icon: Handshake, section: 'messages' },
  { href: '/admin/blogs', label: 'Blogs', icon: Newspaper, section: 'blogs' },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket, section: 'coupons' },
  { href: '/admin/users', label: 'Admin users', icon: UserCog, section: 'users' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, section: 'settings' },
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
  const search = useSearchParams()?.toString() || '';
  // The page being opened, from the click (or Back) until it has arrived.
  const [pendingHref, setPendingHref] = useState(null);
  const shown = useRef('');

  // The new page is on screen once the address changes; the timer is only a
  // safety net so a failed load never leaves the loader spinning for good.
  useEffect(() => {
    shown.current = search ? `${pathname}?${search}` : pathname;
    setPendingHref(null);
  }, [pathname, search]);
  useEffect(() => {
    if (!pendingHref) return undefined;
    const t = setTimeout(() => setPendingHref(null), 20000);
    return () => clearTimeout(t);
  }, [pendingHref]);

  // Every admin link on any page — "All posts", Edit, View… — and the
  // browser's Back / Forward show the loader too, not only the sidebar.
  useEffect(() => {
    const here = () => `${window.location.pathname}${window.location.search}`;

    function onClick(event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const a = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      let url;
      try { url = new URL(a.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/admin')) return;
      const next = `${url.pathname}${url.search}`;
      if (next === here()) return; // same page, or only a #section of it
      setPendingHref(next);
    }

    function onPopState() {
      // The address has already changed; the page for it has not arrived yet.
      const next = here();
      if (next.startsWith('/admin') && next !== shown.current) setPendingHref(next);
    }

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  function startNavigation(event, href) {
    setOpen(false);
    // A new tab or window loads elsewhere — nothing to wait for here.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const here = href === '/admin' ? pathname === '/admin' : pathname === href;
    if (!here) setPendingHref(href);
  }

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

  const nav = NAV.filter((item) => can(admin.access, item.section));

  const isActive = (item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  async function signOut() {
    setBusy(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  /** The drawer is never collapsed, so the state is passed in rather than read. */
  const renderNav = (isCollapsed) => (
    <nav className={cx('df-rail-scroll flex-1 space-y-0.5 overflow-y-auto', isCollapsed ? 'px-2 py-3' : 'p-3')}>
      {nav.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(e) => startNavigation(e, item.href)}
            aria-busy={pendingHref === item.href}
            // The label is gone when collapsed, so it becomes the accessible
            // name and the hover tooltip instead.
            title={isCollapsed ? item.label : undefined}
            aria-label={isCollapsed ? item.label : undefined}
            className={cx(
              'flex items-center rounded-lg text-[14px] transition-colors',
              isCollapsed ? 'justify-center px-0 py-3' : 'gap-2.5 px-3 py-2.5',
              pendingHref === item.href
                ? 'bg-white/15 font-medium text-white'
                : isActive(item) && !pendingHref
                  ? 'bg-primary-500 font-medium text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            {pendingHref === item.href
              ? <Loader2 size={isCollapsed ? 19 : 17} className="shrink-0 animate-spin" aria-hidden="true" />
              : <Icon size={isCollapsed ? 19 : 17} className="shrink-0" aria-hidden="true" />}
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
            'flex h-18 shrink-0 items-center border-b border-white/10',
            collapsed ? 'justify-center px-2' : 'gap-2.5 pl-4 pr-2',
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
            <div className="flex h-18 shrink-0 items-center justify-between border-b border-white/10 px-5">
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
        <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-line bg-white px-4 shadow-[0_6px_20px_-18px_rgb(6_59_76/0.5)] md:px-6">
          {/* A thin bar along the top edge while a section loads. */}
          {pendingHref ? (
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-primary-100">
              <span className="df-progress block h-full w-1/3 rounded-full bg-primary-500" />
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-surface-muted lg:hidden"
          >
            <Menu size={19} aria-hidden="true" />
          </button>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-400 to-primary-700 text-[14px] font-semibold uppercase text-white shadow-[0_6px_14px_-8px_rgb(21_151_197/0.9)]">
              {String(admin.name || 'A').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[14px] font-semibold text-ink-900">{admin.name}</span>
              <span className="block text-[12px] text-ink-400">{roleInfo(admin.access?.role)?.label || 'Custom access'}</span>
            </span>
          </div>
          <span className="mx-1 hidden h-8 w-px bg-line sm:block" aria-hidden="true" />
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-3.5 text-[14px] font-medium text-ink-700 transition-colors hover:border-danger hover:bg-danger/5 hover:text-danger disabled:opacity-50"
          >
            <LogOut size={15} aria-hidden="true" />
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </header>

        <main className="relative px-4 pb-4 pt-3 md:px-6 md:pb-6 md:pt-3" aria-busy={Boolean(pendingHref)}>
          <AdminAccessProvider access={admin.access}>{children}</AdminAccessProvider>

          {/* The old page stays underneath, faded, with the loader over it —
              the click is answered at once even while the next page is still
              being read from the database. */}
          {pendingHref ? <PageLoader item={sectionOf(pendingHref)} /> : null}
        </main>
      </div>
    </div>
  );
}

/** The sidebar section a page belongs to: /admin/blogs/34 → Blogs. */
function sectionOf(href) {
  const path = String(href || '').split('?')[0];
  return NAV
    .filter((n) => (n.href === '/admin' ? path === '/admin' : path === n.href || path.startsWith(`${n.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0] || null;
}

/**
 * Shown over the current page while the next section loads: two counter-turning
 * rings around that section's own icon, its name, and a sweeping bar — big
 * enough to read as "working on it" at a glance, not a stalled screen.
 */
function PageLoader({ item }) {
  const Icon = item?.icon || LayoutDashboard;
  const label = item?.label || 'page';

  return (
    <div className="df-fade-in absolute inset-0 z-20 flex justify-center bg-surface-muted/75 pt-[18vh] backdrop-blur-[2px]">
      <div
        role="status"
        className="h-fit w-[min(17rem,calc(100%-2rem))] overflow-hidden rounded-2xl border border-white bg-white/95 text-center shadow-[0_30px_70px_-30px_rgb(6_59_76/0.55)]"
      >
        <div className="relative bg-linear-to-b from-primary-50 to-white px-5 pb-4 pt-6">
          <div className="relative mx-auto h-20 w-20">
            {/* soft halo */}
            <span className="absolute inset-0 animate-ping rounded-full bg-primary-300/30 [animation-duration:1.8s]" />
            {/* outer ring */}
            <span className="absolute inset-0 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600 border-r-primary-500 [animation-duration:0.9s]" />
            {/* inner ring, turning the other way */}
            <span className="df-spin-reverse absolute inset-2.5 rounded-full border-[3px] border-transparent border-b-primary-400 border-l-primary-300" />
            {/* the section being opened */}
            <span className="absolute inset-5 flex items-center justify-center rounded-full bg-linear-to-br from-primary-400 to-primary-700 text-white shadow-[0_10px_22px_-8px_rgb(21_151_197/0.95)]">
              <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
          </div>

          <p className="mt-4 text-[15.5px] font-semibold capitalize text-ink-900">{`Opening ${label}`}</p>
          <p className="mt-1 flex items-center justify-center gap-1 text-[12.5px] text-ink-400">
            Fetching the latest data
            <span className="inline-flex gap-0.5" aria-hidden="true">
              <span className="h-1 w-1 animate-bounce rounded-full bg-primary-500" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-primary-500 [animation-delay:150ms]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-primary-500 [animation-delay:300ms]" />
            </span>
          </p>
        </div>

        <span className="block h-1 overflow-hidden bg-primary-100" aria-hidden="true">
          <span className="df-progress block h-full w-1/3 rounded-full bg-linear-to-r from-primary-300 via-primary-500 to-primary-300" />
        </span>
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
        className="h-6 w-auto"
      />
    </span>
  );
}
