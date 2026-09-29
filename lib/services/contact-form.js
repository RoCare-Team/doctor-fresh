// The contact form, forwarded to the service system.
//
//   website_contact_form.php
//     → { name, mobile, email, subject, message, source }
//
// The message is saved in this site's own `contact_message` table first — that
// is what the admin inbox reads, and it must not depend on anyone else's
// server. This is the second copy, for the team that works out of the service
// system's panel, and it is sent after the visitor has been answered: a slow
// or broken forward must never cost us the message itself.

const URL_ = process.env.CONTACT_FORM_URL
  || 'https://inet.waterpurifierservicecenter.in/website_contact_form.php';

// Which site the message came from, as it reads in their panel.
const SOURCE = process.env.CONTACT_FORM_SOURCE || 'doctorfresh.in';

const DEBUG = process.env.OTP_DEBUG === '1' || process.env.NODE_ENV !== 'production';

/** Forwards one message. Never throws: the caller has already replied. */
export async function forwardContactMessage({
  name, mobile, email, subject, message,
}) {
  const payload = {
    name: String(name || '').slice(0, 120),
    mobile: String(mobile || '').replace(/\D/g, '').slice(-10),
    email: String(email || '').slice(0, 160),
    subject: String(subject || '').slice(0, 200),
    message: String(message || '').slice(0, 2000),
    source: SOURCE,
  };

  if (DEBUG) console.info('[contact-form] → payload', JSON.stringify(payload));

  let text;
  let status;
  try {
    const res = await fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    status = res.status;
    text = await res.text();
  } catch (err) {
    console.error('[contact-form] could not reach the service:', err.message);
    return { ok: false };
  }

  if (DEBUG) console.info(`[contact-form] ← ${status}`, String(text).slice(0, 300));

  try {
    // Their script prints a blank line and the customer's name before the
    // JSON, so the answer is cut out of the reply rather than parsed whole.
    // Without this a refusal comes back unreadable and is taken for a success,
    // because the status is 200 either way.
    const body = String(text);
    const data = JSON.parse(body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1));
    // It answers a refusal as `{ success: false, errors: {…} }` and other
    // endpoints on that host answer `{ error: true }`; both are failures.
    if (data?.error || data?.success === false) {
      console.error(
        '[contact-form] refused:',
        data.message || data.msg || '',
        data.errors ? JSON.stringify(data.errors) : '',
      );
      return { ok: false };
    }
    return { ok: true };
  } catch {
    // A 200 with something that is not JSON: taken as delivered rather than
    // retried, since a duplicate enquiry is worse than an unclear log line.
    return { ok: status >= 200 && status < 300 };
  }
}
