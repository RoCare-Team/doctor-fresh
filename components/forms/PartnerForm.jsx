'use client';

import { useState } from 'react';
import { useFormSubmit } from '@/lib/forms';
import { Input, Select, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';
import { cx } from '@/lib/utils';

export default function PartnerForm({ tabs = [], fields = [] }) {
  const [active, setActive] = useState(0);
  const { status, error, send, sending, reset } = useFormSubmit('/request/form/submit.php');

  const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
  const activeTab = tabs[active] || 'Become A Partner';

  function renderField(name, props = {}) {
    const f = byName[name];
    if (!f) return null;
    if (f.tag === 'select') {
      return (
        <Select
          key={name}
          label={props.label}
          name={name}
          required={f.required}
          placeholder={props.placeholder || 'Select an option'}
          options={f.options}
          {...props.rest}
        />
      );
    }
    if (f.tag === 'textarea') {
      return (
        <Textarea
          key={name}
          label={props.label}
          name={name}
          rows={3}
          required={f.required}
          placeholder={f.placeholder}
          className="sm:col-span-2"
        />
      );
    }
    return (
      <Input
        key={name}
        label={props.label}
        name={name}
        type={props.type || 'text'}
        required={f.required}
        placeholder={f.placeholder}
        {...props.rest}
      />
    );
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Partnership type"
        className="df-no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => { setActive(i); reset(); }}
            className={cx(
              'whitespace-nowrap rounded-md border px-4 py-2.5 text-[14.5px] transition-colors',
              i === active
                ? 'border-primary-500 bg-primary-50 font-medium text-primary-700'
                : 'border-line bg-white text-ink-500 hover:border-primary-300 hover:text-primary-800',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={send} className="grid gap-3.5 sm:grid-cols-2">
        <input type="hidden" name="enquiry_type" value={activeTab} />

        {renderField('name', { label: 'First name' })}
        {renderField('email', { label: 'Email', type: 'email' })}
        {renderField('mobile', { label: 'Phone number', type: 'tel', rest: { pattern: '[0-9]{10}' } })}
        {renderField('business', { label: 'Business name' })}
        {renderField('investment_capacity', { label: 'Investment capacity', placeholder: 'Select investment capacity' })}
        {renderField('education', { label: 'Education', placeholder: 'Select education' })}
        {renderField('state', { label: 'State' })}
        {renderField('city', { label: 'City' })}
        {renderField('address', { label: 'Address' })}

        <div className="sm:col-span-2">
          <Button type="submit" size="lg" disabled={sending}>
            {sending ? 'Submitting…' : `Apply — ${activeTab}`}
          </Button>
        </div>

        {status !== 'idle' ? (
          <div className="sm:col-span-2">
            <FormNote
              status={status}
              error={error}
              doneMessage="Application received — our channel partner team will contact you shortly."
            />
          </div>
        ) : null}
      </form>
    </div>
  );
}
