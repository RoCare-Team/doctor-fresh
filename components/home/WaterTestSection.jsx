'use client';

import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { useFormSubmit } from '@/lib/forms';
import { imageUrl } from '@/lib/utils';
import { FormNote } from '@/components/forms/Field';
import WaterBackdrop from '@/components/common/WaterBackdrop';

const POINTS = [
  'No charges, no obligation',
  'On-the-spot TDS report',
  'Matched to your water source',
];

export default function WaterTestSection({ waterTest }) {
  const { status, error, send, sending } = useFormSubmit('/request/form/submit.php');

  return (
    <section id="water-test" className="relative scroll-mt-[156px] overflow-hidden bg-ink-900">
      <WaterBackdrop variant="section" />

      <div className="df-container relative py-10 md:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          {/* ------------------------------------------------------- left */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-300">Check your water quality</p>
            <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight text-white md:text-[29px]">
              {waterTest.title}
            </h2>
            <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-white/65">
              Our analyst tests every key parameter at your doorstep and recommends the right
              purification — completely free.
            </p>

            <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {waterTest.parameters.map((p) => (
                <li key={p.label} className="flex items-center gap-2.5 rounded-[14px] bg-white px-3 py-2.5 shadow-[0_2px_8px_-4px_rgb(0_0_0_/_0.3)]">
                  <Image
                    src={imageUrl(p.icon)}
                    alt=""
                    width={26}
                    height={26}
                    className="h-6 w-6 shrink-0 object-contain"
                  />
                  <span className="text-[13.5px] font-medium leading-tight text-ink-900">
                    {p.label}
                  </span>
                </li>
              ))}
            </ul>

            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {POINTS.map((point) => (
                <li key={point} className="flex items-center gap-1.5 text-[13.5px] text-white/70">
                  <CheckCircle2 size={15} className="shrink-0 text-primary-300" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* ------------------------------------------------------ right */}
          <div className="rounded-[14px] bg-white p-5 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.55)] md:p-6">
            <h3 className="text-[18px] font-semibold text-ink-900">{waterTest.formTitle}</h3>
            <p className="mt-1 text-[14px] text-ink-400">
              Our analyst will call you to fix a slot.
            </p>

            {/* three fields + submit fill a clean 2 × 2 grid */}
            <form onSubmit={send} className="mt-5 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="enquiry_type" value={waterTest.enquiryType} />

              {waterTest.fields.map((f) => (
                <div key={f.name}>
                  <label
                    htmlFor={`wt-${f.name}`}
                    className="mb-1.5 block text-[13.5px] font-medium text-ink-700"
                  >
                    {f.placeholder}
                    {f.required ? <span className="ml-0.5 text-danger">*</span> : null}
                  </label>
                  <input
                    id={`wt-${f.name}`}
                    type={f.type}
                    name={f.name}
                    required={f.required}
                    placeholder={f.placeholder}
                    className="h-11 w-full rounded-lg border border-line-strong bg-white px-3.5 text-[15px] text-ink-900 outline-none transition-all placeholder:text-ink-300 focus:border-primary-500 focus:shadow-[0_0_0_3px_var(--color-primary-100)]"
                  />
                </div>
              ))}

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={sending}
                  className="h-11 w-full rounded-lg bg-primary-500 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-ink-900 disabled:opacity-60"
                >
                  {sending ? 'Booking…' : 'Book Free Water Test'}
                </button>
              </div>

              {status !== 'idle' ? (
                <div className="sm:col-span-2">
                  <FormNote
                    status={status}
                    error={error}
                    doneMessage="Thank you — our water analyst will call you to schedule the free test."
                  />
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
