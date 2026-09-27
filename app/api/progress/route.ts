import { requireUser } from '@/lib/auth-server';
import { getProfessor } from '@/lib/faculty-server';
import { getSql } from '@/lib/db';

type ProgressRow = {
  professor_id: string;
  read_summary: boolean;
  researched: boolean;
  quiz_score: number | null;
  quiz_passed: boolean;
  draft_subject: string | null;
  draft_body: string | null;
};

function toProgress(row: ProgressRow | undefined, professorId: string) {
  return {
    professorId,
    readSummary: row?.read_summary ?? false,
    researched: row?.researched ?? false,
    quizScore: row?.quiz_score ?? null,
    quizPassed: row?.quiz_passed ?? false,
    draft: row?.draft_subject && row.draft_body ? { subject: row.draft_subject, body: row.draft_body } : null,
  };
}

export async function GET(request: Request) {
  const { userId, response } = await requireUser();
  if (response) return response;
  const professorId = new URL(request.url).searchParams.get('professorId');
  if (!professorId || !getProfessor(professorId)) {
    return Response.json({ error: 'Unknown professor.' }, { status: 400 });
  }
  const sql = getSql();
  const rows = await sql`
    SELECT professor_id, read_summary, researched, quiz_score, quiz_passed, draft_subject, draft_body
    FROM outreach_progress
    WHERE user_id = ${userId} AND professor_id = ${professorId}
  ` as ProgressRow[];
  return Response.json(toProgress(rows[0], professorId));
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (response) return response;
  const body = await request.json() as { professorId?: string; readSummary?: boolean; researched?: boolean };
  if (!body.professorId || !getProfessor(body.professorId)) {
    return Response.json({ error: 'Unknown professor.' }, { status: 400 });
  }
  const sql = getSql();
  await sql`
    INSERT INTO outreach_progress (user_id, professor_id, read_summary, researched, updated_at)
    VALUES (${userId}, ${body.professorId}, ${Boolean(body.readSummary)}, ${Boolean(body.researched)}, now())
    ON CONFLICT (user_id, professor_id)
    DO UPDATE SET
      read_summary = outreach_progress.read_summary OR EXCLUDED.read_summary,
      researched = outreach_progress.researched OR EXCLUDED.researched,
      updated_at = now()
  `;
  const rows = await sql`
    SELECT professor_id, read_summary, researched, quiz_score, quiz_passed, draft_subject, draft_body
    FROM outreach_progress
    WHERE user_id = ${userId} AND professor_id = ${body.professorId}
  ` as ProgressRow[];
  return Response.json(toProgress(rows[0], body.professorId));
}
