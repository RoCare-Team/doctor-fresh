import Link from 'next/link';
import { Phone, MessageCircle, ShieldCheck, Droplets, Truck } from 'lucide-react';
import { getAllCategories, getBlogCategories } from '@/lib/catalog';
import { brand } from '@/data/site';
import HeaderClient from './HeaderClient';

// Top utility strip — short trust signals on the left, contact on the right.
const UTILITY = [
  { icon: ShieldCheck, label: 'India’s trusted water purification brand' },
  { icon: Droplets, label: 'Free water quality test' },
  { icon: Truck, label: 'Free shipping & installation' },
];

export default function Header() {
  // Menus are built on the server from the real category tree and passed down
  // as plain data — only the interactive shell ships to the browser.
  const categories = getAllCategories().map((c) => ({
    slug: c.slug,
    name: c.name,
    href: c.href,
    subcategories: c.subcategories.map((s) => ({ name: s.name, href: s.href })),
  }));

  const blogCategories = getBlogCategories();

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="hidden bg-ink-900 text-white lg:block">
        <div className="df-container flex h-10 items-center justify-between text-[13.5px]">
          <ul className="flex items-center gap-6">
            {UTILITY.map((u) => {
              const Icon = u.icon;
              return (
                <li key={u.label} className="flex items-center gap-1.5 text-white/70">
                  <Icon size={13} className="text-primary-400" aria-hidden="true" />
                  {u.label}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-5">
            <Link href="/login" className="text-white/70 transition-colors hover:text-white">
              Track order
            </Link>
            <Link href="/contact" className="text-white/70 transition-colors hover:text-white">
              Contact
            </Link>
            <a
              href={brand.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
            >
              <MessageCircle size={13} aria-hidden="true" />
              WhatsApp
            </a>
            <a href={`tel:${brand.phoneRaw}`} className="flex items-center gap-1.5 font-medium text-white">
              <Phone size={13} className="text-primary-400" aria-hidden="true" />
              {brand.phone}
            </a>
          </div>
        </div>
      </div>

      <HeaderClient categories={categories} blogCategories={blogCategories} brand={brand} />

      <noscript>
        <div className="border-b border-line bg-surface-muted">
          <div className="df-container flex gap-4 overflow-x-auto py-2 text-[14px]">
            {categories.map((c) => (
              <Link key={c.slug} href={c.href} className="whitespace-nowrap text-ink-500">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </noscript>
    </header>
  );
}
