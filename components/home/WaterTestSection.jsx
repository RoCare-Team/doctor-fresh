'use client';

import Image from 'next/image';
import {
  User, Mail, Phone, ArrowRight, CalendarCheck2, PhoneCall, TestTubeDiagonal,
  BadgeIndianRupee, House, UserRoundCheck,
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
 * The free water test as a banner: a photo of our analyst on a visit on the
 * left, and on the right the three steps and the booking form. The steps say
 * what happens after the form is sent, so asking for a phone number reads as
 * the start of a visit rather than a sales call.
 */
export default function WaterTestSection({ waterTest }) {
  const { status, error, send, sending } = useFormSubmit('/api/forms/lead');
  const params = waterTest.parameters.map((p) => p.label);

  const steps = [
    { icon: CalendarCheck2, title: 'Book your free test', note: 'Leave your name and number — it takes a few seconds.' },
    { icon: PhoneCall, title: 'Our analyst calls you', note: 'To fix a time that suits you.' },
    {
      icon: TestTubeDiagonal,
      title: 'Water tested at home',
      note: 'And the right purifier suggested for your water.',
    },
  ];

  // what the visit costs and who comes — all said elsewhere on the site
  const promises = [
    { icon: BadgeIndianRupee, label: 'Free of cost' },
    { icon: House, label: 'Done at your home' },
    { icon: UserRoundCheck, label: 'Trained analyst' },
  ];

  return (
    <section id="water-test" className="df-container scroll-mt-[156px] py-3 md:py-4">
      <div className="grid overflow-hidden rounded-[28px] border border-line bg-white lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* ------------------------------------------------------ banner */}
        {/* A real visit: our analyst at a customer's purifier, with what the
            test checks laid over the photo. */}
        <div className="relative aspect-[16/11] overflow-hidden bg-[#eef4f7] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[460px]">
          <Image
            src="/images/banner17.png"
            alt="A Doctor Fresh analyst checking a water purifier at a customer's home"
            fill
            sizes="(min-width: 1300px) 600px, (min-width: 1024px) 46vw, 100vw"
            className="object-cover object-[30%_center]"
          />
          <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink-900/70 via-transparent to-transparent" />

          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-900 sm:left-5 sm:top-5">
            <BadgeIndianRupee size={14} className="text-success" aria-hidden="true" />
            100% free home visit
          </span>

          <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/25 bg-white/15 p-3.5 text-white backdrop-blur-md sm:inset-x-5 sm:bottom-5 sm:p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <TestTubeDiagonal size={15} aria-hidden="true" />
              {params.length} parameters tested on the spot
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {params.map((label) => (
                <li key={label} className="rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-ink-900">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* --------------------------------------------- copy, steps, form */}
        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
          <p className="df-eyebrow">At your doorstep</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
            Free Water <span className="text-primary-600">Test</span>
          </h2>
          <p className="mt-1.5 max-w-lg text-[14.5px] text-ink-400">
            Know what&rsquo;s in your water before you buy a purifier — tested at home by a Doctor Fresh analyst.
          </p>

          {/* the three steps, side by side */}
          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-2xl border border-line p-3.5 sm:flex-col sm:gap-2.5">
                <span className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                    <s.icon size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="hidden text-[12px] font-semibold text-ink-300 sm:inline">Step {i + 1}</span>
                </span>
                <span>
                  <span className="block text-[14.5px] font-semibold leading-snug text-ink-900">{s.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-400">{s.note}</span>
                </span>
              </li>
            ))}
          </ol>

          {/* ---------------------------------------------------------- form */}
          <form onSubmit={send} className="mt-6 grid gap-3" aria-label={waterTest.formTitle}>
            <input type="hidden" name="enquiry_type" value={waterTest.enquiryType} />

            {/* name and email side by side; the phone, with the longest
                placeholder, gets the full row */}
            <div className="grid gap-3 sm:grid-cols-2 sm:[&>*:nth-child(3n)]:col-span-2">
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
                        size={16}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 transition-colors group-focus-within:text-primary-600"
                      />
                      <input
                        id={`wt-${f.name}`}
                        type={f.type}
                        name={f.name}
                        required={f.required}
                        placeholder={f.required ? `${f.placeholder} *` : f.placeholder}
                        className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-primary-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
              <button
                type="submit"
                disabled={sending}
                className="group inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
              >
                {sending ? 'Booking…' : waterTest.formTitle || 'Book Free Water Test'}
                {sending ? null : (
                  <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12.5px] font-medium text-ink-500">
                {promises.map((p) => (
                  <li key={p.label} className="inline-flex items-center gap-1.5">
                    <p.icon size={14} className="text-success" aria-hidden="true" />
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
      </div>
    </section>
  );
}
