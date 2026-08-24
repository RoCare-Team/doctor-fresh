import Link from 'next/link';
import Image from 'next/image';
import { CalendarDays, Clock, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import BlogImage from './BlogImage';

const CATEGORY_LABEL = {
  'water-purifier': 'Water Purifier',
  'water-softener': 'Water Softener',
  health: 'Health',
  'waterborne-disease': 'Waterborne Disease',
  'how-to': 'How To',
  'ro-plant': 'RO Plant',
  'ro-services': 'RO Services',
};

function Meta({ post, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-400 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays size={13} aria-hidden="true" />
        {formatDate(post.date)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock size={13} aria-hidden="true" />
        {post.readingMinutes} min read
      </span>
    </div>
  );
}

export default function BlogCard({ post, featured = false }) {
  if (!post) return null;

  const category = post.categories?.[0];
  const badge = category ? CATEGORY_LABEL[category] || category : null;

  if (featured) {
    return (
      <article className="df-card df-card-hover group grid overflow-hidden md:grid-cols-2">
        <Link href={post.url} className="relative aspect-[16/10] overflow-hidden bg-surface-muted md:aspect-auto">
          <BlogImage
            post={post}
            sizes="(max-width: 768px) 100vw, 620px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </Link>

        <div className="flex flex-col justify-center p-6 md:p-9">
          {badge ? (
            <span className="mb-4 inline-flex w-fit rounded-full bg-primary-50 px-3 py-1 text-[12.5px] font-semibold uppercase tracking-wide text-primary-800">
              {badge}
            </span>
          ) : null}

          <h3 className="text-[22px] font-semibold leading-snug tracking-tight text-ink-900 md:text-[27px]">
            <Link href={post.url} className="transition-colors hover:text-primary-800">
              {post.title}
            </Link>
          </h3>

          <p className="mt-3 line-clamp-3 text-[15.5px] leading-relaxed text-ink-500">
            {post.excerpt}
          </p>

          <Meta post={post} className="mt-5" />

          <Link
            href={post.url}
            className="mt-5 inline-flex w-fit items-center gap-1.5 text-[15px] font-medium text-primary-700 transition-colors hover:text-primary-800"
          >
            Read more
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="df-card df-card-hover group flex h-full flex-col overflow-hidden">
      <Link href={post.url} className="relative block aspect-[16/10] overflow-hidden bg-surface-muted">
        <BlogImage
          post={post}
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {badge ? (
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-primary-800">
            {badge}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Meta post={post} className="mb-3" />

        <h3 className="text-[17px] font-semibold leading-snug text-ink-900">
          <Link href={post.url} className="line-clamp-2 transition-colors hover:text-primary-800">
            {post.title}
          </Link>
        </h3>

        <p className="mt-2.5 line-clamp-3 text-[14.5px] leading-relaxed text-ink-400">
          {post.excerpt}
        </p>

        <Link
          href={post.url}
          className="mt-4 inline-flex w-fit items-center gap-1.5 text-[14.5px] font-medium text-primary-700 transition-colors hover:text-primary-800"
        >
          Read more
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
