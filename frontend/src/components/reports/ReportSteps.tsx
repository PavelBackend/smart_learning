import { Check, Minus, Plus } from "lucide-react";
import type { Exercise, ReportInput } from "../../types";

type Values = Omit<ReportInput, "timezone">;
type Props = {
  step: number;
  values: Values;
  onChange: (patch: Partial<Values>) => void;
  todayWords: number | null;
};

export const reportSteps = ["Мысли", "Английский", "Движение", "Итог"];

const moods = [
  { value: "great", emoji: "✦", label: "Отлично" },
  { value: "good", emoji: "◒", label: "Хорошо" },
  { value: "okay", emoji: "◌", label: "Спокойно" },
  { value: "low", emoji: "☾", label: "Непросто" },
] as const;

function optionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

function exerciseSummary(exercise: Exercise): string {
  const quantity = [
    exercise.sets ? `${exercise.sets} подхода` : null,
    exercise.repetitions ? `${exercise.repetitions} повторений` : null,
  ]
    .filter(Boolean)
    .join(" × ");
  return [exercise.name, quantity].filter(Boolean).join(" · ");
}

export function ReportSteps({ step, values, onChange, todayWords }: Props) {
  const updateExercise = (index: number, patch: Partial<Exercise>) => {
    onChange({
      exercises: values.exercises.map((exercise, current) =>
        current === index ? { ...exercise, ...patch } : exercise,
      ),
    });
  };

  if (step === 0)
    return (
      <div className="report-step" key="thoughts">
        <span className="report-step-kicker">01 / ТВОЁ СОСТОЯНИЕ</span>
        <h2>О чём хочется помнить?</h2>
        <p className="report-step-intro">Пара строк или целая история — здесь нет правильного формата.</p>
        <div className="mood-grid" role="group" aria-label="Настроение за день">
          {moods.map((mood) => (
            <button
              type="button"
              key={mood.value}
              className={values.mood === mood.value ? "mood-choice selected" : "mood-choice"}
              onClick={() => onChange({ mood: values.mood === mood.value ? null : mood.value })}
              aria-pressed={values.mood === mood.value}
            >
              <span>{mood.emoji}</span>{mood.label}
            </button>
          ))}
        </div>
        <label className="report-field">
          <span>Мысли за день</span>
          <textarea
            rows={6}
            maxLength={10000}
            placeholder="Что произошло, что почувствовал, что хочется отпустить..."
            value={values.thoughts ?? ""}
            onChange={(event) => onChange({ thoughts: event.target.value || null })}
          />
        </label>
        <label className="report-field">
          <span>Что сегодня получилось?</span>
          <textarea
            rows={2}
            maxLength={3000}
            placeholder="Даже маленькая победа имеет значение"
            value={values.highlight ?? ""}
            onChange={(event) => onChange({ highlight: event.target.value || null })}
          />
        </label>
      </div>
    );

  if (step === 1)
    return (
      <div className="report-step" key="english">
        <span className="report-step-kicker">02 / АНГЛИЙСКИЙ</span>
        <h2>Как прошла практика?</h2>
        <p className="report-step-intro">Отметь время и конкретные занятия. Если сегодня был отдых, переходи дальше.</p>
        <div className="report-field-row">
          <label className="report-field">
            <span>Минут занимался</span>
            <input
              type="number"
              min={0}
              max={1440}
              placeholder="Например, 25"
              value={values.english_minutes ?? ""}
              onChange={(event) => onChange({ english_minutes: optionalNumber(event.target.value) })}
            />
          </label>
          <label className="report-field">
            <span>Повторено разных слов</span>
            <input
              type="number"
              min={0}
              max={100000}
              placeholder="Можно заполнить автоматически"
              value={values.reviewed_words ?? ""}
              onChange={(event) => onChange({ reviewed_words: optionalNumber(event.target.value) })}
            />
          </label>
        </div>
        {todayWords !== null && (
          <button
            type="button"
            className="report-autofill"
            onClick={() => onChange({ reviewed_words: todayWords })}
          >
            <Check size={16} /> Подставить из практики: {todayWords} разных слов сегодня
          </button>
        )}
        <label className="report-field">
          <span>Что именно сделал?</span>
          <textarea
            rows={4}
            maxLength={3000}
            placeholder="Повторял слова, читал, слушал подкаст, смотрел видео..."
            value={values.english_details ?? ""}
            onChange={(event) => onChange({ english_details: event.target.value || null })}
          />
        </label>
      </div>
    );

  if (step === 2)
    return (
      <div className="report-step" key="movement">
        <span className="report-step-kicker">03 / ДВИЖЕНИЕ</span>
        <h2>Дал телу подвигаться?</h2>
        <p className="report-step-intro">Запиши тренировку так подробно, как захочется.</p>
        <div className="report-field-row">
          <label className="report-field">
            <span>Вид активности</span>
            <input
              maxLength={300}
              placeholder="Зал, бег, йога, прогулка..."
              value={values.sports_activity ?? ""}
              onChange={(event) => onChange({ sports_activity: event.target.value || null })}
            />
          </label>
          <label className="report-field">
            <span>Минут занимался</span>
            <input
              type="number"
              min={0}
              max={1440}
              placeholder="Например, 45"
              value={values.sports_minutes ?? ""}
              onChange={(event) => onChange({ sports_minutes: optionalNumber(event.target.value) })}
            />
          </label>
        </div>
        <div className="report-exercises-head">
          <strong>Упражнения</strong>
          <span>Подходы и повторы можно пропустить</span>
        </div>
        {values.exercises.map((exercise, index) => (
          <div className="report-exercise" key={index}>
            <input
              aria-label={`Упражнение ${index + 1}`}
              maxLength={100}
              placeholder="Название упражнения"
              value={exercise.name}
              onChange={(event) => updateExercise(index, { name: event.target.value })}
            />
            <input
              aria-label="Подходы"
              type="number"
              min={1}
              max={100}
              placeholder="Подходы"
              value={exercise.sets ?? ""}
              onChange={(event) => updateExercise(index, { sets: optionalNumber(event.target.value) })}
            />
            <input
              aria-label="Повторы"
              type="number"
              min={1}
              max={10000}
              placeholder="Повторы"
              value={exercise.repetitions ?? ""}
              onChange={(event) => updateExercise(index, { repetitions: optionalNumber(event.target.value) })}
            />
            <button
              type="button"
              aria-label={`Убрать упражнение ${index + 1}`}
              onClick={() => onChange({ exercises: values.exercises.filter((_, current) => current !== index) })}
            >
              <Minus size={16} />
            </button>
          </div>
        ))}
        {values.exercises.length < 50 && (
          <button
            type="button"
            className="report-add-exercise"
            onClick={() => onChange({ exercises: [...values.exercises, { name: "", sets: null, repetitions: null }] })}
          >
            <Plus size={16} /> Добавить упражнение
          </button>
        )}
      </div>
    );

  return (
    <div className="report-step" key="review">
      <span className="report-step-kicker">04 / ПОСМОТРИ НА ДЕНЬ ЦЕЛИКОМ</span>
      <h2>День в нескольких штрихах</h2>
      <p className="report-step-intro">Проверь запись. Пустые поля просто останутся пустыми.</p>
      <div className="report-review">
        <div><span>Настроение и мысли</span><strong>{moods.find((mood) => mood.value === values.mood)?.label ?? "Не указано"}</strong><p>{values.thoughts || values.highlight || "Без заметок"}</p></div>
        <div><span>Английский</span><strong>{values.english_minutes === null ? "Время не указано" : `${values.english_minutes} мин`}</strong><p>{values.english_details || "Без подробностей"}{values.reviewed_words !== null ? ` · ${values.reviewed_words} слов` : ""}</p></div>
        <div><span>Движение</span><strong>{values.sports_activity || "Активность не указана"}</strong><p>{values.sports_minutes !== null ? `${values.sports_minutes} мин` : "Время не указано"}{values.exercises.length ? ` · ${values.exercises.map(exerciseSummary).join(", ")}` : ""}</p></div>
      </div>
    </div>
  );
}
