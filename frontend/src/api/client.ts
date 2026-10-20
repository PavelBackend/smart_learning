import type {
  AnswerResult,
  Direction,
  Insights,
  PracticeSummary,
  Progress,
  Question,
  Word,
  WordInput,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : `Ошибка сервера (${response.status})`,
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
  words: (search = "") =>
    request<{ items: Word[]; total: number }>(
      `/words?limit=10000&search=${encodeURIComponent(search)}`,
    ),
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
  answer: (word_id: string, direction: Direction, answer: string) =>
    request<AnswerResult>(
      "/practice/answer",
      json("POST", { word_id, direction, answer }),
    ),
  summary: () => request<PracticeSummary>("/practice/summary"),
  progress: () => request<{ items: Progress[] }>("/practice/progress"),
  setProgress: (wordId: string, direction: Direction, stage: number) =>
    request<Progress>(
      `/practice/progress/${wordId}`,
      json("PUT", { direction, stage }),
    ),
  insights: () => request<Insights>("/insights/summary"),
};
