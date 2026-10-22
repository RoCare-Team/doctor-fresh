import { AppPage, AppHero, AppCard, AppButton, Icons } from '@/components/legal/AppPage';
import { metaFor } from '@/lib/utils';

/**
 * The privacy policy for the website and the Doctor Fresh mobile app — the
 * URL entered in Google Play Console. Its own route (not a `general_settings`
 * row like the other policies), so the wording stays exactly as approved; it
 * is laid out like the app, since the app opens it on the phone.
 */
export const revalidate = false;

export const metadata = metaFor({
  title: 'Privacy Policy',
  description: 'How Doctor Fresh collects, uses, shares and protects your personal data on doctorfresh.in and the Doctor Fresh mobile app.',
  path: '/legal/app-privacy-policy',
});

const COLLECTED = [
  ['Mobile number', 'When you sign in or register (we verify it with a one-time password, OTP), book a service, request a callback or quotation'],
  ['Name and email address', 'When you create or edit your profile, place an order, book a service or send us a form'],
  ['Delivery / service addresses, city and PIN code', 'When you save an address, check delivery to a PIN code, place an order or book a service'],
  ['Order and booking details', 'Products bought, services booked, time slots, order status, invoices, cancellations'],
  ['Messages and content', 'Contact, callback, quotation, dealer/partner and enquiry forms; product reviews and blog comments you post'],
  ['Job applications', 'Your details and the resume/CV file you choose to upload on our Careers page'],
];

