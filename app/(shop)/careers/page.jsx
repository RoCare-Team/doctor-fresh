import Breadcrumb from '@/components/common/Breadcrumb';
import { getBrand } from '@/lib/catalog';
import Button from '@/components/common/Button';
import { careers } from '@/data/site';
import { getContent } from '@/lib/sql/site-content';
import { metaFor } from '@/lib/utils';

// Text and search listing come from the admin (Site content).
export async function generateMetadata() {
  const c = await getContent('pages').catch(() => null);
  return metaFor({ title: c?.careersMetaTitle || 'Careers', description: c?.careersMetaDescription, path: '/careers' });
}

export default async function CareersPage() {
  const [brand, c] = await Promise.all([getBrand(), getContent('pages').catch(() => ({}))]);
  return (
    <>
      <div className="border-b border-line bg-surface-muted">
        <div className="df-container py-4">
          <Breadcrumb items={[{ name: 'Careers', href: '/careers' }]} />
        </div>
      </div>

      <div className="df-container py-8 md:py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[34px]">{c.careersTitle || careers.title}</h1>
        <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-400">{c.careersIntro || careers.intro}</p>
      </header>

      <div className="rounded-[14px] border border-line bg-surface-muted px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-ink-900">{c.careersOpeningsTitle}</h2>
        <p className="mx-auto mt-2 max-w-xl text-[14.5px] leading-relaxed text-ink-400">
          {c.careersOpeningsText}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button href={`mailto:${brand.email}?subject=Career%20application`}>Email your CV</Button>
          <Button href="/contact" variant="outline">Contact us</Button>
        </div>
      </div>
      </div>
    </>
  );
}
