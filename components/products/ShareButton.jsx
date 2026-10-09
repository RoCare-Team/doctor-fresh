'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

/**
 * Shares the page: the phone's own share sheet where there is one, otherwise
 * the link is copied and the button says so for a moment.
 */
export default function ShareButton({ title, className = '' }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* closed the sheet */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked — nothing more to do */ }
  }

  return (
    <button type="button" onClick={share} className={className}>
      {copied ? <Check size={17} aria-hidden="true" /> : <Share2 size={17} aria-hidden="true" />}
      <span>{copied ? 'Link copied' : 'Share'}</span>
    </button>
  );
}
