import { requireUser } from '@/lib/auth-server';
import { emptyProfile, isProfileEmpty, parseProfile, type StudentProfile } from '@/lib/data';
import { ensureProfileEmailColumn, getSql } from '@/lib/db';

type ProfileRow = {
  user_id?: string;
  name: string;
  major: string;
  year: string;
  interests: string[] | null;
  coursework: string;
  skills: string;
  goals: string;
  email?: string | null;
};

function toProfile(row: ProfileRow | undefined): StudentProfile {
  if (!row) return emptyProfile;
  return parseProfile({
    name: row.name,
    major: row.major,
    year: row.year,
    interests: row.interests ?? [],
    coursework: row.coursework,
    skills: row.skills,
    goals: row.goals,
  });
}

async function reassignUserData(oldUserId: string, newUserId: string, email: string) {
  const sql = getSql();

  // Drop an empty shell for the new id so we can take over the old primary key.
  await sql`DELETE FROM profiles WHERE user_id = ${newUserId}`;

  await sql`
    UPDATE profiles
    SET user_id = ${newUserId}, email = ${email}, updated_at = now()
    WHERE user_id = ${oldUserId}
  `;

  const oldSwipes = await sql`
    SELECT professor_id, action FROM swipes WHERE user_id = ${oldUserId}
  ` as { professor_id: string; action: string }[];
  for (const swipe of oldSwipes) {
    await sql`
      INSERT INTO swipes (user_id, professor_id, action, updated_at)
      VALUES (${newUserId}, ${swipe.professor_id}, ${swipe.action}, now())
      ON CONFLICT (user_id, professor_id)
      DO UPDATE SET action = EXCLUDED.action, updated_at = now()
    `;
  }
  await sql`DELETE FROM swipes WHERE user_id = ${oldUserId}`;

  const oldProgress = await sql`
    SELECT professor_id, read_summary, researched, quiz_score, quiz_passed, draft_subject, draft_body
    FROM outreach_progress
    WHERE user_id = ${oldUserId}
  ` as {
    professor_id: string;
    read_summary: boolean;
    researched: boolean;
    quiz_score: number | null;
    quiz_passed: boolean;
    draft_subject: string | null;
    draft_body: string | null;
  }[];
  for (const row of oldProgress) {
    await sql`
      INSERT INTO outreach_progress (
        user_id, professor_id, read_summary, researched, quiz_score, quiz_passed,
        draft_subject, draft_body, updated_at
      )
      VALUES (
        ${newUserId},
        ${row.professor_id},
        ${row.read_summary},
        ${row.researched},
        ${row.quiz_score},
        ${row.quiz_passed},
        ${row.draft_subject},
        ${row.draft_body},
        now()
      )
      ON CONFLICT (user_id, professor_id)
      DO UPDATE SET
        read_summary = EXCLUDED.read_summary OR outreach_progress.read_summary,
        researched = EXCLUDED.researched OR outreach_progress.researched,
        quiz_score = COALESCE(EXCLUDED.quiz_score, outreach_progress.quiz_score),
        quiz_passed = EXCLUDED.quiz_passed OR outreach_progress.quiz_passed,
        draft_subject = COALESCE(EXCLUDED.draft_subject, outreach_progress.draft_subject),
        draft_body = COALESCE(EXCLUDED.draft_body, outreach_progress.draft_body),
        updated_at = now()
    `;
  }
  await sql`DELETE FROM outreach_progress WHERE user_id = ${oldUserId}`;
}

async function reclaimByEmail(userId: string, email: string) {
  const sql = getSql();
  const candidates = await sql`
    SELECT user_id, name, major, year, interests, coursework, skills, goals, email
    FROM profiles
    WHERE lower(email) = ${email}
      AND user_id <> ${userId}
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 5
  ` as ProfileRow[];

  const prior = candidates.find((row) => !isProfileEmpty(toProfile(row))) || candidates[0];
  if (!prior?.user_id) return null;

  await reassignUserData(prior.user_id, userId, email);

  const rows = await sql`
    SELECT name, major, year, interests, coursework, skills, goals
    FROM profiles
    WHERE user_id = ${userId}
  ` as ProfileRow[];
  return rows[0] ?? null;
}

export async function GET() {
  const { userId, email, response } = await requireUser();
  if (response) return response;
  await ensureProfileEmailColumn();
  const sql = getSql();

  let rows = await sql`
    SELECT name, major, year, interests, coursework, skills, goals
    FROM profiles
    WHERE user_id = ${userId}
  ` as ProfileRow[];

  const current = toProfile(rows[0]);
  if (email && (!rows[0] || isProfileEmpty(current))) {
    const reclaimed = await reclaimByEmail(userId, email);
    if (reclaimed) rows = [reclaimed];
  }

  if (rows[0] && email) {
    await sql`
      UPDATE profiles
      SET email = ${email}
      WHERE user_id = ${userId}
        AND (email IS DISTINCT FROM ${email})
    `;
  }

  return Response.json({ profile: toProfile(rows[0]) });
}

export async function PUT(request: Request) {
  const { userId, email, response } = await requireUser();
  if (response) return response;
  await ensureProfileEmailColumn();

  const url = new URL(request.url);
  const isReset = url.searchParams.get('reset') === '1';
  const body = await request.json() as { profile?: unknown };
  const profile = parseProfile(body.profile);

  if (isProfileEmpty(profile) && !isReset) {
    return Response.json({ error: 'Refusing to save an empty profile.' }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    INSERT INTO profiles (user_id, name, major, year, interests, coursework, skills, goals, email, updated_at)
    VALUES (
      ${userId},
      ${profile.name},
      ${profile.major},
      ${profile.year},
      ${profile.interests},
      ${profile.coursework},
      ${profile.skills},
      ${profile.goals},
      ${email},
      now()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      major = EXCLUDED.major,
      year = EXCLUDED.year,
      interests = EXCLUDED.interests,
      coursework = EXCLUDED.coursework,
      skills = EXCLUDED.skills,
      goals = EXCLUDED.goals,
      email = COALESCE(EXCLUDED.email, profiles.email),
      updated_at = now()
  `;
  return Response.json({ profile });
}
