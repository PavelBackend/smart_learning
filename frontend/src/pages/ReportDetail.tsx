import { ArrowLeft, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Report } from "../types";
import { formatReportDate } from "../utils/localTime";

export function ReportDetail() {
  const { date = "" } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.report(date).then((value) => { if (active) setReport(value); })
      .catch((failure: Error) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [date]);
  return <div className="report-detail-page">
    <div className="page-heading"><div>
      <div className="eyebrow"><span className="eyebrow-line" /> СТРАНИЦА ДНЕВНИКА</div>
      <h1>{date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatReportDate(date) : "Мой день"}</h1>
      <p>Твой отчёт за этот день.</p>
    </div><Link className="back-link" to="/journal"><ArrowLeft size={17} /> К календарю</Link></div>
    {error && <div className="alert">{error}</div>}
    {report && <article className="report-detail-card">
      <div className="report-detail-top"><span className="panel-kicker">ЗАПИСЬ СОХРАНЕНА</span><Link className="secondary-button" to={`/journal/new?date=${date}`}><Pencil size={16} /> Изменить</Link></div>
      {report.mood && <span className="report-mood">{({great:"✦ Отлично",good:"◒ Хорошо",okay:"◌ Спокойно",low:"☾ Непросто"})[report.mood]}</span>}
      {report.thoughts && <section><span>МЫСЛИ</span><p>{report.thoughts}</p></section>}
      {report.highlight && <section><span>ЧТО ПОЛУЧИЛОСЬ</span><p>{report.highlight}</p></section>}
      {(report.english_minutes !== null || report.reviewed_words !== null || report.english_details) && <section>
        <span>АНГЛИЙСКИЙ</span><div className="report-detail-metrics">
          {report.english_minutes !== null && <strong>{report.english_minutes} мин</strong>}
          {report.reviewed_words !== null && <strong>{report.reviewed_words} слов</strong>}
        </div>{report.english_details && <p>{report.english_details}</p>}
      </section>}
      {(report.sports_activity || report.sports_minutes !== null || report.exercises.length > 0) && <section>
        <span>ДВИЖЕНИЕ</span><div className="report-detail-metrics">
          {report.sports_activity && <strong>{report.sports_activity}</strong>}
          {report.sports_minutes !== null && <strong>{report.sports_minutes} мин</strong>}
        </div>{report.exercises.map((exercise, index) => <p key={index}>{exercise.name}{exercise.sets ? ` · ${exercise.sets} подхода` : ""}{exercise.repetitions ? ` × ${exercise.repetitions}` : ""}</p>)}
      </section>}
      {!report.thoughts && !report.highlight && !report.english_details && !report.sports_activity && report.english_minutes === null && report.sports_minutes === null && report.reviewed_words === null && report.exercises.length === 0 && <p>Этот день сохранён без подробностей.</p>}
    </article>}
  </div>;
}
