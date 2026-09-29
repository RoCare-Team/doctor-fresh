'use client';

// Brings someone back to the booking they left to pay for.
//
// It is the counterpart of the note left before the browser goes to the
// payment page. Whether they paid, cancelled or closed the gateway's tab, the
// first page of ours they touch afterwards sends them to their booking, which
// is where the payment can be tried again or handed to the technician.
//
// It fires once and then forgets: nobody should be dragged to the same page
// twice for a booking they have dealt with.

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearPendingBooking, readPendingBooking } from '@/lib/pending-booking';

export default function ResumeBooking() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const ref = readPendingBooking();
    if (!ref) return;

    // Already looking at it.
    if (pathname === '/book/done') { clearPendingBooking(); return; }

    clearPendingBooking();
    router.replace(`/book/done?ref=${encodeURIComponent(ref)}`);
  }, [pathname, router]);

  return null;
}
