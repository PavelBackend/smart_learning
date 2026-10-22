import { ArrowRight, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "../../api/client";
import type { Example, Word, WordInput } from "../../types";

export function WordForm({
  word,
  onClose,
  onSaved,
}: {
  word: Word | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [english, setEnglish] = useState(word?.english ?? "");
  const [translations, setTranslations] = useState(
    word?.translations.join(", ") ?? "",
  );
  const [part, setPart] = useState(word?.part_of_speech ?? "");
  const [examples, setExamples] = useState<Example[]>(
    word?.examples.length ? word.examples : [{ en: "", ru: "" }],
  );
  const [note, setNote] = useState(word?.note ?? "");
  const [tags, setTags] = useState(word?.tags.join(", ") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const updateExample = (index: number, field: keyof Example, value: string) =>
    setExamples((current) =>
      current.map((example, i) =>
        i === index ? { ...example, [field]: value, source_url: null, license: null, attribution: null } : example,
      ),
    );

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const cleanedExamples = examples.filter(
      (example) => example.en.trim() || example.ru.trim(),
    );
    if (
      cleanedExamples.some(
        (example) => !example.en.trim() || !example.ru.trim(),
      )
    ) {
      setError("У каждого примера нужны и английский текст, и перевод.");
      return;
    }
    const payload: WordInput = {
      english: english.trim(),
      translations: translations
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      examples: cleanedExamples.map((example) => ({
        en: example.en.trim(),
        ru: example.ru.trim(),
        source_url: example.source_url ?? null,
        license: example.license ?? null,
        attribution: example.attribution ?? null,
      })),
      part_of_speech: part.trim() || null,
      note: note.trim() || null,
      tags: tags
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    };
    setBusy(true);
    try {
      if (word) await api.updateWord(word.id, payload);
      else await api.createWord(payload);
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
        className="word-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={word ? "Изменить слово" : "Добавить слово"}
      >
        <div className="modal-head">
          <div>
            <span className="panel-kicker">МОЙ СЛОВАРЬ</span>
            <h2>{word ? "Изменить слово" : "Новое слово"}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={save}>
          <div className="form-grid">
            <label>
              Слово на английском
              <input
                required
                maxLength={200}
                placeholder="e.g. serendipity"
                value={english}
                onChange={(event) => setEnglish(event.target.value)}
              />
            </label>
            <label>
              Часть речи
              <input
                placeholder="noun, verb..."
                value={part}
                onChange={(event) => setPart(event.target.value)}
              />
            </label>
          </div>
          <label>
            Переводы через запятую
            <input
              required
              placeholder="счастливая случайность, удача"
              value={translations}
              onChange={(event) => setTranslations(event.target.value)}
            />
          </label>
          <div className="examples-heading">
            <strong>Примеры использования</strong>
            <button
              type="button"
              onClick={() =>
                setExamples((current) => [...current, { en: "", ru: "" }])
              }
            >
              <Plus size={15} /> Добавить пример
            </button>
          </div>
          {examples.map((example, index) => (
            <div className="example-form-row" key={index}>
              <div className="form-grid">
                <label>
                  Пример на английском
                  <input
                    placeholder="I found it by serendipity."
                    value={example.en}
                    onChange={(event) =>
                      updateExample(index, "en", event.target.value)
                    }
                  />
                </label>
                <label>
                  Перевод примера
                  <input
                    placeholder="Я нашёл это случайно."
                    value={example.ru}
                    onChange={(event) =>
                      updateExample(index, "ru", event.target.value)
                    }
                  />
                </label>
              </div>
              {example.source_url && <a className="example-source" href={example.source_url} target="_blank" rel="noreferrer">
                {example.attribution || "Источник"} · {example.license} ↗
              </a>}
              {examples.length > 1 && (
                <button
                  type="button"
                  className="example-remove"
                  onClick={() =>
                    setExamples((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                  aria-label="Удалить пример"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <label>
            Теги через запятую
            <input
              placeholder="работа, путешествия"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </label>
          <label>
            Заметка
            <textarea
              placeholder="Ассоциация, контекст или нюанс значения"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {error && <div className="alert">{error}</div>}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Отмена
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? "Сохраняем..." : "Сохранить слово"}{" "}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
