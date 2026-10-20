import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AnswerResult, Direction, Question } from "../types";

export function Practice() {
  const [direction, setDirection] = useState<Direction>("en_ru");
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadQuestion = async (selected: Direction) => {
    setBusy(true);
    setError("");
    setResult(null);
    setAnswer("");
    try {
      setQuestion(await api.next(selected));
    } catch (e) {
      setQuestion(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };
  useEffect(() => {
    void loadQuestion(direction);
  }, [direction]);

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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
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
                <h2>{question.prompt}</h2>
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
              <h2>{busy ? "Ищем слово..." : "Пока нет слов для практики"}</h2>
              <p>Добавь слова в словарь, чтобы начать.</p>
              <Link to="/import" className="primary-button">
                Добавить слова <ArrowRight size={18} />
              </Link>
            </div>
          )}
          {question && (
            <form className="answer-panel" onSubmit={submit}>
              <label htmlFor="answer">Твой перевод</label>
              <div className="answer-input-wrap">
                <input
                  ref={inputRef}
                  id="answer"
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
              {result && (
                <div
                  className={`result-card ${result.correct ? "result-good" : "result-wrong"}`}
                >
                  <div className="result-icon">
                    {result.correct ? <Check size={20} /> : <X size={20} />}
                  </div>
                  <div>
                    <strong>
                      {result.correct
                        ? "Верно! Отличная работа."
                        : "Почти! Запомним вместе."}
                    </strong>
                    <p>
                      Правильный ответ: <b>{result.accepted.join(" · ")}</b>
                    </p>
                    {result.example && (
                      <div className="example-quote">
                        <em>“{result.example.en}”</em>
                        <span>{result.example.ru}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {result && (
                <button
                  type="button"
                  className="next-button"
                  onClick={() => void loadQuestion(direction)}
                >
                  Следующее слово <ArrowRight size={18} />
                </button>
              )}
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
          <button
            className="reset-link"
            onClick={() => void loadQuestion(direction)}
          >
            <RotateCcw size={16} /> Другое слово
          </button>
        </aside>
      </div>
    </>
  );
}
