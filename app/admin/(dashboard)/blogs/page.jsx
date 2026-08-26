import Link from 'next/link';
import { listBlogs } from '@/lib/sql/admin-catalog';
import AdminTable from '@/components/admin/AdminTable';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Blogs' };

export default async function AdminBlogsPage() {
  const posts = await listBlogs({ limit: 200 });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold text-ink-900">Blogs</h1>
        <span className="text-[14px] text-ink-400">{posts?.length ?? 0} posts</span>
      </div>

      <AdminTable
        head={[
          { label: 'Title' },
          { label: 'Category', hideSm: true },
          { label: 'Author', hideSm: true },
          { label: 'Date' },
          { label: 'Views' },
          { label: '', align: 'right' },
        ]}
        empty="No posts yet."
        minWidth={760}
      >
        {(posts || []).map((p) => (
          <tr key={p.id} className="transition-colors hover:bg-surface-muted">
            <td className="px-4 py-3">
              <Link href={`/admin/blogs/${p.id}`} className="line-clamp-1 font-medium text-primary-700 hover:text-primary-800">
                {p.title}
              </Link>
              <span className="block text-[12px] text-ink-300">/{p.slug}</span>
            </td>
            <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{p.category || '—'}</td>
            <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{p.author || '—'}</td>
            <td className="px-4 py-3 text-ink-500">{p.date ? formatDate(p.date) : '—'}</td>
            <td className="px-4 py-3 text-ink-500">{p.views}</td>
            <td className="px-4 py-3 text-right">
              <Link href={`/admin/blogs/${p.id}`} className="text-[13.5px] font-medium text-primary-700 hover:text-primary-800">
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
