import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { CalendarDays, Clock, User } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import BlogCard from '@/components/blogs/BlogCard';
import Button from '@/components/common/Button';
import { getAllBlogPosts, getBlogPost, getRelatedBlogPosts, getBlogCategory } from '@/lib/catalog';
import { formatDate, imageUrl, metaFor, SITE_URL } from '@/lib/utils';

export function generateStaticParams() {
  return getAllBlogPosts().map((p) => ({ id: String(p.id), slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { id, slug } = await params;
  const post = getBlogPost(id);
  if (!post) return {};

  return metaFor({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    path: `/blog/${id}/${slug}`,
    image: post.image,
  });
}

export default async function BlogPostPage({ params }) {
  const { id } = await params;
  const post = getBlogPost(id);
  if (!post) notFound();

  const related = getRelatedBlogPosts(post, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    image: [imageUrl(post.image)],
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Doctor Fresh',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/uploads/logo_image/logo_86.webp` },
    },
    mainEntityOfPage: `${SITE_URL}${post.url}`,
    description: post.metaDescription || post.excerpt,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="df-container py-6 md:py-8">
        <Breadcrumb
          items={[
            { name: 'Blogs', href: '/blogs' },
            ...(post.categories[0]
              ? [{ name: getBlogCategory(post.categories[0])?.name || post.categories[0], href: `/blogs/${post.categories[0]}` }]
              : []),
            { name: post.title, href: post.url },
          ]}
        />

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article>
            <header>
              <h1 className="text-[26px] font-semibold leading-tight text-ink-900 md:text-[34px]">
                {post.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-ink-400">
                <span className="inline-flex items-center gap-1.5">
                  <User size={14} aria-hidden="true" />
                  {post.author}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={14} aria-hidden="true" />
                  {formatDate(post.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} aria-hidden="true" />
                  {post.readingMinutes} min read
                </span>
              </div>

              {post.categories.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.categories.map((c) => (
                    <Link
                      key={c}
                      href={`/blogs/${c}`}
                      className="rounded-md border border-line bg-white px-3 py-1 text-[13.5px] text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-800"
                    >
                      {getBlogCategory(c)?.name || c}
                    </Link>
                  ))}
                </div>
              ) : null}
            </header>

            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[10px] border border-line bg-surface-muted">
              <Image
                src={imageUrl(post.image)}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 820px"
                className="object-cover"
                unoptimized
              />
            </div>

            <div
              className="df-prose mt-8 max-w-none"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />

            <div className="mt-10 rounded-[10px] border border-line bg-surface-muted px-6 py-7">
              <h2 className="text-lg font-semibold text-ink-900">Need help choosing or servicing a purifier?</h2>
              <p className="mt-1.5 text-[14.5px] text-ink-400">
                Talk to a Doctor Fresh water expert or book a free water quality test at your home.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button href="tel:9311587716">Call +91-9311587716</Button>
                <Button href="/water-purifier-service" variant="outline">Book RO service</Button>
              </div>
            </div>
          </article>

          <aside className="lg:sticky lg:top-[178px] lg:self-start">
            <h2 className="mb-4 text-[16px] font-semibold text-ink-900">Related articles</h2>
            <div className="space-y-4">
              {related.map((p) => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
