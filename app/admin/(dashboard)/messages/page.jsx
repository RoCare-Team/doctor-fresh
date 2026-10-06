import { listMessages } from '@/lib/sql/admin';
import { messageStatusMap, statusOf } from '@/lib/sql/message-status';
import MessageInbox from '@/components/admin/MessageInbox';
import { requirePage } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contact messages' };

/** What visitors send from /contact. */
export default async function AdminMessagesPage({ searchParams }) {
  await requirePage('messages');
  const params = await searchParams;
  // Each message carries how far it has got: new, in progress or resolved.
  const [rows, statuses] = await Promise.all([
    listMessages({ kind: 'contact', limit: 1000 }),
    messageStatusMap().catch(() => new Map()),
  ]);
  const messages = rows.map((m) => ({ ...m, status: statusOf(statuses, m.id, m.handled) }));

  return (
    <MessageInbox
      basePath="/admin/messages"
      title="Contact messages"
      intro="Everything sent from the Contact Us page. Move each one along as it is picked up and answered."
      messages={messages}
      params={params || {}}
      emptyText="Messages from the Contact Us page will appear here."
    />
  );
}
