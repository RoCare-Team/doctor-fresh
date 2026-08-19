import Breadcrumb from '@/components/common/Breadcrumb';
import Button from '@/components/common/Button';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: 'Compare products',
  description: 'Compare Doctor Fresh water purifiers side by side.',
  path: '/compare',
  robots: { index: false, follow: true },
});

export default function ComparePage() {
  return (
    <div className="df-container py-6 md:py-8">
      <Breadcrumb items={[{ name: 'Compare', href: '/compare' }]} />

      <h1 className="mt-4 mb-6 text-2xl font-semibold text-ink-900 md:text-[30px]">Compare products</h1>

      <div className="rounded-[10px] border border-dashed border-line-strong bg-surface-muted px-6 py-16 text-center">
        <h2 className="text-lg font-semibold text-ink-900">Your compare list is empty</h2>
        <p className="mx-auto mt-1.5 max-w-md text-[14.5px] text-ink-400">
          Add products from any category page to compare their specifications side by side.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button href="/category/water-purifier">Browse water purifiers</Button>
          <Button href="/" variant="outline">Back to home</Button>
        </div>
      </div>
    </div>
  );
}
