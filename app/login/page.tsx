import { redirect } from 'next/navigation';
import { getSessionUser } from '../auth';
import LoginForm from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getSessionUser()) redirect('/');
  return <LoginForm allowRegistration={process.env.ALLOW_REGISTRATION !== 'false'} />;
}
