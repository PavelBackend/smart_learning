import { ArrowDownToLine, ArrowRight, BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ProgressForm } from "../components/dictionary/ProgressForm";
import { WordForm } from "../components/dictionary/WordForm";
import type { Progress, Word } from "../types";

const wordCountLabel = (count: number) =>
  count % 10 === 1 && count % 100 !== 11
    ? "слово"
    : count % 10 >= 2 &&
        count % 10 <= 4 &&
        (count % 100 < 12 || count % 100 > 14)
      ? "слова"
      : "слов";

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
