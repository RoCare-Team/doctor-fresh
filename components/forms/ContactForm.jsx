'use client';

import { useFormSubmit } from '@/lib/forms';
import { Input, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

export default function ContactForm({ fields = [] }) {
  const { status, error, send, sending } = useFormSubmit('/api/forms/contact');

  const byName = Object.fromEntries(fields.map((f) => [f.name, f]));

  return (
    <form onSubmit={send} className="grid gap-3.5 sm:grid-cols-2">
      <input type="hidden" name="enquiry_type" value="Contact Form" />

      <Input
        label="Name"
        name="name"
        required
        placeholder={byName.name?.placeholder || 'Name'}
      />
      <Input
        label="Mobile"
        name="mobile"
        type="tel"
        required
        pattern="[0-9]{10}"
        placeholder={byName.mobile?.placeholder || 'Mobile'}
      />
      <Input
        label="Email"
        name="email"
        type="email"
        required
        placeholder={byName.email?.placeholder || 'Email'}
        className="sm:col-span-2"
      />
      <Textarea
        label="Message"
        name="message"
        rows={5}
        required
        placeholder={byName.message?.placeholder || 'Message'}
        className="sm:col-span-2"
      />

      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? 'Sending…' : 'Send message'}
        </Button>
      </div>

      {status !== 'idle' ? (
        <div className="sm:col-span-2">
          <FormNote status={status} error={error} />
        </div>
      ) : null}
    </form>
  );
}
