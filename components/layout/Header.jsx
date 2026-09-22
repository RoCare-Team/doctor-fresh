import Link from '@/components/common/NavLink'; // no prefetch until hovered
import {
  getAllCategories, getBlogCategories, getBrand, getFooterLinks,
} from '@/lib/catalog';
import { getContent } from '@/lib/sql/site-content';

import HeaderClient from './HeaderClient';

export default async function Header() {
  // Menus are built on the server from the real category tree and passed down
  // as plain data — only the interactive shell ships to the browser.
  const categories = (await getAllCategories()).map((c) => ({
    slug: c.slug,
    name: c.name,
    href: c.href,
    subcategories: c.subcategories.map((s) => ({ name: s.name, href: s.href })),
  }));

  const blogCategories = await getBlogCategories();
  const brand = await getBrand();
  // Menu links and the partner button, edited in the admin (Site content).
  const nav = await getContent('nav').catch(() => null);
  // The service pages under "Service & AMC" — the same list as the footer's Popular Services.
  const serviceLinks = (await getFooterLinks().catch(() => null))?.popularServices || [];

  return (
    <header className="sticky top-0 z-50 bg-white">
      <HeaderClient categories={categories} blogCategories={blogCategories} brand={brand} nav={nav} serviceLinks={serviceLinks} />

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