export default function AppPrivacyPolicyPage() {
  return (
    <AppPage>
      <AppHero
        label="Doctor Fresh · Privacy"
        title="Privacy"
        accent="Policy"
        meta={
          <>
            Effective date: 22 October 2026 · Applies to the website <a className="text-primary-700 underline" href="https://www.doctorfresh.in">www.doctorfresh.in</a> and
            the <strong>Doctor Fresh</strong> mobile app (Android package <code>com.doctorfresh.app</code>)
          </>
        }
        intro={
          <>
            <p>
              Doctor Fresh (&quot;Doctor Fresh&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) sells water purifiers, water ionizers,
              softeners, spare parts and related installation, repair and maintenance (AMC) services. This policy explains what personal data we
              collect when you use our website or mobile app (together, the &quot;Services&quot;), why we collect it, who we share it with, how
              long we keep it, and the choices and rights you have.
            </p>
            <p>
              We process personal data in line with the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000 and the
              rules made under them. By using the Services you agree to this policy.
            </p>
          </>
        }
        chips={['We never sell your data', 'OTP-verified sign-in', 'Delete anytime']}
      />

      <AppCard icon={Icons.user} title="1. Data we collect">
        <h3>a) Data you give us</h3>
        <ul className="!list-none !pl-0 divide-y divide-line rounded-xl border border-line">
          {COLLECTED.map(([what, when]) => (
            <li key={what} className="!mt-0 px-3 py-2.5">
              <strong className="block">{what}</strong>
              <span className="text-[13.5px]">{when}</span>
            </li>
          ))}
        </ul>

        <h3>b) Data collected automatically</h3>
        <ul>
          <li>
            <strong>Location (only with your permission).</strong> If you tap &quot;Use my location&quot;, the app asks for your device&apos;s
            location permission. We send your approximate coordinates to our server once to look up your PIN code, area, city and state, so we can
            show delivery availability and service options near you. We save only the resulting PIN code / area on your device; we do{' '}
            <strong>not</strong> track your location in the background. You can refuse or withdraw this permission at any time in your phone
            settings and enter your PIN code manually instead.
          </li>
          <li>
            <strong>Session and app data.</strong> A sign-in session token, your cart, wishlist and recently viewed products, so the Services work
            and remember you. Some of this is stored on your device and some on our servers when you are signed in.
          </li>
          <li>
            <strong>Technical data.</strong> Our servers record standard request logs (such as IP address, device/browser type, date and time and
            pages or screens requested) for security, troubleshooting and fraud prevention.
          </li>
          <li>
            <strong>Cookies (website).</strong> Our website uses cookies that are necessary for sign-in, cart and checkout. You can block cookies in
            your browser, but parts of the site may then not work.
          </li>
        </ul>

        <h3>c) Payment data</h3>
        <p>
          Online payments are processed directly by our payment partners (such as Easebuzz, Paytm, PayU, CCAvenue, Stripe or PayPal). Your card,
          UPI or bank details are entered on, and handled by, the payment partner under their own security standards and privacy policies.{' '}
          <strong>We do not store your full card numbers, CVV, UPI PIN or net-banking passwords.</strong> We receive only the payment status, amount
          and transaction reference.
        </p>

        <h3>d) What the app does not collect</h3>
        <p>
          The Doctor Fresh app does not access your contacts, photos, camera, microphone, SMS messages or call logs. It does not contain third-party
          advertising or analytics SDKs. Files are read only when you choose one yourself (for example, a resume on the Careers page).
        </p>
      </AppCard>

      <AppCard icon={Icons.list} title="2. How we use your data">
        <ul>
          <li>To create and secure your account and verify your mobile number by OTP.</li>
          <li>To process orders, payments, deliveries, installations, service bookings, AMC plans, returns, cancellations and invoices.</li>
          <li>To check delivery and service availability for your location / PIN code.</li>
          <li>To contact you by call, SMS, WhatsApp or email about your orders, bookings, enquiries and service reminders.</li>
          <li>To answer your questions, quotation requests and complaints, and to process job and partner applications.</li>
          <li>To send offers and product updates <strong>only where you have agreed</strong>; you can opt out at any time (see section 6).</li>
          <li>To keep the Services secure, prevent fraud and misuse, and fix problems.</li>
          <li>To meet legal, tax and accounting obligations.</li>
        </ul>
      </AppCard>

      <AppCard icon={Icons.share} title="3. Who we share your data with">
        <p>We <strong>do not sell, rent or trade</strong> your personal data. We share it only as needed to provide the Services:</p>
        <ul>
          <li><strong>Service technicians and authorised service partners</strong> — your name, phone number and service address, so they can visit and complete the job.</li>
          <li><strong>Delivery and logistics partners</strong> — your name, phone number and delivery address.</li>
          <li><strong>Payment partners</strong> — to process your payments and refunds.</li>
          <li><strong>SMS / OTP, WhatsApp and email providers</strong> — to send OTPs, order and booking messages.</li>
          <li><strong>Hosting and IT service providers</strong> — who store and run our systems on our behalf.</li>
          <li><strong>Government or law enforcement</strong> — when required by law, court order or to protect rights, property or safety.</li>
          <li><strong>A buyer or successor</strong> — if our business is merged, sold or restructured, subject to this policy.</li>
        </ul>
        <p>These partners may use your data only to perform their work for us. We may share anonymous, aggregated statistics that do not identify you.</p>
      </AppCard>

      <AppCard icon={Icons.clock} title="4. How long we keep your data">
        <ul>
          <li><strong>Account and profile data</strong> — while your account is active. If you delete your account, we delete or anonymise it within 30 days.</li>
          <li><strong>Orders, invoices and payment records</strong> — for as long as Indian tax, GST and accounting laws require (generally up to 8 years), even after account deletion.</li>
          <li><strong>Enquiry, callback and quotation forms</strong> — up to 2 years from your last interaction.</li>
          <li><strong>Job applications</strong> — up to 1 year, unless you ask us to delete them sooner.</li>
          <li><strong>Server logs</strong> — up to 180 days, unless needed longer to investigate a security issue.</li>
        </ul>
      </AppCard>

      <AppCard icon={Icons.trash} title="5. Deleting your account and data" id="delete">
        <p>You can ask us to delete your Doctor Fresh account and the personal data linked to it at any time:</p>
        <ul>
          <li>Visit <a href="/legal/delete-account">www.doctorfresh.in/legal/delete-account</a> and follow the steps; or</li>
          <li>
            Email <a href="mailto:info@doctorfresh.in?subject=Delete%20my%20Doctor%20Fresh%20account">info@doctorfresh.in</a> from any address with
            the subject &quot;Delete my Doctor Fresh account&quot; and your registered mobile number.
          </li>
        </ul>
        <p>
          We will verify the request (for example, with an OTP to your registered number) and complete it within 30 days. Records we must keep by
          law (see section 4) are retained only for that purpose and then deleted.
        </p>
        <div className="mt-4">
          <AppButton href="/legal/delete-account" outline>
            How to delete your account
          </AppButton>
        </div>
      </AppCard>

      <AppCard icon={Icons.check} title="6. Your rights and choices">
        <ul>
          <li><strong>Access and correction</strong> — view and edit your profile and addresses in the app (Account → Edit profile &amp; address) or ask us for a summary of your data.</li>
          <li><strong>Erasure</strong> — delete your account and data as described in section 5.</li>
          <li><strong>Withdraw consent</strong> — turn off location permission in your phone settings, or opt out of marketing messages by replying STOP, using the unsubscribe link, or writing to us.</li>
          <li><strong>Grievance redressal</strong> — raise a complaint with our Grievance Officer (section 9). If you are not satisfied with our response you may approach the Data Protection Board of India.</li>
          <li><strong>Nominate</strong> — nominate another person to exercise your rights in case of death or incapacity, by writing to us.</li>
        </ul>
      </AppCard>

      <AppCard icon={Icons.lock} title="7. Security">
        <p>
          We use HTTPS encryption for all data sent between the app/website and our servers, OTP-based sign-in, access controls and restricted staff
          access to protect your data. No system is completely secure, but we work to protect your data and will notify you and the authorities of a
          personal-data breach as required by law.
        </p>
      </AppCard>

      <AppCard icon={Icons.child} title="8. Children">
        <p>
          Our Services are meant for adults. We do not knowingly collect personal data from anyone under 18 years of age. If you believe a child has
          given us personal data, contact us and we will delete it.
        </p>
      </AppCard>

      <AppCard icon={Icons.phone} title="9. Contact us and Grievance Officer">
        <p>
          <strong>Grievance Officer:</strong> {process.env.GRIEVANCE_OFFICER_NAME || '[Name of Grievance Officer]'}
          <br />
          Email: <a href="mailto:info@doctorfresh.in">info@doctorfresh.in</a>
          <br />
          Phone: <a href="tel:+919311587716">+91-9311587716</a> (Monday to Saturday, 10:00 AM – 6:00 PM)
          <br />
          Address: Doctor Fresh, Unit No. 831, 8th Floor, JMD Megapolis, Sohna Road, Sector 48, Gurugram, Haryana 122018, India
        </p>
        <p>We will acknowledge your complaint within 48 hours and resolve it within 30 days.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <AppButton href="mailto:info@doctorfresh.in">Email us</AppButton>
          <AppButton href="tel:+919311587716" outline>
            Call us
          </AppButton>
        </div>
      </AppCard>

      <AppCard icon={Icons.edit} title="10. Changes to this policy">
        <p>
          We may update this policy from time to time. We will change the &quot;Effective date&quot; above and, for significant changes, notify you
          in the app or by email/SMS. Please review this page periodically.
        </p>
      </AppCard>
    </AppPage>
  );
}
