import { ArrowDownToLine, ArrowRight, BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ProgressForm } from "../components/dictionary/ProgressForm";
import { WordForm } from "../components/dictionary/WordForm";
import { levelClass, levelName } from "../components/dictionary/levels";
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
  const pageSize = 24;
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [collectionTotal, setCollectionTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Word | "new" | null>(null);
  const [grading, setGrading] = useState<Word | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      api.words(search.trim(), pageSize, page * pageSize)
        .then(async (response) => {
          if (response.total > 0 && page * pageSize >= response.total) {
            if (!cancelled) setPage(Math.ceil(response.total / pageSize) - 1);
            return;
          }
          const rows = await api.progressForWords(response.items.map((word) => word.id));
          if (cancelled) return;
          setWords(response.items);
          setProgress(rows.items);
          setTotal(response.total);
          if (!search.trim()) setCollectionTotal(response.total);
          setError("");
        })
        .catch((e) => { if (!cancelled) setError((e as Error).message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, search ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search, page, reloadKey]);
  const reload = () => setReloadKey((value) => value + 1);
  const remove = async (word: Word) => {
    if (!window.confirm(`Удалить «${word.english}» из словаря?`)) return;
    setBusy(true);
    try {
      await api.deletePracticeWord(word.id);
      if (words.length === 1 && page > 0) setPage((value) => value - 1);
      else reload();
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
            {collectionTotal} {wordCountLabel(collectionTotal)} на пути к свободной
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
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
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
      {words.length ? (
        <div className="word-grid">
          {words.map((word, index) => {
            const stages = progress.filter((row) => row.word_id === word.id);
            const stage = Math.min(
              stages.find((row) => row.direction === "en_ru")?.stage ?? 0,
              stages.find((row) => row.direction === "ru_en")?.stage ?? 0,
            );
            return (
              <article className="dictionary-card" key={word.id}>
                <div className="dictionary-card-top">
                  <span className={`word-avatar avatar-${index % 4}`}>
                    {word.english.slice(0, 1).toUpperCase()}
                  </span>
                  <button
                    className={`stage-chip ${levelClass(stage)}`}
                    onClick={() => setGrading(word)}
                    title="Изменить уровень изученности"
                  >
                    {levelName(stage)}{" "}
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
      ) : !loading ? (
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
      ) : <div className="dictionary-empty">Загружаем слова…</div>}
      {total > pageSize && <nav className="dictionary-pagination" aria-label="Страницы словаря">
        <button className="secondary-button" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}>← Назад</button>
        <span>Страница {page + 1} из {Math.ceil(total / pageSize)} · {total} {wordCountLabel(total)}</span>
        <button className="secondary-button" disabled={(page + 1) * pageSize >= total || loading} onClick={() => setPage((value) => value + 1)}>Далее →</button>
      </nav>}
      {editing && (
        <WordForm
          word={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
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
            reload();
          }}
        />
      )}
    </>
  );
}
