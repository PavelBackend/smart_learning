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
import { ConfirmDeleteDialog } from "../components/ConfirmDeleteDialog";
import { WordForm } from "../components/dictionary/WordForm";
import { AnswerFeedback } from "../components/practice/AnswerFeedback";
import { CohortPanel } from "../components/practice/CohortPanel";
import { PronunciationButton } from "../components/practice/PronunciationButton";
import { RoundSummary } from "../components/practice/RoundSummary";
import type { AnswerResult, Cohort, Direction, Question, Word } from "../types";

export function Practice() {
  const [direction, setDirection] = useState<Direction>("en_ru");
  const [question, setQuestion] = useState<Question | null>(null);
  const [deck, setDeck] = useState<Question[]>([]);
  const [position, setPosition] = useState(0);
  const [roundAnswers, setRoundAnswers] = useState<boolean[]>([]);
  const [previousPercent, setPreviousPercent] = useState<number | null>(null);
  const [retry, setRetry] = useState(false);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [editing, setEditing] = useState<Word | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const refreshCohort = async () => setCohort(await api.cohort());

  const loadRound = async (selected: Direction) => {
    setBusy(true);
    setError("");
    setResult(null);
    setAnswer("");
    try {
      const response = await api.round(selected);
      setDeck(response.items);
      setPosition(0);
      setRoundAnswers([]);
      setPreviousPercent(null);
      setRetry(false);
      setQuestion(response.items[0] ?? null);
    } catch (e) {
      setQuestion(null);
      setDeck([]);
      if (!(e instanceof ApiError && (e.status === 404 || e.status === 409))) {
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void refreshCohort().catch((e) => setError((e as Error).message));
    void loadRound(direction);
  }, [direction]);
  useEffect(() => {
    if (!question || busy || result || editing) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [question, busy, result, editing]);
  useEffect(() => {
    if (result && !editing) window.setTimeout(() => nextRef.current?.focus(), 0);
  }, [result, editing]);

  const startCohort = async (count: number) => {
    setBusy(true);
    setError("");
    try {
      setCohort(await api.startCohort(count));
      await loadRound(direction);
    } catch (e) { setError(e instanceof ApiError && e.status === 422 && count === 0 ? "Укажи количество слов больше нуля" : (e as Error).message); }
    finally { setBusy(false); }
  };

  const expandCohort = async (count: number) => {
    setBusy(true);
    setError("");
    try {
      setCohort(await api.expandCohort(count));
      await loadRound(direction);
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
        retry,
      );
      setResult(response);
      setRoundAnswers((current) => { const updated = [...current]; updated[position] = response.correct; return updated; });
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
      const updated = result.attempt_id
        ? await api.acceptAttempt(result.attempt_id)
        : { ...result, correct: true };
      if (!result.correct && updated.correct) setCorrect((value) => value + 1);
      setResult(updated);
      setRoundAnswers((current) => { const answers = [...current]; answers[position] = updated.correct; return answers; });
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
    if (!result) { await loadRound(direction); return; }
    try {
      const updated = result.attempt_id
        ? await api.recheckAttempt(result.attempt_id)
        : await api.answer(question!.word_id, direction, answer.trim(), true);
      if (result.correct !== updated.correct) setCorrect((value) => value + (updated.correct ? 1 : -1));
      setResult(updated);
      setRoundAnswers((current) => { const answers = [...current]; answers[position] = updated.correct; return answers; });
      if (question) {
        const word = await api.word(question.word_id);
        const updatedQuestion = { ...question, english: word.english,
          prompt: direction === "en_ru" ? word.english : word.translations[0] };
        setQuestion(updatedQuestion);
        setDeck((current) => current.map((item) => item.word_id === question.word_id ? updatedQuestion : item));
      }
      await refreshCohort();
    } catch (e) { setError((e as Error).message); }
  };
  const remove = async () => {
    if (!question || busy) return;
    setBusy(true);
    try {
      await api.deletePracticeWord(question.word_id);
      setConfirmDelete(false);
      if (result) {
        setDone((value) => Math.max(0, value - 1));
        if (result.correct) setCorrect((value) => Math.max(0, value - 1));
      }
      await refreshCohort();
      const remaining = deck.filter((item) => item.word_id !== question.word_id);
      const nextPosition = Math.min(position, remaining.length);
      setDeck(remaining);
      setPosition(nextPosition);
      setRoundAnswers((current) => current.filter((_, index) => index !== position));
      setQuestion(remaining[nextPosition] ?? null);
      setResult(null);
      setAnswer("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const advance = () => {
    const nextPosition = position + 1;
    setPosition(nextPosition);
    setQuestion(deck[nextPosition] ?? null);
    setResult(null);
    setAnswer("");
  };
  const retryRound = () => {
    setPreviousPercent(deck.length ? Math.round(roundAnswers.filter(Boolean).length / deck.length * 100) : 0);
    setRetry(true);
    setPosition(0);
    setRoundAnswers([]);
    setQuestion(deck[0] ?? null);
    setResult(null);
    setAnswer("");
  };
  const finished = deck.length > 0 && position >= deck.length;

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
          {deck.length > 0 && !finished && <div className="round-progress">
            <span>Круг {retry ? "· повтор" : "· первый проход"}</span>
            <strong>{position + 1} / {deck.length}</strong>
            <div><i style={{ width: `${position / deck.length * 100}%` }} /></div>
          </div>}
          {finished ? <RoundSummary total={deck.length} correct={roundAnswers.filter(Boolean).length}
            previous={previousPercent} onRetry={retryRound} onNewRound={() => void loadRound(direction)} /> : question ? (
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
                  <button ref={nextRef} type="button" className="next-button" onClick={advance}>
                    {position + 1 === deck.length ? "Завершить круг" : "Следующее слово"} <ArrowRight size={18} />
                  </button>
                </div>
              )}
              <div className="practice-word-actions">
                <button type="button" onClick={() => void openEdit()} disabled={busy}><Pencil size={15} /> Исправить слово</button>
                <button type="button" onClick={() => { setError(""); setConfirmDelete(true); }} disabled={busy}><Trash2 size={15} /> Удалить слово</button>
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
            onClick={() => void loadRound(direction)}
          >
            <RotateCcw size={16} /> Начать круг заново
          </button>}
        </aside>
      </div>
      {editing && <WordForm word={editing} onClose={() => setEditing(null)} onSaved={() => void afterEdit()} />}
      {confirmDelete && question && <ConfirmDeleteDialog word={question.english} busy={busy} error={error}
        onCancel={() => setConfirmDelete(false)} onConfirm={() => void remove()} />}
    </>
  );
}
