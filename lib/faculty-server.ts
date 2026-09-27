import facultyData from '@/public/faculty/faculty.json';
import { professors } from '@/lib/data';

type FacultyRecord = {
  slug: string;
  quiz?: { question: string; choices?: string[]; answer: string }[];
};

export function getProfessor(id: string) {
  return professors.find((professor) => professor.id === id) ?? null;
}

export function getQuizKey(id: string) {
  const record = (facultyData as FacultyRecord[]).find((faculty) => faculty.slug === id);
  const quiz = record?.quiz;
  if (!quiz || quiz.length !== 5) return null;
  if (!quiz.every((item) => Array.isArray(item.choices) && item.choices.includes(item.answer))) return null;
  return quiz;
}
