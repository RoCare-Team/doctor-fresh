'use client';

import { useState } from 'react';
import { Input, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

/**
 * Edit the details stored on the customer's `user` row.
 *
 * The mobile number is shown but not editable — it is how the customer signs
 * in, so changing it would need its own verification.
 */
export default function ProfileForm({ profile }) {
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save your details.');
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={save} className="df-card p-5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Input label="First name" name="username" defaultValue={profile.firstName} required maxLength={100} autoComplete="given-name" />
        <Input label="Last name" name="surname" defaultValue={profile.lastName} maxLength={100} autoComplete="family-name" />

        <Input label="Email" name="email" type="email" defaultValue={profile.email} placeholder="you@example.com" autoComplete="email" className="sm:col-span-2" />

        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[14px] font-medium text-ink-700">Mobile number</span>
          <p className="flex h-11 items-center rounded-md border border-line bg-surface-muted px-3.5 text-sm text-ink-500">
            +91 {profile.mobile}
            <span className="ml-auto text-[12.5px] text-ink-400">used to sign in</span>
          </p>
        </div>

        <Input label="Address line 1" name="address1" defaultValue={profile.address1} placeholder="House / building, street" autoComplete="address-line1" className="sm:col-span-2" />
        <Input label="Address line 2" name="address2" defaultValue={profile.address2} placeholder="Area, landmark" autoComplete="address-line2" className="sm:col-span-2" />

        <Input label="City" name="city" defaultValue={profile.city} autoComplete="address-level2" />
        <Input label="State" name="state" defaultValue={profile.state} autoComplete="address-level1" />
        <Input label="Pin code" name="zip" defaultValue={profile.zip} pattern="[0-9]{6}" maxLength={6} autoComplete="postal-code" />
        <Input label="Country" name="country" defaultValue={profile.country || 'India'} autoComplete="country-name" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save details'}
        </Button>
        {status === 'done' ? <span className="text-[14px] text-success">Saved</span> : null}
      </div>

      {status === 'error' ? <div className="mt-3"><FormNote status="error" error={error} /></div> : null}
    </form>
  );
}
