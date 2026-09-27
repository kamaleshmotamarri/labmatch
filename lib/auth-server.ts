import { auth } from '@clerk/nextjs/server';

export async function requireUser(): Promise<
  | { userId: string; response: null }
  | { userId: null; response: Response }
> {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return {
      userId: null,
      response: Response.json({ error: 'Sign in to continue.' }, { status: 401 }),
    };
  }
  return { userId, response: null };
}
