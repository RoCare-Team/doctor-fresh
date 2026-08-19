import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SITE_URL } from '@/lib/utils';

export default function Breadcrumb({ items = [], className = '' }) {
  if (!items.length) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', href: '/' }, ...items].map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.href ? `${SITE_URL}${item.href}` : undefined,
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className={`text-[14px] ${className}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ol className="df-no-scrollbar flex items-center gap-1 overflow-x-auto whitespace-nowrap text-ink-400">
        <li>
          <Link href="/" className="transition-colors hover:text-primary-800">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center gap-1">
            <ChevronRight size={13} className="shrink-0 text-ink-300" aria-hidden="true" />
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="transition-colors hover:text-primary-800">
                {item.name}
              </Link>
            ) : (
              <span className="text-ink-700" aria-current="page">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
