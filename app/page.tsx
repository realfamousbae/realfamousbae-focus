import { getChatGPTUser } from './chatgpt-auth';
import FocusApp from './focus-app';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  // One request-time snapshot is serialized for the first client render.
  // eslint-disable-next-line react-hooks/purity -- This dynamic server component samples the clock once per request.
  const initialNow = Date.now();
  return (
    <FocusApp
      initialNow={initialNow}
      user={user ? { displayName: user.displayName, email: user.email } : null}
    />
  );
}
