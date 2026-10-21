import { ArrowRight, Moon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { pendingDraft, snooze, snoozed } from "../../features/reports/draft";
import { formatReportDate, localDay } from "../../utils/localTime";

export function DayPrompt() {
  const [now, setNow] = useState(new Date());
  const [completed, setCompleted] = useState<Set<string> | null>(null);

  useEffect(() => {
    let active = true;
    api.reports().then(({ items }) => {
      if (active) setCompleted(new Set(items.map((report) => report.report_date)));
    }).catch(() => {
      if (active) setCompleted(new Set());
    });
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  if (!completed) return null;
  const draft = pendingDraft(completed, now);
  const today = localDay(now);
  const date = draft?.date ?? today;
  const shouldOfferToday = now.getHours() >= 20 && !completed.has(today);
  if ((!draft && !shouldOfferToday) || snoozed(date, now)) return null;

  return (
    <section className="day-prompt">
      <div className="day-prompt-icon"><Moon size={22} /></div>
      <div>
        <span>{draft ? "НЕЗАВЕРШЁННАЯ ЗАПИСЬ" : "ВРЕМЯ ПОДВЕСТИ ИТОГ"}</span>
        <h2>{draft ? `Вернись к записи за ${formatReportDate(date)}` : "Как прошёл твой день?"}</h2>
        <p>{draft ? "Твой черновик ждёт тебя. Его можно закончить сегодня." : "Вспомни главное, отметь английский и тренировку."}</p>
      </div>
      <Link to={`/journal?date=${date}`} className="day-prompt-link">
        {draft ? "Продолжить" : "Записать день"} <ArrowRight size={17} />
      </Link>
      <button
        type="button"
        className="day-prompt-close"
        aria-label="Напомнить позже"
        title="Напомнить через два часа"
        onClick={() => { snooze(date, now); setNow(new Date()); }}
      >
        <X size={17} />
      </button>
    </section>
  );
}
