import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Flame,
  GraduationCap,
  Languages,
  NotebookPen,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { MetricCard } from "../components/MetricCard";
import { DayPrompt } from "../components/reports/DayPrompt";
import type { Insights, PracticeSummary, Word } from "../types";

export function Dashboard() {
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [recent, setRecent] = useState<Word[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.summary(), api.insights(), api.words("", 4)])
      .then(([s, i, w]) => {
        setSummary(s);
        setInsights(i);
        setRecent(w.items.slice(0, 4));
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> ТВОЙ ПУТЬ К ЯЗЫКУ
          </div>
          <h1>
            Привет! <span className="wave">✳</span>
          </h1>
          <p>Каждое слово — маленький шаг к свободному английскому.</p>
        </div>
        <div className="date-pill">
          <span className="date-icon">✦</span>
          {new Intl.DateTimeFormat("ru-RU", {
            day: "numeric",
            month: "long",
            weekday: "long",
          }).format(new Date())}
        </div>
      </div>
      {error && (
        <div className="alert">Не удалось загрузить данные: {error}</div>
      )}
      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-badge">
            <Sparkles size={14} /> ВРЕМЯ ДЛЯ ПРАКТИКИ
          </div>
          <h2>
            Слова оживают,
            <br />
            когда ты их <em>используешь.</em>
          </h2>
          <p>
            {summary?.due
              ? `Сейчас ждут повторения ${summary.due} карточек. Несколько минут сегодня помогут запомнить их надолго.`
              : "Начни с пары слов — и постепенно собери свой живой словарь."}
          </p>
          <Link
            to={summary?.total_words ? "/practice" : "/import"}
            className="hero-button"
          >
            {summary?.total_words ? "Начать занятие" : "Добавить слова"}
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="hero-art">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-spark spark-one">✦</div>
          <div className="art-spark spark-two">✳</div>
          <div className="art-card art-card-back">
            <span>слово</span>
            <strong>возможность</strong>
            <small>/vəzˈmɔːʒnəsʲ/</small>
          </div>
          <div className="art-card art-card-front">
            <span>WORD OF THE DAY</span>
            <strong>possibility</strong>
            <div className="art-line" />
            <small>
              Every word opens a door <span>↗</span>
            </small>
          </div>
        </div>
      </section>
      <DayPrompt />
      <div className="section-line">
        <h3>
          Твой прогресс <span>↗</span>
        </h3>
        <span>Растём в своём темпе</span>
      </div>
      <section className="metrics-grid">
        <MetricCard
          icon={BookOpen}
          label="Слов в словаре"
          value={summary?.total_words ?? "—"}
          sub="твоя коллекция"
          tone="purple"
        />
        <MetricCard
          icon={Target}
          label="К повторению"
          value={summary?.due ?? "—"}
          sub="EN → RU и RU → EN"
          tone="orange"
        />
        <MetricCard
          icon={Flame}
          label="Дней подряд"
          value={insights?.streak ?? "—"}
          sub="продолжай движение"
          tone="green"
        />
        <MetricCard
          icon={TrendingUp}
          label="Точность ответов"
          value={insights ? `${insights.accuracy}%` : "—"}
          sub={`${insights?.total_answers ?? 0} ответов всего`}
          tone="blue"
        />
      </section>
      <section className="dashboard-bottom">
        <div className="activity-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">ПРИВЫЧКА</span>
              <h3>Время идёт тебе навстречу</h3>
            </div>
            <span className="light-pill">Последние 14 дней</span>
          </div>
          <p>Практикуйся регулярно — пусть английский станет частью дня.</p>
          <div className="activity-bars">
            {(
              insights?.activity ??
              Array.from({ length: 14 }, (_, i) => ({
                date: String(i),
                count: 0,
              }))
            ).map((day, i) => (
              <div className="bar-column" key={day.date}>
                <div
                  className={`activity-bar ${day.count ? "has-activity" : ""}`}
                  style={{
                    height: `${Math.max(13, Math.min(100, day.count * 14))}%`,
                  }}
                  title={`${day.date}: ${day.count} ответов`}
                />
                <span>
                  {i % 2 === 0 && /^\d{4}-\d{2}-\d{2}$/.test(day.date)
                    ? new Date(`${day.date}T12:00:00`).toLocaleDateString("ru-RU", {
                        day: "numeric",
                      })
                    : ""}
                </span>
              </div>
            ))}
          </div>
          <div className="panel-footer">
            <span>
              <i className="legend-dot" /> Ответы за день
            </span>
            <span>{insights?.today_answers ?? 0} сегодня</span>
          </div>
        </div>
        <div className="recent-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">ТВОЯ КОЛЛЕКЦИЯ</span>
              <h3>Недавно добавлены</h3>
            </div>
            <Link
              to="/dictionary"
              className="icon-link"
              aria-label="Весь словарь"
            >
              <ArrowRight size={19} />
            </Link>
          </div>
          {recent.length ? (
            <div className="recent-list">
              {recent.map((word, index) => (
                <div className="recent-word" key={word.id}>
                  <div className={`word-avatar avatar-${index % 4}`}>
                    {word.english.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <strong>{word.english}</strong>
                    <span>{word.translations[0]}</span>
                  </div>
                  <ChevronRight size={17} />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-mini">
              <Languages size={27} />
              <strong>Здесь скоро появятся слова</strong>
              <span>Добавь первое слово в коллекцию.</span>
              <Link to="/import">
                Импортировать <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </section>
      <div className="quick-links">
        <Link to="/journal" className="quick-link">
          <span className="quick-icon lilac">
            <NotebookPen size={21} />
          </span>
          <div>
            <strong>Мой день</strong>
            <span>Мысли, английский и движение</span>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/dictionary" className="quick-link">
          <span className="quick-icon">
            <Plus size={21} />
          </span>
          <div>
            <strong>Пополнить словарь</strong>
            <span>Добавить слова и примеры</span>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/practice" className="quick-link">
          <span className="quick-icon lilac">
            <GraduationCap size={21} />
          </span>
          <div>
            <strong>Короткая тренировка</strong>
            <span>Одно слово за раз</span>
          </div>
          <ArrowRight size={18} />
        </Link>
      </div>
    </>
  );
}
