import { AppPage, AppHero, AppCard, AppButton, Icons } from '@/components/legal/AppPage';
import DeleteAccountForm from '@/components/legal/DeleteAccountForm';
import { metaFor } from '@/lib/utils';

/**
 * How to delete a Doctor Fresh account — the "account deletion URL" entered
 * in Google Play Console. Works without the app: the number, the OTP sent to
 * it, then Delete (POST /api/account/delete); or a request by email or phone. Laid out
 * like the app, since the app opens it on the phone.
 */
export const revalidate = false;

export const metadata = metaFor({
  title: 'Delete Your Account',
  description: 'How to request deletion of your Doctor Fresh account and personal data.',
  path: '/legal/delete-account',
});

const MAIL = 'mailto:info@doctorfresh.in?subject=Delete%20my%20Doctor%20Fresh%20account&body=Registered%20mobile%20number%3A%20%0AName%3A%20';

const STEPS = [
  <>
    Send an email to <a href={MAIL}>info@doctorfresh.in</a> with the subject <strong>&quot;Delete my Doctor Fresh account&quot;</strong>, or send
    the same message on WhatsApp / call us at <a href="tel:+919311587716">+91-9311587716</a>.
  </>,
  <>
    Include the <strong>mobile number registered</strong> with your account and your name.
  </>,
  <>We will verify that the account is yours, usually with a one-time password (OTP) sent to that number.</>,
  <>
    We will confirm once your account has been deleted. This is completed within <strong>30 days</strong> of verification.
  </>,
];

export default function DeleteAccountPage() {
  return (
    <AppPage>
      <AppHero
        label="Doctor Fresh · Account"
        title="Delete your Doctor Fresh"
        accent="account"
        meta={
          <>
            For the Doctor Fresh mobile app (<code>com.doctorfresh.app</code>) and{' '}
            <a className="text-primary-700 underline" href="https://www.doctorfresh.in">www.doctorfresh.in</a>
          </>
        }
        intro={
          <p>
            You can ask us to delete your Doctor Fresh account and the personal data linked to it at any time. You do not need to have the app
            installed.
          </p>
        }
        chips={['No app needed', 'Verified by OTP', 'Done within 30 days']}
      />

      <AppCard icon={Icons.trash} title="Delete your account now">
        <p>Enter the mobile number registered with your account, verify it with the OTP we send, then delete.</p>
        <div className="mt-4">
          <DeleteAccountForm />
        </div>
      </AppCard>

      <AppCard icon={Icons.list} title="Or request deletion by email or phone">
        <ol className="!list-none !pl-0 !space-y-3">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-700 text-[13px] font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 space-y-2">
          <AppButton href={MAIL}>Email a deletion request</AppButton>
          <AppButton href="tel:+919311587716" outline>
            Call +91-9311587716
          </AppButton>
        </div>
      </AppCard>

      <AppCard icon={Icons.trash} title="What we delete">
        <ul>
          <li>Your account and profile: name, mobile number, email address</li>
          <li>Saved delivery and service addresses</li>
          <li>Wishlist, cart and recently viewed products</li>
          <li>Your sign-in sessions on all devices</li>
          <li>Enquiry, callback and quotation requests linked to your account</li>
        </ul>
      </AppCard>

      <AppCard icon={Icons.archive} title="What we keep, and for how long">
        <ul>
          <li>
            <strong>Orders, invoices and payment records</strong> are kept for as long as Indian tax, GST and accounting laws require (generally up
            to 8 years). They are used only for legal and accounting purposes and then deleted.
          </li>
          <li>
            <strong>Product reviews and blog comments</strong> you published may stay on the site with your name removed (shown as anonymous).
          </li>
          <li>
            Active <strong>service bookings, warranty or AMC</strong> obligations will be closed first. Deleting your account ends any service we can
            provide under it.
          </li>
        </ul>
      </AppCard>

      <AppCard icon={Icons.edit} title="Only want some data deleted?">
        <p>
          You can edit or remove your saved addresses and profile details in the app under <strong>Account → Edit profile &amp; address</strong>, or
          email us to delete specific data (for example, a job application) without closing your account.
        </p>
      </AppCard>

      <AppCard icon={Icons.shield}>
        <p>
          Read our full <a href="/legal/app-privacy-policy">Privacy Policy</a>.
        </p>
      </AppCard>
    </AppPage>
  );
}
