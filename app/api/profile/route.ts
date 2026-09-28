import { requireUser } from '@/lib/auth-server';
import { emptyProfile, parseProfile, type StudentProfile } from '@/lib/data';
import { getSql } from '@/lib/db';

type ProfileRow = {
  name: string;
  major: string;
  year: string;
  interests: string[] | null;
  coursework: string;
  skills: string;
  goals: string;
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

export async function GET() {
  const { userId, response } = await requireUser();
  if (response) return response;
  const sql = getSql();
  const rows = await sql`
    SELECT name, major, year, interests, coursework, skills, goals
    FROM profiles
    WHERE user_id = ${userId}
  ` as ProfileRow[];
  return Response.json({ profile: toProfile(rows[0]) });
}

export async function PUT(request: Request) {
  const { userId, response } = await requireUser();
  if (response) return response;
  const body = await request.json() as { profile?: unknown };
  const profile = parseProfile(body.profile);
  const sql = getSql();
  await sql`
    INSERT INTO profiles (user_id, name, major, year, interests, coursework, skills, goals, updated_at)
    VALUES (
      ${userId},
      ${profile.name},
      ${profile.major},
      ${profile.year},
      ${profile.interests},
      ${profile.coursework},
      ${profile.skills},
      ${profile.goals},
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
      updated_at = now()
  `;
  return Response.json({ profile });
}
