export type Direction = "en_ru" | "ru_en";
export type Example = { en: string; ru: string };
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
  direction: Direction;
  prompt: string;
  part_of_speech: string | null;
  stage: number;
};
export type AnswerResult = {
  correct: boolean;
  accepted: string[];
  example: Example | null;
  stage: number;
  due_at: string;
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
  streak: number;
  activity: { date: string; count: number }[];
};
export type Progress = {
  word_id: string;
  direction: Direction;
  stage: number;
  due_at: string;
};
