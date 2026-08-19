import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function SectionHeading({ title, subtitle, href, linkLabel = 'View all', as: Tag = 'h2' }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Tag className="text-xl font-semibold text-ink-900 md:text-2xl">{title}</Tag>
        {subtitle ? <p className="mt-1 text-sm text-ink-400">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 transition-colors hover:text-primary-800"
        >
          {linkLabel}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
