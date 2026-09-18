import { listMessages } from '@/lib/sql/admin';
import MessageInbox from '@/components/admin/MessageInbox';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contact messages' };

/** What visitors send from /contact. */
export default async function AdminMessagesPage({ searchParams }) {
  await requirePage('messages');
  const params = await searchParams;
  const messages = await listMessages({ kind: 'contact', limit: 1000 });

  return (
    <MessageInbox
      basePath="/admin/messages"
      title="Contact messages"
      intro="Everything sent from the Contact Us page. Mark a message handled once someone has replied."
      messages={messages}
      params={params || {}}
      emptyText="Messages from the Contact Us page will appear here."
    />
  );
}
