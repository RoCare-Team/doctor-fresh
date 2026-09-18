import RedirectManager from '@/components/admin/RedirectManager';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'uniredirected urls redirecting' };

export default async function AdminRedirectsPage() {
  await requirePage('redirects');
  return <RedirectManager />;
}
