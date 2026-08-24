import { getChatGPTUser } from './chatgpt-auth';
import FocusApp from './focus-app';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <FocusApp
      user={user ? { displayName: user.displayName, email: user.email } : null}
    />
  );
}
