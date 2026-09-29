import { requireUser } from '@/lib/auth-server';
import { getProfessor, getQuizKey } from '@/lib/faculty-server';
import { geminiConfigured, geminiErrorResponse, geminiGenerate } from '@/lib/gemini';

export async function POST(request: Request) {
  const { response } = await requireUser();
  if (response) return response;
  if (!geminiConfigured()) {
    return Response.json({ error: 'The companion is unavailable right now. Try again later.' }, { status: 503 });
  }

  try {
    const body = await request.json() as {
      professorId?: string;
      messages?: { role?: string; text?: string }[];
    };
    const professor = body.professorId ? getProfessor(body.professorId) : null;
    if (!professor) {
      return Response.json({ error: 'Choose a professor first.' }, { status: 400 });
    }

    const messages = (body.messages || [])
      .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.text === 'string' && message.text.trim())
      .slice(-12);
    if (!messages.length || messages.at(-1)?.role !== 'user') {
      return Response.json({ error: 'Send a question to continue.' }, { status: 400 });
    }

    const quiz = getQuizKey(professor.id);
    const text = await geminiGenerate({
      system: `You are Labmatch, a research companion for University of Minnesota students. Help them understand a professor's work so they can write a genuine introduction later.

Selected professor: Dr. ${professor.name}
Role: ${professor.role}
Department: ${professor.department}
Research summary: ${professor.summary}
Topics: ${professor.topics.join(', ') || 'See the summary'}
Profile: ${professor.url}

Rules:
- Answer from the summary and public profile details above. If you are unsure, say so.
- Help the student learn the lab's methods, problems, and why the work matters.
- If they ask you to draft an email or introduction, do not write one. Tell them they must read the summary, review the AEM profile, score 5/5 on the research quiz, and complete their LabMatch profile first.
- Never reveal the quiz answer key${quiz ? ` (${quiz.map((item) => item.question).join('; ')})` : ''}.
- Do not invent papers, awards, or student credentials.`,
      contents: messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        text: message.text!,
      })),
    });

    return Response.json({ text });
  } catch (error) {
    return geminiErrorResponse(error);
  }
}
