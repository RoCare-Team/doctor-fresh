'use client';

import { useState } from 'react';

/**
 * Shared submit handling for every form on the site.
 *
 * The existing backend endpoints are recorded on each form (`endpoint`) so that
 * phase two only has to replace the body of `send()` with a real fetch to the
 * current PHP/SQL API — no form component needs to change.
 */
export function useFormSubmit(endpoint) {
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  async function send(event, extra = {}) {
    event.preventDefault();
    setStatus('sending');
    setError('');

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());

    try {
      // Backend integration point — the existing SQL/PHP endpoint goes here.
      // Until then the submission is acknowledged in the UI only.
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.info('[form]', endpoint, { ...values, ...extra });
      }
      setStatus('done');
      form.reset();
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Something went wrong. Please call us on +91-9311587716.');
    }
  }

  function reset() {
    setStatus('idle');
    setError('');
  }

  return { status, error, send, reset, sending: status === 'sending', done: status === 'done' };
}
