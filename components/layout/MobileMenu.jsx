'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, ChevronDown, Phone, Mail, MessageCircle, LogIn, UserPlus } from 'lucide-react';
import { imageUrl, cx } from '@/lib/utils';

const QUICK_LINKS = [
  { label: 'All Products', href: '/all-category' },
  { label: 'Spare Parts', href: '/spare-parts' },
  { label: 'RO Repair & Service', href: '/water-purifier-service' },
  { label: 'Installation / Uninstallation', href: '/water-purifier-installation' },
  { label: 'AMC Plans', href: '/water-purifier-amc' },
  { label: 'Store Locator', href: '/store-locator' },
  { label: 'Become a Partner', href: '/partner' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact' },
];

export default function MobileMenu({ open, onClose, categories, blogCategories, brand }) {
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <div
      className={cx(
        'fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[360px] flex-col bg-white transition-transform duration-200 lg:hidden',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
      aria-hidden={!open}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
        <Link href="/" onClick={onClose} aria-label="Doctor Fresh home">
          <Image src={imageUrl(brand.logo)} alt="Doctor Fresh" width={1714} height={389} className="h-9 w-auto" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="rounded-md p-2 text-ink-500 transition-colors hover:bg-surface-muted"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <nav className="df-scrollbar flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        <p className="px-3 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-wide text-ink-300">
          Shop by category
        </p>
        <ul>
          {categories.map((c) => {
            const isOpen = expanded === c.slug;
            return (
              <li key={c.slug} className="border-b border-line/70 last:border-0">
                <div className="flex items-center">
                  <Link
                    href={c.href}
                    onClick={onClose}
                    className="flex-1 px-3 py-3 text-[15.5px] text-ink-700"
                  >
                    {c.name}
                  </Link>
                  {c.subcategories.length ? (
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : c.slug)}
                      aria-expanded={isOpen}
                      aria-label={`Show ${c.name} subcategories`}
                      className="px-3 py-3 text-ink-400"
                    >
                      <ChevronDown size={17} className={cx('transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                {isOpen && c.subcategories.length ? (
                  <ul className="pb-2 pl-3">
                    {c.subcategories.map((s) => (
                      <li key={s.href}>
                        <Link
                          href={s.href}
                          onClick={onClose}
                          className="block rounded px-3 py-2 text-[14.5px] text-ink-500"
                        >
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="px-3 pb-1 pt-5 text-[12px] font-semibold uppercase tracking-wide text-ink-300">
          Blogs
        </p>
        <ul className="pb-2">
          <li>
            <Link href="/blogs" onClick={onClose} className="block px-3 py-2 text-[15px] text-ink-700">
              All articles
            </Link>
          </li>
          {blogCategories.map((c) => (
            <li key={c.slug}>
              <Link href={c.href} onClick={onClose} className="block px-3 py-2 text-[14.5px] text-ink-500">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>

        <p className="px-3 pb-1 pt-4 text-[12px] font-semibold uppercase tracking-wide text-ink-300">
          Quick links
        </p>
        <ul className="pb-4">
          {QUICK_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={onClose} className="block px-3 py-2 text-[15px] text-ink-700">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* The header's account dropdown is not reachable on a phone, so signing
          in and registering get their own row here. */}
      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line px-4 py-3">
        <Link
          href="/login"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 rounded-md border border-line-strong px-3 py-2.5 text-[14px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-800"
        >
          <LogIn size={15} aria-hidden="true" />
          Sign in
        </Link>
        <Link
          href="/registration"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary-500 px-3 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-primary-900"
        >
          <UserPlus size={15} aria-hidden="true" />
          Register
        </Link>
      </div>

      <div className="shrink-0 space-y-2 border-t border-line bg-surface-muted px-4 py-4 text-[14px]">
        <a href={`tel:${brand.phoneRaw}`} className="flex items-center gap-2 text-ink-700">
          <Phone size={15} className="text-primary-700" aria-hidden="true" />
          {brand.phone}
        </a>
        <a href={`mailto:${brand.email}`} className="flex items-center gap-2 text-ink-700">
          <Mail size={15} className="text-primary-700" aria-hidden="true" />
          {brand.email}
        </a>
        <a href={brand.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-ink-700">
          <MessageCircle size={15} className="text-primary-700" aria-hidden="true" />
          WhatsApp us
        </a>
      </div>
    </div>
  );
}
