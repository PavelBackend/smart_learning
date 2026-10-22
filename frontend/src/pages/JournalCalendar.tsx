import { ArrowRight, ChevronLeft, ChevronRight, NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Report } from "../types";
import { localDay } from "../utils/localTime";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function JournalCalendar() {
  const today = localDay();
  const [month, setMonth] = useState(() => new Date());
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthTitle = `${new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(month)} ${year}`;
  const byDay = new Map(reports.map((report) => [report.report_date, report]));
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.reportMonth(year, monthIndex + 1).then((response) => {
      if (active) { setReports(response.items); setError(""); }
    }).catch((failure: Error) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year, monthIndex]);

  const move = (delta: number) => setMonth(new Date(year, monthIndex + delta, 1));
  return <div className="calendar-page">
    <div className="page-heading"><div>
      <div className="eyebrow"><span className="eyebrow-line" /> ЗАПИСИ ПО ДНЯМ</div>
      <h1>Мой дневник <span className="heading-star">✦</span></h1>
      <p>Смотри, из чего складывались твои дни.</p>
    </div><Link className="primary-button heading-button" to={`/journal/new?date=${today}`}><NotebookPen size={17} /> Записать сегодня</Link></div>
    <section className="calendar-card">
      <div className="calendar-heading">
        <div><span className="panel-kicker">ТВОЙ КАЛЕНДАРЬ</span><h2>{monthTitle}</h2></div>
        <div className="calendar-controls">
          <button aria-label="Предыдущий месяц" onClick={() => move(-1)}><ChevronLeft size={20} /></button>
          <button onClick={() => setMonth(new Date())}>Сегодня</button>
          <button aria-label="Следующий месяц" onClick={() => move(1)}><ChevronRight size={20} /></button>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="calendar-grid">
        {weekdays.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
        {Array.from({ length: offset }, (_, index) => <span className="calendar-gap" key={`gap-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
          const report = byDay.get(date);
          const future = date > today;
          return report ? <Link className={`calendar-day has-report ${date === today ? "is-today" : ""}`} key={date} to={`/journal/report/${date}`}>
            <strong>{index + 1}</strong><i />
            <span>{report.highlight || report.thoughts || "Запись за день"}</span>
          </Link> : future ? <div className="calendar-day future" key={date}><strong>{index + 1}</strong></div>
            : <Link className={`calendar-day ${date === today ? "is-today" : ""}`} key={date} to={`/journal/new?date=${date}`}>
              <strong>{index + 1}</strong><span className="calendar-add">+ Добавить</span>
            </Link>;
        })}
      </div>
      <div className="calendar-footer"><span>{loading ? "Загружаем записи…" : `${reports.length} записей в этом месяце`}</span><span><i /> День с записью</span></div>
    </section>
    <div className="calendar-note"><NotebookPen size={21} /><div><strong>История остаётся под рукой</strong><p>Нажми на день с отметкой, чтобы открыть отчёт. Пустой день можно заполнить позже.</p></div><ArrowRight size={18} /></div>
  </div>;
}
