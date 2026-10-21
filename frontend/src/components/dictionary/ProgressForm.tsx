import { ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import type { Direction, Progress, Word } from "../../types";
import { levelClass, levelIntervals, levelName } from "./levels";

const stageLabels = levelIntervals.map((interval, stage) => `${levelName(stage)} · ${interval}`);
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
            <select className={levelClass(enRu)}
              value={enRu}
              onChange={(event) => setEnRu(Number(event.target.value))}
            >
              {stageLabels.map((label, stage) => (
                <option key={stage} value={stage}>
                  {label}
                </option>
              ))}
            </select>
            <span className={`level-preview ${levelClass(enRu)}`}>{stageLabels[enRu]}</span>
          </label>
          <label>
            Русский → английский
            <select className={levelClass(ruEn)}
              value={ruEn}
              onChange={(event) => setRuEn(Number(event.target.value))}
            >
              {stageLabels.map((label, stage) => (
                <option key={stage} value={stage}>
                  {label}
                </option>
              ))}
            </select>
            <span className={`level-preview ${levelClass(ruEn)}`}>{stageLabels[ruEn]}</span>
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
