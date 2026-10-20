import { ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import type { Direction, Progress, Word } from "../../types";

const stageLabels = [
  "Новое · сегодня",
  "Уровень 2 · завтра",
  "Уровень 3 · через 3 дня",
  "Уровень 4 · через 7 дней",
  "Уровень 5 · через 14 дней",
  "Уровень 6 · через 30 дней",
  "Усвоено · через 60 дней",
];
export function ProgressForm({
  word,
  progress,
  onClose,
  onSaved,
}: {
  word: Word;
  progress: Progress[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const stageFor = (direction: Direction) =>
    progress.find(
      (row) => row.word_id === word.id && row.direction === direction,
    )?.stage ?? 0;
  const [enRu, setEnRu] = useState(stageFor("en_ru"));
  const [ruEn, setRuEn] = useState(stageFor("ru_en"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api.setProgress(word.id, "en_ru", enRu);
      await api.setProgress(word.id, "ru_en", ruEn);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="word-modal progress-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Степень изученности"
      >
        <div className="modal-head">
          <div>
            <span className="panel-kicker">ПРОГРЕСС СЛОВА</span>
            <h2>{word.english}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
        <p>
          У каждого направления свой уровень. Чем он выше, тем реже слово
          возвращается в задания.
        </p>
        <div className="progress-fields">
          <label>
            Английский → русский
            <select
              value={enRu}
              onChange={(event) => setEnRu(Number(event.target.value))}
            >
              {stageLabels.map((label, stage) => (
                <option key={stage} value={stage}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Русский → английский
            <select
              value={ruEn}
              onChange={(event) => setRuEn(Number(event.target.value))}
            >
              {stageLabels.map((label, stage) => (
                <option key={stage} value={stage}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Отмена
          </button>
          <button
            className="primary-button"
            onClick={() => void save()}
            disabled={busy}
          >
            Сохранить уровень <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
