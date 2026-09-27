import type { DiscoveryDecision, EmailDraft, StudentProfile } from '@/lib/data';

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }
  return data;
}

export async function fetchSwipes() {
  const response = await fetch('/api/swipes');
  if (response.status === 401) return null;
  return readJson<{ decisions: DiscoveryDecision[] }>(response);
}

export async function saveSwipe(decision: DiscoveryDecision) {
  const response = await fetch('/api/swipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decision),
  });
  if (response.status === 401) return false;
  await readJson(response);
  return true;
}

export async function saveSwipes(decisions: DiscoveryDecision[]) {
  const response = await fetch('/api/swipes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions }),
  });
  if (response.status === 401) return null;
  return readJson<{ decisions: DiscoveryDecision[] }>(response);
}

export async function deleteSwipe(professorId?: string) {
  const response = await fetch(professorId ? `/api/swipes?professorId=${encodeURIComponent(professorId)}` : '/api/swipes', {
    method: 'DELETE',
  });
  if (response.status === 401) return false;
  await readJson(response);
  return true;
}

export type OutreachProgress = {
  professorId: string;
  readSummary: boolean;
  researched: boolean;
  quizScore: number | null;
  quizPassed: boolean;
  draft: EmailDraft | null;
};

export async function fetchProgress(professorId: string) {
  const response = await fetch(`/api/progress?professorId=${encodeURIComponent(professorId)}`);
  if (response.status === 401) return null;
  return readJson<OutreachProgress>(response);
}

export async function saveProgress(professorId: string, patch: { readSummary?: boolean; researched?: boolean }) {
  return readJson<OutreachProgress>(await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ professorId, ...patch }),
  }));
}

export async function sendChat(professorId: string, messages: { role: 'user' | 'assistant'; text: string }[]) {
  return readJson<{ text: string }>(await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ professorId, messages }),
  }));
}

export async function submitQuiz(professorId: string, answers: string[]) {
  return readJson<{
    score: number;
    total: number;
    passed: boolean;
    results: { correct: boolean; feedback: string }[];
  }>(await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ professorId, answers }),
  }));
}

export async function requestDraft(professorId: string, profile: StudentProfile) {
  return readJson<{ draft: EmailDraft }>(await fetch('/api/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ professorId, profile }),
  }));
}
