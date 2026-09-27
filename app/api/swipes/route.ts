import { requireUser } from '@/lib/auth-server';
import { professors, type DiscoveryDecision } from '@/lib/data';
import { getSql } from '@/lib/db';

type SwipeRow = { professor_id: string; action: 'saved' | 'passed' };

function validDecision(value: unknown): value is DiscoveryDecision {
  if (!value || typeof value !== 'object') return false;
  const decision = value as DiscoveryDecision;
  return professors.some((professor) => professor.id === decision.professorId) && (decision.action === 'saved' || decision.action === 'passed');
}

function toDecisions(rows: SwipeRow[]): DiscoveryDecision[] {
  return rows.map((row) => ({ professorId: row.professor_id, action: row.action }));
}

export async function GET() {
  const { userId, response } = await requireUser();
  if (response) return response;
  const sql = getSql();
  const rows = await sql`
    SELECT professor_id, action
    FROM swipes
    WHERE user_id = ${userId}
    ORDER BY updated_at ASC
  ` as SwipeRow[];
  return Response.json({ decisions: toDecisions(rows) });
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (response) return response;
  const body = await request.json() as DiscoveryDecision;
  if (!validDecision(body)) {
    return Response.json({ error: 'Choose a valid professor and swipe.' }, { status: 400 });
  }
  const sql = getSql();
  await sql`
    INSERT INTO swipes (user_id, professor_id, action, updated_at)
    VALUES (${userId}, ${body.professorId}, ${body.action}, now())
    ON CONFLICT (user_id, professor_id)
    DO UPDATE SET action = EXCLUDED.action, updated_at = now()
  `;
  return Response.json({ ok: true });
}

export async function PUT(request: Request) {
  const { userId, response } = await requireUser();
  if (response) return response;
  const body = await request.json() as { decisions?: unknown };
  const sql = getSql();
  const decisions = Array.isArray(body.decisions) ? body.decisions.filter(validDecision) : [];
  for (const decision of decisions) {
    await sql`
      INSERT INTO swipes (user_id, professor_id, action, updated_at)
      VALUES (${userId}, ${decision.professorId}, ${decision.action}, now())
      ON CONFLICT (user_id, professor_id)
      DO UPDATE SET action = EXCLUDED.action, updated_at = now()
    `;
  }
  const rows = await sql`
    SELECT professor_id, action
    FROM swipes
    WHERE user_id = ${userId}
    ORDER BY updated_at ASC
  ` as SwipeRow[];
  return Response.json({ decisions: toDecisions(rows) });
}

export async function DELETE(request: Request) {
  const { userId, response } = await requireUser();
  if (response) return response;
  const url = new URL(request.url);
  const professorId = url.searchParams.get('professorId');
  const sql = getSql();
  if (professorId) {
    if (!professors.some((professor) => professor.id === professorId)) {
      return Response.json({ error: 'Unknown professor.' }, { status: 400 });
    }
    await sql`DELETE FROM swipes WHERE user_id = ${userId} AND professor_id = ${professorId}`;
  } else {
    await sql`DELETE FROM swipes WHERE user_id = ${userId}`;
  }
  return Response.json({ ok: true });
}
