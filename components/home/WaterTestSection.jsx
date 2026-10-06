'use client';

import {
  User, Mail, Phone, ArrowRight, CalendarCheck2, PhoneCall, TestTubeDiagonal, Lock,
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
 * The free water test: how it works on the left, the booking form on the
 * right. Three steps say what happens after the form is sent, so asking for a
 * phone number reads as the start of a visit rather than a sales call.
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
      note: `${params.length} parameters checked, and the right purifier suggested for your water.`,
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
      {/* inset like the rows above it */}
      <div>
        <div className="grid overflow-hidden rounded-[28px] border border-[#e4eef3] bg-linear-to-br from-[#eef6fa] via-[#f6fafc] to-white lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* ------------------------------------------------- how it works */}
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-[26px] font-semibold tracking-tight text-ink-900 md:text-[32px]">
                Free Water <span className="text-primary-600">Test</span>
              </h2>
              <span className="border-l border-line-strong pl-3 text-[14px] font-medium text-ink-400">
                At your doorstep
              </span>
            </div>
            <p className="mt-1 max-w-lg text-[14.5px] text-ink-400">
              Know what&rsquo;s in your water before you buy a purifier — tested at home by a Doctor Fresh analyst.
            </p>

            {/* the three steps, joined by a dashed line */}
            <ol className="mt-7 space-y-6">
              {steps.map((s, i) => (
                <li key={s.title} className="group relative flex gap-4">
                  {i < steps.length - 1 ? (
                    <span aria-hidden="true" className="absolute left-6 top-14 h-[calc(100%-2rem)] border-l-2 border-dashed border-primary-200" />
                  ) : null}
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary-500 to-primary-700 text-white shadow-[0_12px_24px_-12px_rgb(11_97_130/0.7)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]">
                    <s.icon size={21} strokeWidth={1.9} aria-hidden="true" />
                    {/* the step number, pinned to the icon's corner */}
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-primary-700 shadow-sm ring-1 ring-primary-100">
                      {i + 1}
                    </span>
                  </span>
                  <span className="pt-1">
                    <span className="block text-[16px] font-semibold leading-snug text-ink-900">{s.title}</span>
                    <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink-400">{s.note}</span>
                  </span>
                </li>
              ))}
            </ol>

            {/* what the visit costs and who comes */}
            <ul className="mt-7 hidden flex-wrap gap-2.5 sm:flex">
              {promises.map((p) => (
                <li
                  key={p.label}
                  className="inline-flex items-center gap-2 rounded-full border border-[#e2eaee] bg-white py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-ink-700 shadow-[0_6px_14px_-12px_rgb(6_59_76/0.5)]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f7ee] text-[#15803d]">
                    <p.icon size={14} aria-hidden="true" />
                  </span>
                  {p.label}
                </li>
              ))}
            </ul>
          </div>

          {/* ---------------------------------------------------------- form */}
          <div className="border-t border-[#e4eef3] bg-white/70 p-6 sm:p-8 lg:flex lg:items-center lg:border-l lg:border-t-0 lg:p-10">
            <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[#e6ecf0] bg-white p-5 shadow-[0_24px_48px_-32px_rgb(6_59_76/0.45)] sm:p-6">
              {/* a thin brand stripe along the top */}
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary-500 via-primary-400 to-accent-400" />
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-100">
                  <TestTubeDiagonal size={20} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[18px] font-semibold leading-tight tracking-[-0.01em] text-ink-900">{waterTest.formTitle}</h3>
                  <p className="mt-0.5 text-[13px] text-ink-400">Our analyst will call you to fix a slot.</p>
                </div>
              </div>

              <form onSubmit={send} className="mt-5 grid gap-3">
                <input type="hidden" name="enquiry_type" value={waterTest.enquiryType} />

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
                          className="h-11 w-full rounded-xl border border-[#e2e8ec] bg-[#f7f9fb] pl-10 pr-3.5 text-[14.5px] text-ink-900 outline-none transition-all placeholder:text-ink-300 focus:border-primary-500 focus:bg-white focus:shadow-[0_0_0_4px_var(--color-primary-100)]"
                        />
                      </div>
                    </div>
                  );
                })}

                <button
                  type="submit"
                  disabled={sending}
                  className="group mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary-600 to-primary-700 px-5 text-[15px] font-semibold text-white shadow-[0_14px_28px_-14px_rgb(11_97_130/0.8)] transition-all hover:brightness-110 disabled:opacity-60"
                >
                  {sending ? 'Booking…' : 'Book Free Water Test'}
                  {sending ? null : (
                    <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>

                <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-400">
                  <Lock size={12} aria-hidden="true" />
                  The water test is completely free.
                </p>

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
        </div>
      </div>
    </section>
  );
}
