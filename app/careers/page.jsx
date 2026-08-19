import Breadcrumb from '@/components/common/Breadcrumb';
import Button from '@/components/common/Button';
import { careers, brand } from '@/data/site';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: 'Careers',
  description: 'Career opportunities at Doctor Fresh — join a growing Indian water purification brand.',
  path: '/careers',
});

export default function CareersPage() {
  return (
    <div className="df-container py-6 md:py-8">
      <Breadcrumb items={[{ name: 'Careers', href: '/careers' }]} />

      <header className="mt-4 mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink-900 md:text-[30px]">{careers.title}</h1>
        <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-400">{careers.intro}</p>
      </header>

      <div className="rounded-[10px] border border-line bg-surface-muted px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-ink-900">Current openings</h2>
        <p className="mx-auto mt-2 max-w-xl text-[14.5px] leading-relaxed text-ink-400">
          Openings are published as they become available. Send your CV to our team and we will
          get in touch when a suitable role opens in your area.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button href={`mailto:${brand.email}?subject=Career%20application`}>Email your CV</Button>
          <Button href="/contact" variant="outline">Contact us</Button>
        </div>
      </div>
    </div>
  );
}
