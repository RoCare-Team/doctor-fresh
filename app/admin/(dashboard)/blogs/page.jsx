import Link from 'next/link';
import Pagination, { paginate } from '@/components/admin/Pagination';
import { ImageOff } from 'lucide-react';
import { listBlogs, listBlogCategories } from '@/lib/sql/admin-catalog';
import { blogImage } from '@/lib/sql/media';
import NewBlogButton from '@/components/admin/NewBlogButton';
import SafeImage from '@/components/common/SafeImage';
import AdminTable from '@/components/admin/AdminTable';
import { formatDate } from '@/lib/utils';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Blogs' };

export default async function AdminBlogsPage({ searchParams }) {
  await requirePage('blogs');
  const params = await searchParams;
  const page = Number(params?.page) || 1;

  const [all, categories] = await Promise.all([listBlogs({ limit: 500 }), listBlogCategories()]);
  const view = paginate(all || [], page);
  const posts = view.rows;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Blogs</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-400">{`${view.total} posts`}</p>
        </div>
        <NewBlogButton categories={categories || []} lastAuthor={all?.[0]?.author || ''} />
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
              <div className="flex items-center gap-3">
                <span className="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-muted text-ink-300">
                  {blogImage(p.id)
                    ? <SafeImage src={blogImage(p.id)} alt="" fill sizes="64px" className="object-cover" iconSize={14} />
                    : <ImageOff size={15} aria-label="No cover image" />}
                </span>
                <div className="min-w-0">
                  <Link href={`/admin/blogs/${p.id}`} className="line-clamp-1 font-medium text-primary-700 hover:text-primary-800">
                    {p.title}
                  </Link>
                  <span className="block text-[12px] text-ink-300">/{p.slug}</span>
                </div>
              </div>
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

      <Pagination {...view} label="posts" />
    </>
  );
}
