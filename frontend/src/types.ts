export type Direction = "en_ru" | "ru_en";
export type Example = { en: string; ru: string; source_url?: string | null; license?: string | null; attribution?: string | null };
export type WordInput = {
  english: string;
  translations: string[];
  examples: Example[];
  part_of_speech: string | null;
  note: string | null;
  tags: string[];
};
export type Word = WordInput & { id: string; created_at: string };
export type Question = {
  word_id: string;
  english: string;
  direction: Direction;
  prompt: string;
  part_of_speech: string | null;
  stage: number;
};
export type AnswerResult = {
  attempt_id: string | null;
  correct: boolean;
  accepted: string[];
  example: Example | null;
  stage: number;
  due_at: string;
};
export type Cohort = {
  count: number;
  remaining: number;
  ready: boolean;
  available: number;
  due_en_ru: number;
  due_ru_en: number;
  can_add: boolean;
  required_level: number;
};
export type PracticeSummary = {
  total_words: number;
  learned: number;
  due: number;
  attempts: number;
};
export type Insights = {
  total_answers: number;
  correct_answers: number;
  accuracy: number;
  today_answers: number;
  today_words: number;
  streak: number;
  activity: { date: string; count: number }[];
};
export type Exercise = {
  name: string;
  sets: number | null;
  repetitions: number | null;
};
export type ReportInput = {
  timezone: string;
  mood: "great" | "good" | "okay" | "low" | null;
  thoughts: string | null;
  highlight: string | null;
  english_minutes: number | null;
  english_details: string | null;
  reviewed_words: number | null;
  sports_minutes: number | null;
  sports_activity: string | null;
  exercises: Exercise[];
};
export type Report = ReportInput & {
  report_date: string;
  created_at: string;
  updated_at: string;
};
export type Progress = {
  word_id: string;
  direction: Direction;
  stage: number;
  due_at: string;
};
