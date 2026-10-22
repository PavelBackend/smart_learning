import { ArrowLeft, ArrowRight, Check, Clock3, Moon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { ReportSteps, reportSteps } from "../components/reports/ReportSteps";
import { clearDraft, readDraft, saveDraft } from "../features/reports/draft";
import type { Report, ReportInput } from "../types";
import { formatReportDate, localDay, localTimezone } from "../utils/localTime";

type Values = Omit<ReportInput, "timezone">;

function emptyValues(): Values {
  return {
    mood: null,
    thoughts: null,
    highlight: null,
    english_minutes: null,
    english_details: null,
    reviewed_words: null,
    sports_minutes: null,
    sports_activity: null,
    exercises: [],
  };
}

function valuesFromReport(report: Report): Values {
  const { timezone: _timezone, report_date: _date, created_at: _created, updated_at: _updated, ...values } = report;
  return values;
}

export function DailyReport() {
  const [search] = useSearchParams();
  const requestedDate = search.get("date");
  const today = localDay();
  const date = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && requestedDate <= today
    ? requestedDate
    : today;
  const [values, setValues] = useState<Values>(emptyValues);
  const [step, setStep] = useState(0);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [draftActive, setDraftActive] = useState(false);
  const [existing, setExisting] = useState(false);
  const [todayWords, setTodayWords] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    api.report(date)
      .then((report) => {
        if (!active) return;
        const draft = readDraft(date);
        setValues(draft?.values ?? valuesFromReport(report));
        setStep(Math.max(0, Math.min(3, draft?.step ?? 0)));
        setDraftActive(Boolean(draft));
        setExisting(true);
        setLoadedDate(date);
        setError("");
      })
      .catch((failure: Error) => {
        if (!active) return;
        if (!(failure instanceof ApiError) || failure.status !== 404) {
          setError(failure.message);
          return;
        }
        const draft = readDraft(date);
        setValues(draft?.values ?? emptyValues());
        setStep(Math.max(0, Math.min(3, draft?.step ?? 0)));
        setDraftActive(Boolean(draft));
        setExisting(false);
        setLoadedDate(date);
        setError("");
      });
    return () => { active = false; };
  }, [date]);

  useEffect(() => {
    if (date !== today) {
      setTodayWords(null);
      return;
    }
    api.insights().then((result) => setTodayWords(result.today_words)).catch(() => setTodayWords(null));
  }, [date, today]);

  useEffect(() => {
    if (loadedDate === date && draftActive) saveDraft({ date, step, values });
  }, [date, draftActive, loadedDate, step, values]);

  const change = (patch: Partial<Values>) => {
    setValues((current) => ({ ...current, ...patch }));
    setDraftActive(true);
    setNotice("");
  };
  const goToStep = (next: number) => {
    setStep(next);
    setDraftActive(true);
    setNotice("");
  };

  const finish = async () => {
    setSaving(true);
    setError("");
    try {
      await api.saveReport(date, {
        ...values,
        exercises: values.exercises.filter((exercise) => exercise.name.trim()),
        timezone: localTimezone(),
      });
      clearDraft(date);
      setDraftActive(false);
      setExisting(true);
      setNotice("Запись сохранена. К ней можно вернуться в любой момент.");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="journal-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> ЛИЧНЫЕ ЗАПИСИ</div>
          <h1>Мой день <span className="heading-star">✦</span></h1>
          <p>Несколько спокойных минут, чтобы заметить главное.</p>
        </div>
      </div>
      <div className="journal-layout">
        <section className="journal-main">
          <div className="journal-hero">
            <div>
              <span><Moon size={15} /> ВЕЧЕРНИЙ РИТУАЛ</span>
              <h2>{formatReportDate(date)}</h2>
              <p>{existing ? "Можно дополнить или изменить запись." : "Сохраним то, из чего сложился этот день."}</p>
            </div>
            <div className="journal-hero-orb">✳</div>
          </div>
          <div className="journal-progress" aria-label="Этапы отчёта">
            {reportSteps.map((label, index) => (
              <button
                type="button"
                key={label}
                className={index === step ? "active" : index < step ? "done" : ""}
                onClick={() => goToStep(index)}
                disabled={loadedDate !== date}
                aria-current={index === step ? "step" : undefined}
              >
                <span>{index < step ? <Check size={14} /> : String(index + 1).padStart(2, "0")}</span>
                {label}
              </button>
            ))}
          </div>
          <div className="journal-form-card">
            {loadedDate === date ? (
              <ReportSteps key={step} step={step} values={values} onChange={change} todayWords={todayWords} />
            ) : (
              <div className="journal-loading">Загружаем запись...</div>
            )}
            {error && <div className="alert">{error}</div>}
            {notice && <div className="success-message"><Check size={17} /> {notice} <Link to={`/journal/report/${date}`}>Открыть отчёт</Link></div>}
            <div className="journal-actions">
              <span><Clock3 size={15} /> Черновик сохраняется автоматически</span>
              <div>
                {step > 0 && <button type="button" className="journal-back" onClick={() => goToStep(step - 1)}><ArrowLeft size={17} /> Назад</button>}
                {step < 3 ? (
                  <button type="button" className="primary-button" disabled={loadedDate !== date} onClick={() => goToStep(step + 1)}>Дальше <ArrowRight size={17} /></button>
                ) : (
                  <button type="button" className="primary-button" disabled={saving || loadedDate !== date} onClick={() => void finish()}>{saving ? "Сохраняем..." : "Завершить запись"} <Check size={17} /></button>
                )}
              </div>
            </div>
          </div>
        </section>
        <aside className="journal-aside">
          <div className="journal-aside-card">
            <Sparkles size={22} />
            <span className="panel-kicker">МАЛЕНЬКИЙ ШАГ</span>
            <h3>Каждый день по-своему важен.</h3>
            <p>Все поля можно оставить пустыми. Запись сохраняется только после кнопки «Завершить запись».</p>
          </div>
          <Link className="journal-calendar-link" to="/journal">Смотреть календарь <ArrowRight size={15} /></Link>
        </aside>
      </div>
    </div>
  );
}
