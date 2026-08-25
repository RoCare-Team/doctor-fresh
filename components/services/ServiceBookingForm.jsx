'use client';

import { useEffect, useState } from 'react';
import { Input, Select, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

/**
 * The booking form on every service and location page.
 *
 * It writes to the site's `leads` table, and its dropdowns are the same ones
 * the PHP form uses: `ro_status`, `ro_status_query` (which depends on the
 * chosen status), `ro_units`, `states` and `cities`.
 */
export default function ServiceBookingForm({ location, serviceLabel = 'RO Service', pageId, options }) {
  const [roStatus, setRoStatus] = useState('');
  const [state, setState] = useState('');
  const [cities, setCities] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  const queries = options?.queriesByStatus?.[roStatus] || [];

  // Cities are fetched for the chosen state, as the PHP form does.
  useEffect(() => {
    if (!state) { setCities([]); return undefined; }

    let cancelled = false;
    fetch(`/api/forms/cities?state=${encodeURIComponent(state)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setCities(d.cities || []); })
      .catch(() => { if (!cancelled) setCities([]); });

    return () => { cancelled = true; };
  }, [state]);

  async function send(event) {
    event.preventDefault();
    setStatus('sending');
    setError('');

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/forms/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, pageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not send your request.');

      setStatus('done');
      form.reset();
      setRoStatus('');
      setState('');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <div id="book" className="scroll-mt-39 df-card p-5 md:p-6">
      <h2 className="text-lg font-semibold text-ink-900">
        Book {serviceLabel}
        {location ? ` in ${location}` : ''}
      </h2>
      <p className="mt-1 text-[14px] text-ink-400">
        Share your details and our team will call you back to confirm a time slot.
      </p>

      <form onSubmit={send} className="mt-5 grid gap-3.5 sm:grid-cols-2">
        <Input label="Full name" name="name" required placeholder="Your name" autoComplete="name" />
        <Input label="Mobile number" name="mobile" type="tel" required pattern="[0-9]{10}" maxLength={10} placeholder="10 digit mobile number" autoComplete="tel" />
        <Input label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />

        <Select
          label="Your RO status"
          name="roStatus"
          placeholder="Select"
          options={options?.roStatus || []}
          value={roStatus}
          onChange={(e) => setRoStatus(e.target.value)}
        />

        <Select
          label="Service required"
          name="queryFor"
          required
          placeholder={roStatus ? 'Select a service' : 'Choose your RO status first'}
          options={queries}
          disabled={!queries.length}
          className="sm:col-span-2"
        />

        <Select
          label="State"
          name="state"
          placeholder="Select state"
          options={options?.states || []}
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
        <Select
          label="City"
          name="city"
          placeholder={state ? 'Select city' : 'Choose a state first'}
          options={cities}
          disabled={!cities.length}
        />

        <Select label="Units" name="unit" placeholder="Select" options={options?.units || []} />
        <Input label="Preferred date" name="bookDate" type="date" />

        <Textarea
          label="Address / requirement"
          name="address"
          rows={3}
          placeholder="House no., area, nearby landmark or describe the issue"
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <Button type="submit" size="lg" disabled={status === 'sending'} full>
            {status === 'sending' ? 'Sending…' : 'Request a callback'}
          </Button>
        </div>

        {status !== 'idle' && status !== 'sending' ? (
          <div className="sm:col-span-2">
            <FormNote
              status={status}
              error={error}
              doneMessage="Request received — our service team will call you shortly."
            />
          </div>
        ) : null}
      </form>
    </div>
  );
}
