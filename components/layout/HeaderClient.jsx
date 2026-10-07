'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/common/NavLink'; // no prefetch until hovered
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, ShoppingCart, Menu, ChevronDown, LayoutGrid, Lock, Wrench, Hammer, CalendarCheck, ChevronRight,
} from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import { imageUrl, cx } from '@/lib/utils';
import CallbackButton from '@/components/forms/CallbackButton';
import MobileMenu from './MobileMenu';
import AccountMenu from './AccountMenu';

// Category navigation row. Every entry points at a route that already exists.
const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Water Purifiers', href: '/category/water-purifier' },
  { label: 'RO Plant', href: '/category/ro-plant' },
  { label: 'Water Softener', href: '/category/water-softener' },
  { label: 'Service & AMC', href: '/water-purifier-service' },
];

export default function HeaderClient({
  categories, blogCategories, brand, nav, serviceLinks = [],
}) {
  // Where a dropdown opens: under its own menu item, not across the page.
  const [servicesLeft, setServicesLeft] = useState(0);
  const navItems = nav?.items?.length ? nav.items : NAV;
  const [openMenu, setOpenMenu] = useState(null); // 'products' | 'services' | null
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.slug || null);
  const [query, setQuery] = useState('');
  const [navHidden, setNavHidden] = useState(false);
  const navRef = useRef(null);

  // Where a dropdown sits: under its own menu item, pulled back when that
  // would take it past the right edge of the bar.
  function menuLeft(el, width) {
    const frame = navRef.current?.getBoundingClientRect();
    if (!frame) return 0;
    const left = el.getBoundingClientRect().left - frame.left - 8;
    return Math.max(8, Math.min(left, frame.width - width - 8));
  }
  const scroll = useRef({ lastY: 0, acc: 0, ticking: false });
  const router = useRouter();
  const pathname = usePathname();
  const { count } = useCart();
  // Checkout runs in a stripped-down header — see the main bar below.
  const focused = pathname === '/cart-checkout';

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  /**
   * Auto-hide only the category row; the main bar above it stays pinned.
   *
   * Direction comes from an *accumulated* delta with separate hide/show
   * thresholds. Reacting to every few pixels is what made the bar flicker:
   * trackpad and momentum scrolling emit tiny alternating deltas, and the row
   * collapsing also nudges the content underneath. Requiring a sustained run in
   * one direction — and resetting the accumulator whenever the direction flips
   * — makes the state impossible to toggle by jitter.
   */
  useEffect(() => {
    const REVEAL_ZONE = 160; // always visible this close to the top
    const HIDE_DELTA = 70; // sustained downward scroll before hiding
    const SHOW_DELTA = 30; // upward scroll before revealing again

    scroll.current.lastY = window.scrollY;

    const onScroll = () => {
      if (scroll.current.ticking) return;
      scroll.current.ticking = true;

      window.requestAnimationFrame(() => {
        const y = Math.max(0, window.scrollY);
        const delta = y - scroll.current.lastY;
        scroll.current.lastY = y;

        if (y < REVEAL_ZONE) {
          scroll.current.acc = 0;
          setNavHidden(false);
          scroll.current.ticking = false;
          return;
        }

        if ((delta > 0 && scroll.current.acc < 0) || (delta < 0 && scroll.current.acc > 0)) {
          scroll.current.acc = 0;
        }
        scroll.current.acc += delta;

        if (scroll.current.acc > HIDE_DELTA) {
          setNavHidden(true);
          setOpenMenu(null);
          scroll.current.acc = 0;
        } else if (scroll.current.acc < -SHOW_DELTA) {
          setNavHidden(false);
          scroll.current.acc = 0;
        }

        scroll.current.ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!openMenu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenu(null); };
    const onClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [openMenu]);

  function submitSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const active = categories.find((c) => c.slug === activeCategory) || categories[0];

  return (
    <>
      {/* ---------------------------------------------------------- main bar */}
      <div className="border-b border-line bg-white">
        <div className="df-container flex h-[68px] items-center gap-3 lg:h-[68px] lg:gap-6">
          {/* a hard outline around the wordmark reads as a stray border, so the
              focus cue here is a tint rather than a rectangle */}
          <div className="flex flex-1 items-center">
          <Link
            href="/"
            aria-label="Doctor Fresh home"
            className="shrink-0 rounded-lg focus-visible:bg-primary-50 focus-visible:outline-none"
          >
            <Image
              src={imageUrl(brand.logo)}
              alt="Doctor Fresh"
              width={243}
              height={52}
              priority
              fetchPriority="high"
              className="h-8 w-auto min-[380px]:h-9 lg:h-[42px]"
            />
          </Link>
          </div>

          {/* Checkout is a room with one door: search, the category nav and the
              menu would all lead out of a payment the visitor is part way
              through, so the header keeps only the logo and a lock. */}
          {focused ? (
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-ink-500 sm:text-[14px]">
              <Lock size={14} aria-hidden="true" className="text-success" />
              Secure
              <span className="hidden sm:inline">checkout</span>
            </span>
          ) : null}

          {/* search is the visual anchor of the header */}
          <form onSubmit={submitSearch} role="search" className={cx('hidden w-full max-w-lg shrink md:block', focused && 'md:hidden')}>
            <div className="group relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 transition-colors group-focus-within:text-primary-700"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search water purifiers, RO plants, spare parts…"
                aria-label="Search products"
                className="h-10 w-full rounded-full border border-line-strong bg-surface-muted pl-10 pr-[92px] text-[14px] text-ink-900 outline-none transition-all placeholder:text-ink-300 focus:border-primary-500 focus:bg-white focus:shadow-[0_0_0_4px_var(--color-primary-100)]"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 h-8 -translate-y-1/2 rounded-full bg-primary-600 px-4 text-[13.5px] shadow-sm font-semibold text-white transition-colors hover:bg-ink-900"
              >
                Search
              </button>
            </div>
          </form>

          <div className="flex flex-1 items-center justify-end gap-1 lg:gap-1.5">
            {/* For the visitor who would rather be phoned than fill in the
                enquiry popup; it lands in the same admin inbox. */}
            <CallbackButton className="mr-1 hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-primary-200 px-3.5 py-1.5 text-[13.5px] font-medium text-primary-800 transition-colors hover:bg-primary-50 lg:inline-flex" />

            <Link
              href="/cart"
              aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}
              className="relative flex flex-col items-center rounded-lg px-3 py-1.5 text-ink-700 transition-colors hover:bg-surface-muted"
            >
              <span className="relative">
                <ShoppingCart size={20} aria-hidden="true" />
                {count > 0 ? (
                  <span
                    key={count}
                    className="df-pop absolute -right-2.5 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-600 px-1 text-[11.5px] font-semibold text-white"
                  >
                    {count}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 hidden text-[12.5px] text-ink-400 lg:block">Cart</span>
            </Link>

            <AccountMenu />

            {/* Last on the row so it sits on the edge of the screen, where a
                thumb reaches it. On desktop the nav bar below carries these
                links, so it is not needed. */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className={cx(
                '-mr-1 rounded-md p-2 text-ink-700 transition-colors hover:bg-surface-muted lg:hidden',
                focused && 'hidden',
              )}
            >
              <Menu size={22} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* mobile search */}
        <form onSubmit={submitSearch} role="search" className={cx('df-container pb-3 md:hidden', focused && 'hidden')}>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="h-11 w-full rounded-xl border border-line-strong bg-surface-muted pl-10 pr-3 text-sm outline-none placeholder:text-ink-300 focus:border-primary-500 focus:bg-white"
            />
          </div>
        </form>
      </div>

      {/* ------------------------------------------------------ category nav */}
      <div
        ref={navRef}
        className={cx(
          'relative hidden bg-white lg:block',
          focused && 'lg:hidden',
          navHidden ? 'border-b-0' : 'border-b border-line',
        )}
      >
        {/* only this row collapses — the dropdowns are siblings, so they are
            never clipped by the overflow used for the animation */}
        <div
          className={cx(
            'overflow-hidden transition-[max-height] duration-300 ease-out',
            navHidden ? 'max-h-0' : 'max-h-[58px]',
          )}
          aria-hidden={navHidden}
        >
          <nav aria-label="Main" className="df-container flex h-[58px] items-center gap-2">
          <button
            type="button"
            onMouseEnter={() => setOpenMenu('products')}
            onClick={() => setOpenMenu(openMenu === 'products' ? null : 'products')}
            aria-expanded={openMenu === 'products'}
            className={cx(
              'mr-3 inline-flex h-[34px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors',
              openMenu === 'products'
                ? 'bg-primary-600 text-white'
                : 'bg-primary-50 text-primary-800 hover:bg-primary-100',
            )}
          >
            <LayoutGrid size={16} aria-hidden="true" />
            All Categories
            <ChevronDown
              size={15}
              className={cx('transition-transform', openMenu === 'products' && 'rotate-180')}
              aria-hidden="true"
            />
          </button>

          <ul className="df-no-scrollbar flex min-w-0 flex-1 items-center justify-center-safe gap-1 overflow-x-auto xl:gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              // "Service & AMC" opens the list of service pages on hover.
              const hasServices = serviceLinks.length > 0 && (item.href === '/water-purifier-service' || /service\s*&\s*amc/i.test(item.label));
              if (hasServices) {
                const open = openMenu === 'services';
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onMouseEnter={(e) => {
                        const box = e.currentTarget.getBoundingClientRect();
                        const frame = navRef.current?.getBoundingClientRect();
                        setServicesLeft(frame ? box.left - frame.left : 0);
                        setOpenMenu('services');
                      }}
                      aria-expanded={open}
                      aria-haspopup="true"
                      aria-current={isActive ? 'page' : undefined}
                      className={cx(
                        'inline-flex h-[46px] shrink-0 items-center gap-1 whitespace-nowrap border-b-2 px-2 text-[14px] transition-colors xl:px-2.5',
                        open || isActive ? 'border-primary-500 font-medium text-ink-900' : 'border-transparent text-ink-500 hover:border-primary-200 hover:text-ink-900',
                      )}
                    >
                      {item.label}
                      <ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} aria-hidden="true" />
                    </Link>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onMouseEnter={() => setOpenMenu(null)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cx(
                      'df-underline inline-flex h-[46px] shrink-0 items-center whitespace-nowrap px-2 text-[14px] transition-colors xl:px-2.5',
                      isActive ? 'font-medium text-ink-900' : 'text-ink-500 hover:text-ink-900',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {nav?.ctaLabel !== '' ? (
            <Link
              href={nav?.ctaHref || '/partner'}
              className="ml-3 hidden shrink-0 whitespace-nowrap rounded-lg bg-primary-600 px-4 py-2 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-ink-900 lg:inline-block"
            >
              {nav?.ctaLabel || 'Become a Partner'}
            </Link>
          ) : null}
          </nav>
        </div>

        {/* ------------------------------------------------------ mega menu */}
        {openMenu === 'products' ? (
          <div
            className="absolute inset-x-0 top-full border-y border-line bg-white shadow-[0_18px_40px_-20px_rgba(6,59,76,0.28)]"
            onMouseLeave={() => setOpenMenu(null)}
          >
            <div className="df-container grid grid-cols-[260px_1fr] gap-0 py-5">
              <ul className="df-scrollbar max-h-[64vh] overflow-y-auto border-r border-line pr-3">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={c.href}
                      onMouseEnter={() => setActiveCategory(c.slug)}
                      className={cx(
                        'flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[14.5px] transition-colors',
                        activeCategory === c.slug
                          ? 'bg-primary-50 font-medium text-primary-800'
                          : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
                      )}
                    >
                      {c.name}
                      {c.subcategories.length ? (
                        <ChevronDown size={14} className="-rotate-90 text-ink-300" aria-hidden="true" />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="df-scrollbar max-h-[64vh] overflow-y-auto pl-8">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold text-ink-900">{active?.name}</h2>
                  <Link
                    href={active?.href || '/all-category'}
                    className="text-[14px] font-medium text-primary-700 hover:text-primary-800"
                  >
                    View all →
                  </Link>
                </div>

                {active?.subcategories?.length ? (
                  <ul className="grid grid-cols-2 gap-x-8 gap-y-1 xl:grid-cols-3">
                    {active.subcategories.map((s) => (
                      <li key={s.href}>
                        <Link
                          href={s.href}
                          className="block rounded-md px-2.5 py-2 text-[14.5px] text-ink-500 transition-colors hover:bg-surface-muted hover:text-primary-800"
                        >
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[14.5px] text-ink-400">Browse all products in {active?.name}.</p>
                )}

                <div className="mt-7 flex flex-wrap gap-2 border-t border-line pt-5">
                  {[
                    { label: 'Spare Parts', href: '/spare-parts' },
                    { label: 'AMC Plans', href: '/water-purifier-amc' },
                    { label: 'Installation', href: '/water-purifier-installation' },
                    { label: 'All Categories', href: '/all-category' },
                  ].map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="rounded-lg border border-line px-3.5 py-2 text-[14px] text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-800"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {openMenu === 'services' ? (
          <div
            className="absolute top-full z-50 pt-1"
            style={{ left: Math.max(8, servicesLeft - 8) }}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <div className="w-[300px] overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-[0_22px_48px_-22px_rgba(6,59,76,0.45)]">
              <p className="px-3 pb-1.5 pt-2 text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">Our services</p>
              <ul>
                {serviceLinks.map((l) => {
                  const Icon = /amc/i.test(l.label) ? CalendarCheck : /install/i.test(l.label) ? Hammer : Wrench;
                  const active = pathname === l.href;
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpenMenu(null)}
                        className={cx(
                          'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                          active ? 'bg-primary-50' : 'hover:bg-surface-muted',
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                          <Icon size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 text-[14px] font-medium text-ink-900">{l.label}</span>
                        <ChevronRight size={15} className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-700" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        categories={categories}
        blogCategories={blogCategories}
        brand={brand}
        links={nav?.mobileItems}
      />

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-ink-900/45 lg:hidden"
        />
      ) : null}
    </>
  );
}
