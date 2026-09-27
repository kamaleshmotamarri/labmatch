import { requireUser } from '@/lib/auth-server';
import { getProfessor, getQuizKey } from '@/lib/faculty-server';
import { getSql } from '@/lib/db';

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (response) return response;

  const body = await request.json() as { professorId?: string; answers?: unknown };
  const professor = body.professorId ? getProfessor(body.professorId) : null;
  const quiz = professor ? getQuizKey(professor.id) : null;
  if (!professor || !quiz) {
    return Response.json({ error: 'This professor does not have a research quiz yet.' }, { status: 400 });
  }
  const answers = Array.isArray(body.answers) ? body.answers.filter((answer): answer is string => typeof answer === 'string') : [];
  if (answers.length !== quiz.length || quiz.some((item, index) => !item.choices?.includes(answers[index]))) {
    return Response.json({ error: 'Choose an option for all five questions.' }, { status: 400 });
  }

  const sql = getSql();
  const progress = await sql`
    SELECT read_summary, researched, quiz_passed
    FROM outreach_progress
    WHERE user_id = ${userId} AND professor_id = ${professor.id}
  ` as { read_summary: boolean; researched: boolean; quiz_passed: boolean }[];
  const current = progress[0];
  if (!current?.read_summary || !current.researched) {
    return Response.json({ error: 'Read the summary and review the professor’s profile before taking the quiz.' }, { status: 403 });
  }

  const results = quiz.map((item, index) => {
    const correct = answers[index] === item.answer;
    return {
      correct,
      feedback: correct ? 'That matches the research summary.' : 'Try another option after another look at the summary.',
    };
  });
  const score = results.filter((result) => result.correct).length;
  const passed = score === quiz.length;

  await sql`
    INSERT INTO outreach_progress (user_id, professor_id, read_summary, researched, quiz_score, quiz_passed, updated_at)
    VALUES (${userId}, ${professor.id}, true, true, ${score}, ${passed}, now())
    ON CONFLICT (user_id, professor_id)
    DO UPDATE SET
      quiz_score = EXCLUDED.quiz_score,
      quiz_passed = outreach_progress.quiz_passed OR EXCLUDED.quiz_passed,
      updated_at = now()
  `;

  return Response.json({
    score,
    total: quiz.length,
    passed: Boolean(current.quiz_passed || passed),
    results,
  });
}
