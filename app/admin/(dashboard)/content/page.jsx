import { requirePage } from '@/lib/admin/guard';
import { getContent, listLegalPages } from '@/lib/sql/site-content';
import SiteContentEditor from '@/components/admin/SiteContentEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Site content' };

export default async function AdminContentPage() {
  await requirePage('content');
  const [nav, homeSections, pages, footer, legal] = await Promise.all([
    getContent('nav'), getContent('home_sections'), getContent('pages'), getContent('footer'), listLegalPages(),
  ]);
  return (
    <SiteContentEditor
      initial={{
        nav, home_sections: homeSections, pages, footer,
      }}
      legal={legal}
    />
  );
}
