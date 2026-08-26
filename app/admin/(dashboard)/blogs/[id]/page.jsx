import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getBlog, listBlogCategories } from '@/lib/sql/admin-catalog';
import BlogForm from '@/components/admin/BlogForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit post' };

export default async function AdminBlogPage({ params }) {
  const { id } = await params;
  const [post, categories] = await Promise.all([getBlog(Number(id)), listBlogCategories()]);
  if (!post) notFound();

  return (
    <>
      <Link
        href="/admin/blogs"
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-400 transition-colors hover:text-primary-700"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All posts
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink-900">{post.title}</h1>
          <p className="mt-0.5 text-[13.5px] text-ink-400">#{post.id} · /{post.slug}</p>
        </div>
        <Link
          href={`/blog/${post.id}/${post.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-[13.5px] text-ink-700 transition-colors hover:border-primary-300 hover:text-primary-800"
        >
          View on site
          <ExternalLink size={13} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 max-w-3xl">
        <BlogForm post={post} categories={categories || []} />
      </div>
    </>
  );
}
