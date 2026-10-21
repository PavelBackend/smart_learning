import type { ReportInput } from "../../types";
import { localDay, previousDay } from "../../utils/localTime";

const PREFIX = "wordwell-report-draft:";
const SNOOZE_PREFIX = "wordwell-report-snooze:";

export type ReportDraft = {
  date: string;
  step: number;
  values: Omit<ReportInput, "timezone">;
};

export function readDraft(date: string): ReportDraft | null {
  try {
    const raw = localStorage.getItem(PREFIX + date);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ReportDraft;
    return draft.date === date && draft.values ? draft : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: ReportDraft): void {
  try {
    localStorage.setItem(PREFIX + draft.date, JSON.stringify(draft));
  } catch {
    // The form still works while browser storage is unavailable.
  }
}

export function clearDraft(date: string): void {
  try {
    localStorage.removeItem(PREFIX + date);
    localStorage.removeItem(SNOOZE_PREFIX + date);
  } catch {
    // The saved report remains available from the server.
  }
}

export function pendingDraft(completedDates: Set<string>, now = new Date()): ReportDraft | null {
  for (const date of [previousDay(now), localDay(now)]) {
    if (!completedDates.has(date)) {
      const draft = readDraft(date);
      if (draft) return draft;
    }
  }
  return null;
}

export function snoozed(date: string, now = new Date()): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_PREFIX + date) || 0) > now.getTime();
  } catch {
    return false;
  }
}

export function snooze(date: string, now = new Date()): void {
  try {
    localStorage.setItem(SNOOZE_PREFIX + date, String(now.getTime() + 2 * 60 * 60 * 1000));
  } catch {
    // A dismissed reminder can return on the next page load.
  }
}
