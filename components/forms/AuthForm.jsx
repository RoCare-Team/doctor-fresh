'use client';

import Link from 'next/link';
import { useFormSubmit } from '@/lib/forms';
import { Input, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

export default function AuthForm({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const { status, error, send, sending } = useFormSubmit(isRegister ? '/registration' : '/login');

  return (
    <div className="mx-auto w-full max-w-md df-card p-6 md:p-7">
      <h1 className="text-xl font-semibold text-ink-900">
        {isRegister ? 'Create your account' : 'Sign in to your account'}
      </h1>
      <p className="mt-1.5 text-[14.5px] text-ink-400">
        {isRegister
          ? 'Track orders, service requests and AMC plans in one place.'
          : 'Access your orders, service bookings and saved addresses.'}
      </p>

      <form onSubmit={send} className="mt-6 grid gap-3.5">
        {isRegister ? <Input label="Full name" name="name" required placeholder="Your name" /> : null}
        <Input label="Email" name="email" type="email" required placeholder="you@example.com" />
        {isRegister ? (
          <Input label="Mobile number" name="mobile" type="tel" required pattern="[0-9]{10}" placeholder="10 digit mobile number" />
        ) : null}
        <Input label="Password" name="password" type="password" required placeholder="••••••••" />
        {isRegister ? (
          <Input label="Confirm password" name="confirm_password" type="password" required placeholder="••••••••" />
        ) : null}

        <Button type="submit" size="lg" full disabled={sending} className="mt-1">
          {sending ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </Button>

        {status !== 'idle' ? (
          <FormNote
            status={status}
            error={error}
            doneMessage={
              isRegister
                ? 'Account request received. Sign-in will be enabled once the account service is connected.'
                : 'Sign-in submitted. Account access will be enabled once the account service is connected.'
            }
          />
        ) : null}
      </form>

      <p className="mt-5 text-center text-[14px] text-ink-400">
        {isRegister ? 'Already have an account? ' : 'New to Doctor Fresh? '}
        <Link href={isRegister ? '/login' : '/registration'} className="font-medium text-primary-700 hover:text-primary-800">
          {isRegister ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </div>
  );
}
