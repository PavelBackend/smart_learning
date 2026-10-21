import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Pencil,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { WordForm } from "../components/dictionary/WordForm";
import { AnswerFeedback } from "../components/practice/AnswerFeedback";
import { CohortPanel } from "../components/practice/CohortPanel";
import { PronunciationButton } from "../components/practice/PronunciationButton";
import type { AnswerResult, Cohort, Direction, Question, Word } from "../types";

export function Practice() {
  const [direction, setDirection] = useState<Direction>("en_ru");
  const [question, setQuestion] = useState<Question | null>(null);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [editing, setEditing] = useState<Word | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const refreshCohort = async () => setCohort(await api.cohort());

  const loadQuestion = async (selected: Direction) => {
    setBusy(true);
    setError("");
    setResult(null);
    setAnswer("");
    try {
      setQuestion(await api.next(selected));
    } catch (e) {
      setQuestion(null);
      if (!(e instanceof ApiError && (e.status === 404 || e.status === 409))) {
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };
  useEffect(() => {
    void refreshCohort().catch((e) => setError((e as Error).message));
    void loadQuestion(direction);
  }, [direction]);
  useEffect(() => {
    if (result && !editing) window.setTimeout(() => nextRef.current?.focus(), 0);
  }, [result, editing]);

  const startCohort = async (count: number) => {
    setBusy(true);
    setError("");
    try {
      setCohort(await api.startCohort(count));
      await loadQuestion(direction);
    } catch (e) { setError(e instanceof ApiError && e.status === 422 && count === 0 ? "Укажи количество слов больше нуля" : (e as Error).message); }
    finally { setBusy(false); }
  };

  const expandCohort = async (count: number) => {
    setBusy(true);
    setError("");
    try {
      setCohort(await api.expandCohort(count));
      await loadQuestion(direction);
    } catch (e) { setError(e instanceof ApiError && e.status === 422 && count === 0 ? "Укажи количество слов больше нуля" : (e as Error).message); }
    finally { setBusy(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!question || !answer.trim() || busy || result) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.answer(
        question.word_id,
        direction,
        answer.trim(),
      );
      setResult(response);
      setDone((value) => value + 1);
      if (response.correct) setCorrect((value) => value + 1);
      await refreshCohort();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!result || busy) return;
    setBusy(true);
    try {
      const updated = await api.acceptAttempt(result.attempt_id);
      if (!result.correct && updated.correct) setCorrect((value) => value + 1);
      setResult(updated);
      await refreshCohort();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const openEdit = async () => {
    if (!question) return;
    setBusy(true);
    try { setEditing(await api.word(question.word_id)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const afterEdit = async () => {
    setEditing(null);
    if (!result) { await loadQuestion(direction); return; }
    try {
      const updated = await api.recheckAttempt(result.attempt_id);
      if (result.correct !== updated.correct) setCorrect((value) => value + (updated.correct ? 1 : -1));
      setResult(updated);
      if (question) {
        const word = await api.word(question.word_id);
        setQuestion({ ...question, english: word.english, prompt: direction === "en_ru" ? word.english : word.translations[0] });
      }
      await refreshCohort();
    } catch (e) { setError((e as Error).message); }
  };
  const remove = async () => {
    if (!question || busy || !window.confirm(`Удалить «${question.english}» из словаря и из результатов?`)) return;
    setBusy(true);
    try {
      await api.deletePracticeWord(question.word_id);
      if (result) {
        setDone((value) => Math.max(0, value - 1));
        if (result.correct) setCorrect((value) => Math.max(0, value - 1));
      }
      await refreshCohort();
      await loadQuestion(direction);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-heading practice-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> МАЛЕНЬКИЕ ШАГИ К БОЛЬШОЙ ЦЕЛИ
          </div>
          <h1>
            Практика слов <span className="heading-star">✳</span>
          </h1>
          <p>Переводи, проверяй себя и двигайся дальше в своём ритме.</p>
        </div>
        <Link to="/" className="back-link">
          <ArrowLeft size={17} /> На главную
        </Link>
      </div>
      <CohortPanel cohort={cohort} busy={busy} onStart={startCohort} onExpand={expandCohort} />
      <div className="practice-layout">
        <section className="practice-main">
          <div className="mode-row">
            <div>
              <span className="panel-kicker">НАПРАВЛЕНИЕ ПЕРЕВОДА</span>
              <h3>Выбери режим</h3>
            </div>
            <div className="mode-switch">
              <button
                className={direction === "en_ru" ? "selected" : ""}
                onClick={() => setDirection("en_ru")}
              >
                EN <ArrowRight size={14} /> RU
              </button>
              <button
                className={direction === "ru_en" ? "selected" : ""}
                onClick={() => setDirection("ru_en")}
              >
                RU <ArrowRight size={14} /> EN
              </button>
            </div>
          </div>
          {question ? (
            <div className="question-card">
              <div className="question-top">
                <span>
                  <span className="question-dot" /> КАРТОЧКА СЛОВА
                </span>
                <span>Уровень {question.stage + 1} / 7</span>
              </div>
              <div className="question-center">
                <div className="question-label">
                  Переведи на {direction === "en_ru" ? "русский" : "английский"}
                </div>
                <div className="question-word-row"><h2>{question.prompt}</h2>
                  {(direction === "en_ru" || result) && <PronunciationButton wordId={question.word_id} english={question.english} />}
                </div>
                {question.part_of_speech && (
                  <span className="part-chip">{question.part_of_speech}</span>
                )}
              </div>
              <div className="question-bottom">
                <span>Не торопись — вспомни слово сам.</span>
                <span className="decorative-asterisk">✳</span>
              </div>
            </div>
          ) : (
            <div className="question-card empty-question">
              <Sparkles size={34} />
              <h2>{busy ? "Ищем слово..." : cohort?.count ? "Пока нечего повторять" : "Выбери первую подборку"}</h2>
              <p>{cohort?.count ? (direction === "en_ru" && cohort.due_ru_en > 0 || direction === "ru_en" && cohort.due_en_ru > 0 ? "Есть карточки в другом направлении — переключи режим выше." : cohort.can_add ? "Повторы отложены. Можно добавить новые слова в подборку." : "Карточки вернутся, когда наступит время повтора.") : "Укажи количество слов выше, чтобы начать."}</p>
            </div>
          )}
          {question && (
            <form className="answer-panel" onSubmit={submit}>
              <label htmlFor="answer">Твой перевод</label>
              <div className="answer-input-wrap">
                <input
                  ref={inputRef}
                  id="answer"
                  autoFocus
                  placeholder={
                    direction === "en_ru"
                      ? "Напиши перевод на русском..."
                      : "Type the English word..."
                  }
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  disabled={!!result || busy}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!!result || busy || !answer.trim()}
                  aria-label="Проверить ответ"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
              <span className="input-hint">
                Нажми Enter, чтобы проверить ответ
              </span>
              {result && <AnswerFeedback result={result} />}
              {result && (
                <div className="answer-actions">
                  {!result.correct && <button type="button" className="secondary-button" onClick={() => void accept()} disabled={busy}>Мой ответ верный</button>}
                  <button ref={nextRef} type="button" className="next-button" onClick={() => void loadQuestion(direction)}>
                    Следующее слово <ArrowRight size={18} />
                  </button>
                </div>
              )}
              <div className="practice-word-actions">
                <button type="button" onClick={() => void openEdit()} disabled={busy}><Pencil size={15} /> Исправить слово</button>
                <button type="button" onClick={() => void remove()} disabled={busy}><Trash2 size={15} /> Удалить слово</button>
              </div>
            </form>
          )}
          {error && <div className="alert">{error}</div>}
        </section>
        <aside className="practice-aside">
          <div className="session-card">
            <div className="session-icon">
              <Sparkles size={22} />
            </div>
            <span className="panel-kicker">ЭТА СЕССИЯ</span>
            <h3>
              Твой маленький
              <br />
              прогресс сегодня
            </h3>
            <div className="session-stats">
              <div>
                <strong>{done}</strong>
                <span>ответов</span>
              </div>
              <div>
                <strong>{correct}</strong>
                <span>верных</span>
              </div>
            </div>
            <div className="session-line">
              <div style={{ width: `${done ? (correct / done) * 100 : 0}%` }} />
            </div>
            <p>
              {done
                ? "Продолжай — каждое повторение помогает."
                : "Начни с одного слова. Всё остальное придёт."}
            </p>
          </div>
          <div className="practice-note">
            <div>
              <CheckCircle2 size={20} />
            </div>
            <strong>Как это работает?</strong>
            <p>
              Правильный ответ увеличивает интервал до следующего повторения.
              Ошибка возвращает слово в ближайшие задания.
            </p>
          </div>
          {question && <button
            className="reset-link"
            onClick={() => void loadQuestion(direction)}
          >
            <RotateCcw size={16} /> Другое слово
          </button>}
        </aside>
      </div>
      {editing && <WordForm word={editing} onClose={() => setEditing(null)} onSaved={() => void afterEdit()} />}
    </>
  );
}
