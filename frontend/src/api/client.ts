import type {
  AnswerResult,
  Cohort,
  Direction,
  Insights,
  PracticeSummary,
  Progress,
  Question,
  Report,
  ReportInput,
  Word,
  WordInput,
} from "../types";
import { localTimezone } from "../utils/localTime";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      typeof body?.detail === "string"
        ? body.detail
        : `Ошибка сервера (${response.status})`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export const api = {
  words: (search = "", limit = 24, offset = 0) =>
    request<{ items: Word[]; total: number }>(
      `/words?limit=${limit}&offset=${offset}&search=${encodeURIComponent(search)}`,
    ),
  word: (id: string) => request<Word>(`/words/${id}`),
  createWord: (word: WordInput) => request<Word>("/words", json("POST", word)),
  updateWord: (id: string, word: WordInput) =>
    request<Word>(`/words/${id}`, json("PUT", word)),
  deleteWord: (id: string) =>
    request<void>(`/words/${id}`, { method: "DELETE" }),
  importWords: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return request<{ created: number; updated: number; total: number }>(
      "/words/import",
      { method: "POST", body: data },
    );
  },
  exportWords: () => request<{ words: WordInput[] }>("/words/export"),
  next: (direction: Direction) =>
    request<Question>(`/practice/next?direction=${direction}`),
  cohort: () => request<Cohort>("/practice/cohort"),
  startCohort: (count: number) => request<Cohort>("/practice/cohort", json("POST", { count })),
  expandCohort: (count: number) => request<Cohort>("/practice/cohort/expand", json("POST", { count })),
  acceptAttempt: (id: string) => request<AnswerResult>(`/practice/attempts/${id}/accept`, { method: "POST" }),
  recheckAttempt: (id: string) => request<AnswerResult>(`/practice/attempts/${id}/recheck`, { method: "POST" }),
  deletePracticeWord: (id: string) => request<void>(`/practice/words/${id}`, { method: "DELETE" }),
  answer: (word_id: string, direction: Direction, answer: string) =>
    request<AnswerResult>(
      "/practice/answer",
      json("POST", { word_id, direction, answer }),
    ),
  summary: () => request<PracticeSummary>("/practice/summary"),
  progress: () => request<{ items: Progress[] }>("/practice/progress"),
  progressForWords: (wordIds: string[]) => request<{ items: Progress[] }>("/practice/progress/batch", json("POST", { word_ids: wordIds })),
  setProgress: (wordId: string, direction: Direction, stage: number) =>
    request<Progress>(
      `/practice/progress/${wordId}`,
      json("PUT", { direction, stage }),
    ),
  insights: () =>
    request<Insights>(`/insights/summary?timezone=${encodeURIComponent(localTimezone())}`),
  reports: () => request<{ items: Report[] }>("/journal/reports"),
  report: (date: string) => request<Report>(`/journal/reports/${date}`),
  saveReport: (date: string, report: ReportInput) =>
    request<Report>(`/journal/reports/${date}`, json("PUT", report)),
};
