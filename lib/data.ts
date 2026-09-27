import facultyData from '@/public/faculty/faculty.json';

export type CollegeId = 'CSE' | 'CBS';
export type QuizQuestion = { question: string; choices: string[] };
export type Professor = {
  id: string;
  name: string;
  department: string;
  departmentId: string;
  college: CollegeId;
  role: string;
  email: string | null;
  url: string;
  photo: string;
  category: string;
  summary: string;
  topics: string[];
  quiz: QuizQuestion[];
  color: string;
};
export type StudentProfile = { name: string; major: string; year: string; interests: string[]; coursework: string; skills: string; goals: string };
export type DiscoveryDecision = { professorId: string; action: 'saved' | 'passed' };
export type ChatMessage = { role: 'user' | 'assistant'; text: string };
export type EmailDraft = { professorId: string; subject: string; body: string };
export const emptyProfile: StudentProfile = { name: '', major: '', year: '', interests: [], coursework: '', skills: '', goals: '' };

export function missingProfileFields(profile: StudentProfile) {
  const missing: string[] = [];
  if (!profile.name.trim()) missing.push('name');
  if (!profile.major.trim()) missing.push('major');
  if (!profile.year.trim()) missing.push('year');
  if (profile.interests.length === 0) missing.push('interests');
  if (!profile.coursework.trim()) missing.push('coursework');
  if (!profile.skills.trim()) missing.push('skills');
  if (!profile.goals.trim()) missing.push('research goals');
  return missing;
}

export function isProfileComplete(profile: StudentProfile) {
  return missingProfileFields(profile).length === 0;
}

export const colleges = [
  { id: 'CSE' as const, name: 'College of Science and Engineering', short: 'CSE' },
  { id: 'CBS' as const, name: 'College of Biological Sciences', short: 'CBS' },
];

export type Department = { id: string; name: string; short: string; college: CollegeId; ready: boolean };

export const departments: Department[] = [
  { id: 'aem', name: 'Aerospace Engineering and Mechanics', short: 'AEM', college: 'CSE', ready: true },
  { id: 'bme', name: 'Biomedical Engineering', short: 'BME', college: 'CSE', ready: false },
  { id: 'cems', name: 'Chemical Engineering and Materials Science', short: 'CEMS', college: 'CSE', ready: false },
  { id: 'chem', name: 'Chemistry', short: 'CHEM', college: 'CSE', ready: false },
  { id: 'cege', name: 'Civil, Environmental, and Geo-Engineering', short: 'CEGE', college: 'CSE', ready: false },
  { id: 'cseng', name: 'Computer Science & Engineering', short: 'CS&E', college: 'CSE', ready: false },
  { id: 'esci', name: 'Earth & Environmental Sciences', short: 'ESCI', college: 'CSE', ready: false },
  { id: 'ece', name: 'Electrical and Computer Engineering', short: 'ECE', college: 'CSE', ready: false },
  { id: 'isye', name: 'Industrial and Systems Engineering', short: 'ISyE', college: 'CSE', ready: false },
  { id: 'math', name: 'Mathematics', short: 'MATH', college: 'CSE', ready: false },
  { id: 'me', name: 'Mechanical Engineering', short: 'ME', college: 'CSE', ready: false },
  { id: 'phys', name: 'Physics & Astronomy', short: 'PHYS', college: 'CSE', ready: false },
  { id: 'bmbb', name: 'Biochemistry, Molecular Biology and Biophysics', short: 'BMBB', college: 'CBS', ready: false },
  { id: 'eeb', name: 'Ecology, Evolution and Behavior', short: 'EEB', college: 'CBS', ready: false },
  { id: 'gcd', name: 'Genetics, Cell Biology and Development', short: 'GCD', college: 'CBS', ready: false },
  { id: 'pmb', name: 'Plant and Microbial Biology', short: 'PMB', college: 'CBS', ready: false },
];

type FacultyRecord = {
  name: string;
  role: string;
  email: string | null;
  url: string;
  category: string;
  research_summary: string;
  quiz?: { question: string; choices?: string[]; answer: string }[];
  slug: string;
  photo_file: string;
};

const colors = ['sage', 'lilac', 'peach', 'gold'] as const;
const aem = departments.find((d) => d.id === 'aem')!;
const topicRules: [RegExp, string][] = [
  [/hypersonic/i, 'Hypersonics'],
  [/turbulen/i, 'Turbulence'],
  [/spacecraft|satellite|orbital|\bmoon\b|constellation/i, 'Spacecraft'],
  [/navigat/i, 'Navigation'],
  [/control|guidance/i, 'Control systems'],
  [/robot/i, 'Robotics'],
  [/material|alloy|polymer|ceramic|tissue|composite|shape-memory|two-dimensional/i, 'Materials'],
  [/fluid|flow|vortex|vortices|aerodynam|rheolog/i, 'Fluid dynamics'],
  [/comput|simulat|numerical|finite-element|machine learning|data-driven|data-based/i, 'Computational modeling'],
  [/propulsion|combust|rocket/i, 'Propulsion'],
  [/structur|buckl|flutter|fracture|instab|origami/i, 'Structures'],
  [/experiment/i, 'Experiments'],
  [/aircraft|flight|air-data|unmanned|air mobility/i, 'Flight'],
  [/sensor/i, 'Sensors'],
];

function topicsFrom(summary: string) {
  return [...new Set(topicRules.filter(([pattern]) => pattern.test(summary)).map(([, topic]) => topic))].slice(0, 3);
}

export const professors: Professor[] = (facultyData as FacultyRecord[]).map((faculty, index) => ({
  id: faculty.slug,
  name: faculty.name,
  department: aem.name,
  departmentId: aem.id,
  college: aem.college,
  role: faculty.role,
  email: faculty.email,
  url: faculty.url,
  photo: `/faculty/${faculty.photo_file}`,
  category: faculty.category,
  summary: faculty.research_summary,
  topics: topicsFrom(faculty.research_summary),
  quiz: (faculty.quiz || []).map((item) => ({ question: item.question, choices: item.choices || [] })),
  color: colors[index % colors.length],
}));

export const featuredProfessor = professors[0];
export const topics = [...new Set(professors.flatMap((professor) => professor.topics))];
export function departmentsFor(college: CollegeId) {
  return departments.filter((department) => department.college === college);
}
export function ranked(interests: string[]) {
  return [...professors].sort((a, b) => b.topics.filter((topic) => interests.includes(topic)).length - a.topics.filter((topic) => interests.includes(topic)).length);
}
