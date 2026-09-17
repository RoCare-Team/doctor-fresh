import RedirectManager from '@/components/admin/RedirectManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'uniredirected urls redirecting' };

export default function AdminRedirectsPage() {
  return <RedirectManager />;
}
