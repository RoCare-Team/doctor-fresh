'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/useSession';
import RequestWizard from './RequestWizard';

/**
 * Opens the enquiry popup for signed-out visitors, as the current site does.
 *
 * The current site fires it 12 seconds after every page load, so the same delay
 * is used and nothing is remembered between loads — a refresh brings it back.
 * It is skipped for anyone signed in, who has already told us who they are.
 */

const DELAY_MS = 12_000;

export default function RequestWizardTrigger() {
  const { user, loading } = useSession();
  const [open, setOpen] = useState(false);

  // Opened once per page load. Without this the timer would restart the moment
  // the popup was closed and it would keep coming back on the same page.
  const [alreadyOpened, setAlreadyOpened] = useState(false);

  useEffect(() => {
    if (loading || user || alreadyOpened) return undefined;

    const timer = setTimeout(() => {
      setOpen(true);
      setAlreadyOpened(true);
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [loading, user, alreadyOpened]);

  if (!open) return null;
  return <RequestWizard onClose={() => setOpen(false)} />;
}
