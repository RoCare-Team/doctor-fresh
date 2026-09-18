import { listMessages } from '@/lib/sql/admin';
import MessageInbox from '@/components/admin/MessageInbox';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Partner requests' };

/** Dealer, distributor and C&F applications from /partner. */
export default async function AdminPartnersPage({ searchParams }) {
  await requirePage('messages');
  const params = await searchParams;
  const messages = await listMessages({ kind: 'partner', limit: 1000 });

  return (
    <MessageInbox
      basePath="/admin/partners"
      title="Partner requests"
      intro="Dealer, distributor and C&F applications from the Become a Partner page, with their business details."
      messages={messages}
      params={params || {}}
      emptyText="Applications from the Become a Partner page will appear here."
    />
  );
}
