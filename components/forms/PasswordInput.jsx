'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Label } from '@/components/forms/Field';

/**
 * A password box with the eye to show what was typed — a long admin password
 * mistyped once on a phone keyboard is otherwise a guessing game.
 */
export default function PasswordInput({
  label, name, className, ...rest
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      {label ? <Label htmlFor={name} required={rest.required}>{label}</Label> : null}
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          className="h-11 w-full rounded-md border border-line-strong bg-white pl-3.5 pr-11 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
