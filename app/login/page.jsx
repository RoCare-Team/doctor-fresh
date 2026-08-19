import AuthForm from '@/components/forms/AuthForm';
import { metaFor } from '@/lib/utils';

export const metadata = metaFor({
  title: 'Sign in',
  description: 'Sign in to your Doctor Fresh account.',
  path: '/login',
  robots: { index: false, follow: true },
});

export default function LoginPage() {
  return (
    <div className="df-container py-12 md:py-16">
      <AuthForm mode="login" />
    </div>
  );
}
