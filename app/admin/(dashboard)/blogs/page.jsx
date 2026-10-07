import Link from 'next/link';
import Pagination, { paginate } from '@/components/admin/Pagination';
import {
  ImageOff, Newspaper, Eye, EyeOff, Layers, Search,
} from 'lucide-react';
import { listBlogs, listBlogCategories } from '@/lib/sql/admin-catalog';
import StatCards from '@/components/admin/StatCards';
import ListTools from '@/components/admin/ListTools';
import { cx } from '@/lib/utils';
import { blogImage } from '@/lib/sql/media';
import { warmMedia } from '@/lib/blob';
import NewBlogButton from '@/components/admin/NewBlogButton';
import SafeImage from '@/components/common/SafeImage';
import AdminTable from '@/components/admin/AdminTable';
import BlogRowActions from '@/components/admin/BlogRowActions';
import { formatDate } from '@/lib/utils';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Blogs' };

export default async function AdminBlogsPage({ searchParams }) {
  await requirePage('blogs');
  await warmMedia(); // covers uploaded to Vercel Blob
  const params = await searchParams;
  const page = Number(params?.page) || 1;

  const [rows, categories] = await Promise.all([listBlogs({ limit: 500 }), listBlogCategories()]);
  const all = rows || [];

  const show = ['live', 'hidden'].includes(params?.show) ? params.show : '';
  const category = String(params?.category || '').trim();
  const q = String(params?.q || '').trim().toLowerCase();

  const filtered = all
    .filter((p) => (show === 'live' ? p.live : show === 'hidden' ? !p.live : true))
    .filter((p) => (category ? p.category === category : true))
    .filter((p) => !q || [p.title, p.slug, p.author, p.category].join(' ').toLowerCase().includes(q));

  const view = paginate(filtered, page);
  const posts = view.rows;

  const live = all.filter((p) => p.live).length;
  const link = (patch) => {
    const search = new URLSearchParams();
    Object.entries({
      show, category, q: params?.q || '', ...patch,
    }).forEach(([k, v]) => { if (v) search.set(k, v); });
    return search.toString() ? `/admin/blogs?${search}` : '/admin/blogs';
  };

  const cards = [
    {
      id: 'total', label: 'Total Posts', value: all.length, icon: Newspaper, tone: 'primary',
      href: link({ show: '', category: '', page: '' }), active: !show && !category,
    },
    {
      id: 'live', label: 'Live', value: live, note: 'on the website', icon: Eye, tone: 'green',
      href: link({ show: 'live', page: '' }), active: show === 'live',
    },
    {
      id: 'hidden', label: 'Hidden', value: all.length - live, note: 'not published', icon: EyeOff, tone: 'amber',
      href: link({ show: 'hidden', page: '' }), active: show === 'hidden',
    },
    {
      id: 'cats', label: 'Categories', value: (categories || []).length, icon: Layers, tone: 'violet',
    },
  ];

  const exportColumns = [
    { label: 'Title', key: 'title' }, { label: 'Address', key: 'slug' },
    { label: 'Category', key: 'category' }, { label: 'Author', key: 'author' },
    { label: 'Date', key: 'on' }, { label: 'Views', key: 'views' }, { label: 'Status', key: 'state' },
  ];
  const exportRows = filtered.map((p) => ({
    ...p, state: p.live ? 'Live' : 'Hidden', on: p.date ? formatDate(p.date) : '',
  }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-900">Blogs</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-400">
            {view.total === all.length ? `${all.length} posts` : `${view.total} of ${all.length} posts`}
          </p>
        </div>
        <NewBlogButton categories={categories || []} lastAuthor={all?.[0]?.author || ''} />
      </div>

      <StatCards cards={cards} className="mt-4" />

      {/* Which posts to list, a search over them, and the list as a sheet. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-2.5">
        <nav className="flex flex-wrap gap-1" aria-label="Filter posts">
          {[
            { id: '', label: 'All', count: all.length },
            { id: 'live', label: 'Live', count: live },
            { id: 'hidden', label: 'Hidden', count: all.length - live },
          ].map((t) => (
            <Link
              key={t.id || 'all'}
              href={link({ show: t.id, page: '' })}
              aria-current={show === t.id ? 'page' : undefined}
              className={cx(
                'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
                show === t.id ? 'bg-primary-500 text-white' : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900',
              )}
            >
              {t.label}
              <span className={cx('rounded-full px-1.5 text-[11.5px] tabular-nums', show === t.id ? 'bg-white/20' : 'bg-surface-muted text-ink-400')}>
                {t.count}
              </span>
            </Link>
          ))}
        </nav>

        <form action="/admin/blogs" className="relative ml-auto w-full sm:w-60">
          {show ? <input type="hidden" name="show" value={show} /> : null}
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
          <input
            name="q"
            defaultValue={params?.q || ''}
            placeholder="Search title, author…"
            aria-label="Search posts"
            className="h-9 w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 text-[13.5px] outline-none focus:border-primary-500"
          />
        </form>

        <ListTools rows={exportRows} columns={exportColumns} filename="blog-posts" />
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
        minWidth={920}
      >
        {(posts || []).map((p) => (
          <tr key={p.id} className="transition-colors hover:bg-surface-muted">
            <td className="px-4 py-3.5">
              <div className="flex max-w-[380px] items-center gap-3.5">
                <span className="relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white text-ink-300">
                  {blogImage(p.id)
                    ? <SafeImage src={blogImage(p.id)} alt="" fill sizes="80px" className="object-cover" iconSize={14} />
                    : <ImageOff size={16} aria-label="No cover image" />}
                </span>
                <div className="min-w-0">
                  <span className="flex items-center gap-2">
                    <Link href={`/admin/blogs/${p.id}`} className="truncate text-[14.5px] font-semibold text-ink-900 hover:text-primary-700">
                      {p.title}
                    </Link>
                    {/* The state belongs on the row, not in its background: a
                        shaded row says "different" without saying how. */}
                    <span className={cx(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      p.live ? 'bg-success/10 text-success' : 'bg-warning/15 text-warning',
                    )}
                    >
                      {p.live ? 'Live' : 'Hidden'}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-ink-400">/{p.slug}</span>
                </div>
              </div>
            </td>
            <td className="hidden px-4 py-3.5 sm:table-cell">
              {p.category ? (
                <Link
                  href={link({ category: p.category, page: '' })}
                  className="inline-block rounded-full border border-line px-2.5 py-0.5 text-[12.5px] text-ink-600 transition-colors hover:border-primary-300 hover:text-primary-700"
                >
                  {p.category}
                </Link>
              ) : <span className="text-ink-300">—</span>}
            </td>
            <td className="hidden px-4 py-3.5 text-[13.5px] text-ink-500 sm:table-cell">
              <span className="block max-w-[130px] truncate" title={p.author || ''}>{p.author || '—'}</span>
            </td>
            <td className="whitespace-nowrap px-4 py-3.5 text-[13.5px] text-ink-500">{p.date ? formatDate(p.date) : '—'}</td>
            <td className="px-4 py-3.5 text-[13.5px] tabular-nums text-ink-500">{p.views}</td>
            <td className="whitespace-nowrap px-4 py-3.5 text-right">
              <BlogRowActions post={p} />
            </td>
          </tr>
        ))}
      </AdminTable>

      <Pagination {...view} params={{ show, category, q: params?.q || '' }} label="posts" />
    </>
  );
}
