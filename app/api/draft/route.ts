import { requireUser } from '@/lib/auth-server';
import { getProfessor } from '@/lib/faculty-server';
import { getSql } from '@/lib/db';
import { isProfileComplete, missingProfileFields, parseProfile } from '@/lib/data';
import { geminiConfigured, geminiErrorResponse, geminiGenerate, parseGeminiJson } from '@/lib/gemini';

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (response) return response;
  if (!geminiConfigured()) {
    return Response.json({ error: 'Drafts are unavailable right now. Try again later.' }, { status: 503 });
  }

  try {
    const body = await request.json() as { professorId?: string; profile?: unknown };
    const professor = body.professorId ? getProfessor(body.professorId) : null;
    if (!professor) {
      return Response.json({ error: 'Choose a professor first.' }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT quiz_passed, draft_subject, draft_body
      FROM outreach_progress
      WHERE user_id = ${userId} AND professor_id = ${professor.id}
    ` as { quiz_passed: boolean; draft_subject: string | null; draft_body: string | null }[];
    if (!rows[0]?.quiz_passed) {
      return Response.json({ error: 'Score 5/5 on the research quiz before drafting an email.' }, { status: 403 });
    }

    const student = parseProfile(body.profile);
    if (!isProfileComplete(student)) {
      const missing = missingProfileFields(student).join(', ');
      return Response.json({
        error: `Complete your profile before drafting an email. Still needed: ${missing}.`,
      }, { status: 403 });
    }

    const lastName = professor.name.split(/\s+/).filter(Boolean).at(-1) || professor.name;
    const prompt = {
      json: true as const,
      system: 'You write short, sincere undergraduate research introduction emails for LabMatch. Use the student\'s real name, interests, coursework, skills, and goals so the email sounds like them. Connect their background to the professor\'s work only when the overlap is genuine. Never invent coursework, skills, papers, awards, or lab openings. Return JSON {"subject":"...","body":"..."}.',
      contents: [{
        role: 'user' as const,
        text: `Write a personalized introduction email from this student to this professor.

Professor: Dr. ${professor.name}
Role: ${professor.role}
Department: ${professor.department}
Research summary: ${professor.summary}
Topics: ${professor.topics.join(', ')}
Greeting last name: ${lastName}

Student:
- Name: ${student.name}
- Year: ${student.year}
- Major: ${student.major}
- Research interests: ${student.interests.join(', ')}
- Coursework: ${student.coursework}
- Skills and experience: ${student.skills}
- What they want to explore: ${student.goals}

Write in first person as ${student.name}. Open with Dear Dr. ${lastName}. Mention 1-2 specific aspects of the lab that connect to the student's interests or background. Include a brief, honest line about their relevant coursework or skills. State their goal in their own terms. Ask about undergraduate research opportunities. Stay under 220 words.`,
      }],
    };

    let draft = { subject: '', body: '' };
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const text = await geminiGenerate(prompt);
      try {
        const parsed = parseGeminiJson<{ subject?: string; body?: string }>(text);
        draft = {
          subject: parsed.subject?.trim() || `Undergraduate research interest — ${professor.department}`,
          body: parsed.body?.trim() || '',
        };
        if (draft.body) break;
      } catch (parseError) {
        console.error('[draft] json parse failed', parseError);
        if (attempt === 2) {
          return Response.json({ error: 'The draft came back in a bad format. Try again.' }, { status: 502 });
        }
      }
    }

    if (!draft.body) {
      return Response.json({ error: 'The draft came back empty. Try again.' }, { status: 502 });
    }

    await sql`
      UPDATE outreach_progress
      SET draft_subject = ${draft.subject}, draft_body = ${draft.body}, updated_at = now()
      WHERE user_id = ${userId} AND professor_id = ${professor.id}
    `;

    return Response.json({ draft });
  } catch (error) {
    return geminiErrorResponse(error, 'Drafts are unavailable right now. Try again later.');
  }
}
