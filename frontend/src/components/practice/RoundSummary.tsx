import { ArrowRight, RotateCcw, Sparkles, TrendingUp } from "lucide-react";

type Props = {
  total: number;
  correct: number;
  previous: number | null;
  onRetry: () => void;
  onNewRound: () => void;
};

export function RoundSummary({ total, correct, previous, onRetry, onNewRound }: Props) {
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const growth = previous === null ? null : percent - previous;
  return <section className="round-summary" aria-live="polite">
    <div className="round-summary-orbit"><Sparkles size={38} /></div>
    <span className="panel-kicker">КРУГ ЗАВЕРШЁН</span>
    <h2>{previous === null ? "Отличная работа!" : "Вот твой рост"}</h2>
    <p>Ты прошёл {total} {total === 1 ? "карточку" : "карточек"} в этом направлении.</p>
    <div className="round-score"><strong>{percent}%</strong><span>{correct} верно из {total}</span></div>
    {growth !== null && <div className={`round-growth ${growth < 0 ? "negative" : ""}`}>
      <TrendingUp size={18} /> Было {previous}% · {growth > 0 ? `+${growth}` : growth} п. п.
    </div>}
    <div className="round-summary-actions">
      <button className="primary-button" onClick={onRetry}><RotateCcw size={17} /> Пройти ещё раз</button>
      <button className="secondary-button" onClick={onNewRound}>Новые доступные карточки <ArrowRight size={17} /></button>
    </div>
    <small>Повтор круга закрепляет знания, но не повышает уровень слова повторно за этот же круг.</small>
  </section>;
}
