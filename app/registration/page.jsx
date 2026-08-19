import AuthForm from '@/components/forms/AuthForm';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: 'Create an account',
  description: 'Create a Doctor Fresh account to track orders and service requests.',
  path: '/registration',
  robots: { index: false, follow: true },
});

export default function RegistrationPage() {
  return (
    <div className="df-container py-12 md:py-16">
      <AuthForm mode="register" />
    </div>
  );
}
