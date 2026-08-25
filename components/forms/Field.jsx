import { cx } from '@/lib/utils';

const BASE =
  'w-full rounded-md border border-line-strong bg-white px-3.5 text-sm text-ink-900 outline-none ' +
  'transition-colors placeholder:text-ink-300 focus:border-primary-500';

export function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[14px] font-medium text-ink-700">
      {children}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </label>
  );
}

export function Input({ label, name, className, ...rest }) {
  return (
    <div className={className}>
      {label ? <Label htmlFor={name} required={rest.required}>{label}</Label> : null}
      <input id={name} name={name} className={cx(BASE, 'h-11')} {...rest} />
    </div>
  );
}

export function Textarea({ label, name, className, rows = 4, ...rest }) {
  return (
    <div className={className}>
      {label ? <Label htmlFor={name} required={rest.required}>{label}</Label> : null}
      <textarea id={name} name={name} rows={rows} className={cx(BASE, 'py-2.5')} {...rest} />
    </div>
  );
}

export function Select({ label, name, options = [], placeholder, className, ...rest }) {
  // A controlled select must not also carry defaultValue.
  const uncontrolled = rest.value === undefined ? { defaultValue: '' } : {};
  return (
    <div className={className}>
      {label ? <Label htmlFor={name} required={rest.required}>{label}</Label> : null}
      <select id={name} name={name} {...uncontrolled} className={cx(BASE, 'h-11 appearance-none pr-9 disabled:bg-surface-muted disabled:text-ink-300')} {...rest}>
        {placeholder ? <option value="" disabled>{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RadioGroup({ label, name, options = [], className, required }) {
  return (
    <fieldset className={className}>
      {label ? (
        <legend className="mb-1.5 text-[14px] font-medium text-ink-700">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </legend>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const value = o.value ?? o;
          const text = o.label ?? o;
          return (
            <label
              key={value}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line-strong px-3 py-2 text-[14px] text-ink-700 transition-colors hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 has-[:checked]:text-primary-700"
            >
              <input type="radio" name={name} value={value} required={required} className="accent-primary-600" />
              {text}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FormNote({ status, error, doneMessage = 'Thank you — our team will contact you shortly.' }) {
  if (status === 'done') {
    return (
      <p className="rounded-md border border-success/30 bg-success/10 px-3.5 py-2.5 text-[14px] text-ink-700">
        {doneMessage}
      </p>
    );
  }
  if (status === 'error') {
    return (
      <p className="rounded-md border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[14px] text-danger">
        {error}
      </p>
    );
  }
  return null;
}
