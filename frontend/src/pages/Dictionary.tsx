import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Direction, Example, Progress, Word, WordInput } from "../types";

const stageLabels = [
  "Новое · сегодня",
  "Уровень 2 · завтра",
  "Уровень 3 · через 3 дня",
  "Уровень 4 · через 7 дней",
  "Уровень 5 · через 14 дней",
  "Уровень 6 · через 30 дней",
  "Усвоено · через 60 дней",
];
const wordCountLabel = (count: number) =>
  count % 10 === 1 && count % 100 !== 11
    ? "слово"
    : count % 10 >= 2 &&
        count % 10 <= 4 &&
        (count % 100 < 12 || count % 100 > 14)
      ? "слова"
      : "слов";

function WordForm({
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
        i === index ? { ...example, [field]: value } : example,
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

function ProgressForm({
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

export function Dictionary() {
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Word | "new" | null>(null);
  const [grading, setGrading] = useState<Word | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = () =>
    Promise.all([api.words(), api.progress()])
      .then(([wordsResponse, progressResponse]) => {
        setWords(wordsResponse.items);
        setProgress(progressResponse.items);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void reload();
  }, []);
  const filtered = words.filter((word) =>
    `${word.english} ${word.translations.join(" ")} ${word.tags.join(" ")}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  const remove = async (word: Word) => {
    if (!window.confirm(`Удалить «${word.english}» из словаря?`)) return;
    setBusy(true);
    try {
      await api.deleteWord(word.id);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    try {
      const data = await api.exportWords();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "wordwell-words.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> СЛОВА, КОТОРЫЕ ТВОИ
          </div>
          <h1>
            Мой словарь <span className="heading-star">✳</span>
          </h1>
          <p>Собирай слова, к которым хочется возвращаться.</p>
        </div>
        <button
          className="primary-button heading-button"
          onClick={() => setEditing("new")}
        >
          <Plus size={18} /> Добавить слово
        </button>
      </div>
      <div className="dictionary-summary">
        <div className="dictionary-summary-icon">
          <BookOpen size={26} />
        </div>
        <div>
          <span>ТВОЯ КОЛЛЕКЦИЯ</span>
          <strong>
            {words.length} {wordCountLabel(words.length)} на пути к свободной
            речи
          </strong>
        </div>
        <div className="dictionary-summary-decor">Aa</div>
      </div>
      <div className="dictionary-toolbar">
        <div className="search-box">
          <Search size={19} />
          <input
            placeholder="Найти слово или перевод..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          <button className="secondary-button" onClick={() => void download()}>
            <ArrowDownToLine size={17} /> Экспорт
          </button>
          <Link to="/import" className="secondary-button">
            Импорт JSON <ArrowRight size={17} />
          </Link>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {filtered.length ? (
        <div className="word-grid">
          {filtered.map((word, index) => {
            const stages = progress.filter((row) => row.word_id === word.id);
            const stage = stages.length
              ? Math.round(
                  stages.reduce((sum, row) => sum + row.stage, 0) /
                    stages.length,
                )
              : 0;
            return (
              <article className="dictionary-card" key={word.id}>
                <div className="dictionary-card-top">
                  <span className={`word-avatar avatar-${index % 4}`}>
                    {word.english.slice(0, 1).toUpperCase()}
                  </span>
                  <button
                    className={`stage-chip ${stage >= 4 ? "stage-high" : ""}`}
                    onClick={() => setGrading(word)}
                    title="Изменить уровень изученности"
                  >
                    {stage >= 4
                      ? "Усвоено"
                      : stage
                        ? `Уровень ${stage + 1}`
                        : "Новое"}{" "}
                    <Pencil size={11} />
                  </button>
                </div>
                <div className="dictionary-word">
                  <h3>{word.english}</h3>
                  {word.part_of_speech && <span>{word.part_of_speech}</span>}
                </div>
                <p className="dictionary-translation">
                  {word.translations.join(" · ")}
                </p>
                {word.examples[0] && (
                  <div className="dictionary-example">
                    “{word.examples[0].en}”
                  </div>
                )}
                <div className="dictionary-card-bottom">
                  <div>
                    {word.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => setEditing(word)}
                      aria-label={`Изменить ${word.english}`}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      onClick={() => void remove(word)}
                      disabled={busy}
                      aria-label={`Удалить ${word.english}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="dictionary-empty">
          <div className="empty-illustration">
            Aa<span>✳</span>
          </div>
          <h2>{search ? "Ничего не найдено" : "Словарь ждёт первого слова"}</h2>
          <p>
            {search
              ? "Попробуй другой запрос."
              : "Добавь слово вручную или импортируй сразу целую подборку."}
          </p>
          {!search && (
            <Link to="/import" className="primary-button">
              Импортировать слова <ArrowRight size={18} />
            </Link>
          )}
        </div>
      )}
      {editing && (
        <WordForm
          word={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
      {grading && (
        <ProgressForm
          word={grading}
          progress={progress}
          onClose={() => setGrading(null)}
          onSaved={() => {
            setGrading(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
