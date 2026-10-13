import { redirect } from 'next/navigation';
import { getSessionUser } from '../auth';
import AccountForm from './account-form';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return <AccountForm username={user.username} />;
}
