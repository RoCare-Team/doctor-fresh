'use client';

import Image from 'next/image';
import {
  User, Mail, Phone, ArrowRight, BadgeIndianRupee, House, UserRoundCheck,
} from 'lucide-react';
import { useFormSubmit } from '@/lib/forms';
import { FormNote } from '@/components/forms/Field';

// An icon inside each input, picked from what the field asks for.
function fieldIcon(f) {
  if (f.type === 'email') return Mail;
  if (f.type === 'tel' || /phone|mobile|number/i.test(`${f.name} ${f.placeholder}`)) return Phone;
  return User;
}

/**
 * The free water test as one wide, quiet banner: the offer and the booking
 * form on the left, our analyst on a visit on the right.
 *
 * It reads as a strip across the page rather than a section of its own, so
 * the heading does the selling and everything else — the steps, what the test
 * checks — is one small line each instead of a card.
 */
export default function WaterTestSection({ waterTest }) {
  const { status, error, send, sending } = useFormSubmit('/api/forms/lead');
  const params = waterTest.parameters.map((p) => p.label);

  // the whole visit in one line, in order
  const steps = ['Book in seconds', 'Our analyst calls', 'Tested at your home'];

  // what the visit costs and who comes — all said elsewhere on the site
  const promises = [
    { icon: BadgeIndianRupee, label: 'Free of cost' },
    { icon: House, label: 'Done at your home' },
    { icon: UserRoundCheck, label: 'Trained analyst' },
  ];

  return (
    <section id="water-test" className="df-container scroll-mt-[156px] py-3 md:py-4">
      <div className="relative grid overflow-hidden rounded-3xl border border-line bg-white lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        {/* Water running behind the whole banner, turned almost all the way
            down: it should be felt rather than read, so the words stay the
            first thing anyone sees. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <Image
            src="/images/banner13.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-right opacity-[0.16]"
          />
          <span className="absolute inset-0 bg-linear-to-r from-white via-white/85 to-white/40" />
        </div>

        {/* ------------------------------------------------- the offer */}
        <div className="relative order-2 flex flex-col justify-center p-5 sm:p-7 lg:order-1 lg:p-9">
          <p className="df-eyebrow">At your doorstep</p>
          <h2 className="mt-2 text-[27px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-900 sm:text-[32px]">
            Free Water <span className="text-primary-600">Test</span>
            <span className="block text-ink-400">at your home</span>
          </h2>

          {/* what the test checks, as a plain line rather than a row of chips */}
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-400">
            {params.join(' · ')}
            <span className="text-ink-300"> — {params.length} parameters, checked on the spot.</span>
          </p>

          {/* the visit in three words, joined by arrows */}
          <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-medium text-ink-500">
            {steps.map((s, i) => (
              <li key={s} className="inline-flex items-center gap-2">
                {i > 0 ? <span aria-hidden="true" className="text-ink-300">→</span> : null}
                {s}
              </li>
            ))}
          </ol>

          {/* ---------------------------------------------------------- form */}
          <form onSubmit={send} className="mt-5 grid gap-2.5" aria-label={waterTest.formTitle}>
            <input type="hidden" name="enquiry_type" value={waterTest.enquiryType} />

            <div className="grid gap-2.5 sm:grid-cols-2 sm:[&>*:nth-child(3n)]:col-span-2">
              {waterTest.fields.map((f) => {
                const Icon = fieldIcon(f);
                return (
                  <div key={f.name}>
                    {/* placeholder carries the label; the visible name is kept for screen readers */}
                    <label htmlFor={`wt-${f.name}`} className="sr-only">
                      {f.placeholder}
                    </label>
                    <div className="group relative">
                      <Icon
                        size={15}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 transition-colors group-focus-within:text-primary-600"
                      />
                      <input
                        id={`wt-${f.name}`}
                        type={f.type}
                        name={f.name}
                        required={f.required}
                        placeholder={f.required ? `${f.placeholder} *` : f.placeholder}
                        className="h-11 w-full rounded-full border border-line bg-white pl-9.5 pr-4 text-[13.5px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-0.5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
              <button
                type="submit"
                disabled={sending}
                className="group inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-6 text-[14px] font-semibold text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-60 sm:w-auto"
              >
                {sending ? 'Booking…' : waterTest.formTitle || 'Book Free Water Test'}
                {sending ? null : (
                  <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-medium text-ink-500">
                {promises.map((p) => (
                  <li key={p.label} className="inline-flex items-center gap-1.5">
                    <p.icon size={13} className="text-success" aria-hidden="true" />
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>

            {status !== 'idle' ? (
              <FormNote
                status={status}
                error={error}
                doneMessage="Thank you — our water analyst will call you to schedule the free test."
              />
            ) : null}
          </form>
        </div>

        {/* ------------------------------------------------------ the photo */}
        {/* What the test is for: water you would drink without thinking about
            it. Nothing is laid over it but the one badge, so the picture
            stays a picture. */}
        <div className="relative order-1 aspect-[16/10] overflow-hidden bg-[#eef4f7] sm:aspect-[21/9] lg:order-2 lg:aspect-auto lg:min-h-[320px]">
          <Image
            src="/images/banner18.png"
            alt="A woman drinking a glass of clean water at home"
            fill
            sizes="(min-width: 1300px) 540px, (min-width: 1024px) 45vw, 100vw"
            className="object-cover object-[60%_center]"
          />
          {/* the photo meets the white panel with a soft edge, not a hard line */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 hidden w-24 bg-linear-to-r from-white to-transparent lg:block"
          />
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-ink-900 backdrop-blur-sm">
            <BadgeIndianRupee size={13} className="text-success" aria-hidden="true" />
            100% free home visit
          </span>
        </div>
      </div>
    </section>
  );
}
