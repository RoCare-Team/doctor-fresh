import { requirePage } from '@/lib/admin/guard';
import { listQuickLinks, QUICK_LINK_ICONS } from '@/lib/sql/quick-links';
import QuickLinksManager from '@/components/admin/QuickLinksManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quick links' };

export default async function AdminQuickLinksPage() {
  await requirePage('quick_links');
  const sections = (await listQuickLinks()) || [];
  return <QuickLinksManager sections={sections} icons={QUICK_LINK_ICONS} />;
}
