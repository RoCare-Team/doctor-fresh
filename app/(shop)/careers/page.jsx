import Breadcrumb from '@/components/common/Breadcrumb';
import CareersBoard from '@/components/careers/CareersBoard';
import { careers } from '@/data/site';
import { getContent } from '@/lib/sql/site-content';
import { listJobs } from '@/lib/sql/careers';
import { metaFor } from '@/lib/utils';

// Rebuilt every 5 minutes, and at once when an opening is saved in the admin.
export const revalidate = 300;

// Text and search listing come from the admin (Site content).
export async function generateMetadata() {
  const c = await getContent('pages').catch(() => null);
  return metaFor({ title: c?.careersMetaTitle || 'Careers', description: c?.careersMetaDescription, path: '/careers' });
}

export default async function CareersPage() {
  const [c, jobs] = await Promise.all([
    getContent('pages').catch(() => ({})),
    // The openings added in the admin (Careers); only the open ones.
    listJobs({ openOnly: true }).catch(() => null),
  ]);
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

        <CareersBoard jobs={jobs || []} openingsTitle={c.careersOpeningsTitle} openingsText={c.careersOpeningsText} />
      </div>
    </>
  );
}
