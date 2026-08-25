'use client';

import { useState } from 'react';

/**
 * Shared submit handling for the site's forms.
 *
 * Each form posts to the API route that writes it to the table the PHP site
 * uses — `contact_message`, `subscribe`, `leads`, `request_call_back` — so a
 * submission always ends up somewhere the team reads, and the visitor is told
 * the truth about whether it was saved.
 */
export function useFormSubmit(endpoint) {
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function send(event, extra = {}) {
    event.preventDefault();
    setStatus('sending');
    setError('');
    setNote('');

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Something went wrong. Please call +91-9311587716.');
      }

      // Some endpoints report a harmless outcome worth mentioning, such as an
      // address that was already subscribed.
      if (data.already) setNote('You are already subscribed.');

      setStatus('done');
      form.reset();
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  function reset() {
    setStatus('idle');
    setError('');
    setNote('');
  }

  return {
    status, error, note, send, reset, sending: status === 'sending', done: status === 'done',
  };
}
