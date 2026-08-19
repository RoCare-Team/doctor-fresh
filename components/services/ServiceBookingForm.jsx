'use client';

import { useFormSubmit } from '@/lib/forms';
import { Input, Select, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

const SERVICE_TYPES = [
  'RO Routine Service',
  'RO Repair',
  'Installation',
  'Uninstallation',
  'AMC Plan',
  'Free Water Test',
  'New Purchase Enquiry',
];

export default function ServiceBookingForm({ location, serviceLabel = 'RO Service' }) {
  const { status, error, send, sending } = useFormSubmit('/request/form/submit.php');

  return (
    <div id="book" className="scroll-mt-[196px] rounded-[10px] border border-line bg-white p-5 md:p-6">
      <h2 className="text-lg font-semibold text-ink-900">
        Book {serviceLabel}
        {location ? ` in ${location}` : ''}
      </h2>
      <p className="mt-1 text-[14px] text-ink-400">
        Share your details and our team will call you back to confirm a time slot.
      </p>

      <form onSubmit={send} className="mt-5 grid gap-3.5 sm:grid-cols-2">
        <input type="hidden" name="enquiry_type" value={`${serviceLabel} Booking`} />
        <input type="hidden" name="city" value={location || ''} />

        <Input label="Full name" name="name" required placeholder="Your name" />
        <Input label="Mobile number" name="mobile" type="tel" required placeholder="10 digit mobile number" pattern="[0-9]{10}" />
        <Input label="Email" name="email" type="email" placeholder="you@example.com" />
        <Input label="Pin code" name="c_pincode" placeholder="Enter pin code" />
        <Select
          label="Service required"
          name="serv_type"
          required
          placeholder="Select a service"
          options={SERVICE_TYPES}
          className="sm:col-span-2"
        />
        <Textarea
          label="Address / requirement"
          name="message"
          rows={3}
          placeholder="House no., area, nearby landmark or describe the issue"
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <Button type="submit" size="lg" disabled={sending} full>
            {sending ? 'Sending…' : 'Request a callback'}
          </Button>
        </div>

        {status !== 'idle' ? (
          <div className="sm:col-span-2">
            <FormNote
              status={status}
              error={error}
              doneMessage="Booking received — our service team will call you within 30 minutes."
            />
          </div>
        ) : null}
      </form>
    </div>
  );
}
