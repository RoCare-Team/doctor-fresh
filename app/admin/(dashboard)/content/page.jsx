import { requirePage } from '@/lib/admin/guard';
import { getContent, listLegalPages } from '@/lib/sql/site-content';
import { getCategoryImage } from '@/lib/catalog';
import SiteContentEditor from '@/components/admin/SiteContentEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Site content' };

export default async function AdminContentPage() {
  await requirePage('content');
  const [hero, nav, homeSections, pages, footer, legal] = await Promise.all([
    getContent('hero'), getContent('nav'), getContent('home_sections'), getContent('pages'),
    getContent('footer'), listLegalPages(),
  ]);
  // What each tile shows when it carries no picture of its own.
  const heroFallbacks = Object.fromEntries(
    await Promise.all((hero?.tiles || []).map(async (t) => [
      t.href,
      t.image ? '' : (await getCategoryImage(t.href).catch(() => null)) || '',
    ])),
  );

  return (
    <SiteContentEditor
      initial={{
        hero, nav, home_sections: homeSections, pages, footer,
      }}
      heroFallbacks={heroFallbacks}
      legal={legal}
    />
  );
}
