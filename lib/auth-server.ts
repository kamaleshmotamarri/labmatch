import { auth, currentUser } from '@clerk/nextjs/server';

export async function requireUser(): Promise<
  | { userId: string; email: string | null; response: null }
  | { userId: null; email: null; response: Response }
> {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return {
      userId: null,
      email: null,
      response: Response.json({ error: 'Sign in to continue.' }, { status: 401 }),
    };
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase()
    || user?.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase()
    || null;

  return { userId, email, response: null };
}
