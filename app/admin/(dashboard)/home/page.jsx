import { requirePage } from '@/lib/admin/guard';
import { getHomeContent, HOME_DEFAULTS } from '@/lib/sql/site-content';
import { quickLinksForHome } from '@/lib/sql/quick-links';
import HomeContentEditor from '@/components/admin/HomeContentEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Home page' };

export default async function AdminHomePage() {
  await requirePage('home');
  const [content, quickLinks] = await Promise.all([getHomeContent(), quickLinksForHome().catch(() => [])]);
  return <HomeContentEditor content={content} defaults={HOME_DEFAULTS} quickLinkCount={quickLinks.length} />;
}
