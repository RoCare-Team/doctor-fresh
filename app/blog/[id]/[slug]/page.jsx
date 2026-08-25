import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Clock, User } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import BlogCard from '@/components/blogs/BlogCard';
import BlogImage from '@/components/blogs/BlogImage';
import BlogComments from '@/components/blogs/BlogComments';
import Button from '@/components/common/Button';
import { getAllBlogPosts, getBlogPost, getRelatedBlogPosts, getBlogCategory, getBrand } from '@/lib/catalog';

import { absoluteUrl, formatDate, imageUrl, metaFor, SITE_URL } from '@/lib/utils';

// Catalogue pages are rebuilt in the background every 5 minutes so edits made
// in the existing admin panel appear without a redeploy.
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getAllBlogPosts()).map((p) => ({ id: String(p.id), slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { id, slug } = await params;
  const post = await getBlogPost(id);
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
  const post = await getBlogPost(id);
  if (!post) notFound();

  const related = await getRelatedBlogPosts(post, 3);
  const brand = await getBrand();

  // category labels come from the catalog layer, so they are resolved up front
  const categoryLabels = Object.fromEntries(
    await Promise.all(post.categories.map(async (c) => [c, (await getBlogCategory(c))?.name || c])),
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    ...(post.image ? { image: [absoluteUrl(imageUrl(post.image))] } : {}),
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Doctor Fresh',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}${brand.logo}` },
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
              ? [{ name: categoryLabels[post.categories[0]], href: `/blogs/${post.categories[0]}` }]
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
                      {categoryLabels[c]}
                    </Link>
                  ))}
                </div>
              ) : null}
            </header>

            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[14px] border border-line bg-surface-muted">
              <BlogImage
                post={post}
                sizes="(max-width: 1024px) 100vw, 820px"
                className="object-cover"
              />
            </div>

            <div
              className="df-prose mt-8 max-w-none"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />

            <div className="mt-10 rounded-[14px] border border-line bg-surface-muted px-6 py-7">
              <h2 className="text-lg font-semibold text-ink-900">Need help choosing or servicing a purifier?</h2>
              <p className="mt-1.5 text-[14.5px] text-ink-400">
                Talk to a Doctor Fresh water expert or book a free water quality test at your home.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button href="tel:9311587716">Call +91-9311587716</Button>
                <Button href="/water-purifier-service" variant="outline">Book RO service</Button>
              </div>
            </div>
            <BlogComments path={post.url} />
          </article>

          <aside className="lg:sticky lg:top-[138px] lg:self-start">
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
