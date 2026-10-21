import { Check, X } from "lucide-react";
import type { AnswerResult } from "../../types";

export function AnswerFeedback({ result }: { result: AnswerResult }) {
  return <div key={`${result.attempt_id}-${result.correct}`} className={`result-card ${result.correct ? "result-good answer-celebration" : "result-wrong"}`}>
    {result.correct && <div className="celebration-sparks" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => <span key={index}>✦</span>)}
    </div>}
    <div className="result-icon">{result.correct ? <Check size={20} /> : <X size={20} />}</div>
    <div>
      <strong>{result.correct ? "Верно! Отличная работа." : "Почти! Запомним вместе."}</strong>
      <p>Правильный ответ: <b>{result.accepted.join(" · ")}</b></p>
      {result.example && <div className="example-quote"><em>“{result.example.en}”</em><span>{result.example.ru}</span></div>}
    </div>
  </div>;
}
