import Link from 'next/link';
import { Pencil, ExternalLink } from 'lucide-react';

/** One category in the list; editing opens the full category editor. */
export default function CategoryRow({ category }) {
  const href = `/admin/categories/${category.id}`;

  return (
    <tr className="transition-colors hover:bg-primary-50/40">
      <td className="px-4 py-3">
        <Link href={href} className="font-medium text-ink-900 hover:text-primary-700">
          {category.name}
        </Link>
        {category.metaTitle ? (
          <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-ink-400">{category.metaTitle}</span>
        ) : (
          <span className="mt-0.5 block text-[12.5px] text-warning">No meta title yet</span>
        )}
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <a
          href={`/category/${category.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[13.5px] text-primary-700 hover:text-primary-800"
        >
          {`/${category.slug}`}
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </td>
      <td className="px-4 py-3 text-ink-500">{category.products}</td>
      <td className="px-4 py-3 text-right">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:border-primary-500 hover:text-primary-700"
        >
          <Pencil size={13} aria-hidden="true" />
          Edit
        </Link>
      </td>
    </tr>
  );
}
