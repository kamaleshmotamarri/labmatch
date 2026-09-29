import { neon } from '@neondatabase/serverless';

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

let profileEmailReady: Promise<void> | null = null;

/** Ensures profiles.email exists (idempotent). */
export function ensureProfileEmailColumn() {
  if (!profileEmailReady) {
    profileEmailReady = (async () => {
      const sql = getSql();
      await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text`;
    })().catch((error) => {
      profileEmailReady = null;
      throw error;
    });
  }
  return profileEmailReady;
}
