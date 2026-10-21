import { ArrowRight, Layers3 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Cohort } from "../../types";

export function CohortPanel({ cohort, busy, onStart, onExpand }: {
  cohort: Cohort | null;
  busy: boolean;
  onStart: (count: number) => Promise<void>;
  onExpand: (count: number) => Promise<void>;
}) {
  const [count, setCount] = useState("20");
  const canStart = !!cohort && (cohort.count === 0 || cohort.ready) && cohort.available > 0;
  const canExpand = !!cohort?.can_add && !cohort.ready;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = count.trim() === "" ? 0 : Number(count);
    if (canStart) void onStart(value);
    else if (canExpand) void onExpand(value);
  };
  return (
    <section className="cohort-panel">
      <div className="cohort-icon"><Layers3 size={22} /></div>
      <div className="cohort-copy">
        <span className="panel-kicker">ТВОЯ ПОДБОРКА</span>
        <strong>{cohort?.count ? `${cohort.count} слов в работе` : "Выбери слова для старта"}</strong>
        <p>{cohort?.count
          ? cohort.ready
            ? "Слова достигли уровня 3. Можно взять новую подборку; старые вернутся в срок повтора."
            : cohort.can_add
              ? "Сегодняшние карточки пройдены. Добавь новые слова, а старые вернутся к повтору позже."
              : `До уровня 3 осталось ${cohort.remaining} слов. Сейчас доступно: EN → RU ${cohort.due_en_ru}, RU → EN ${cohort.due_ru_en}.`
          : "Случайные слова из словаря. Когда карточки уйдут на паузу, можно будет добавить новые."}</p>
      </div>
      {(canStart || canExpand) && <form className="cohort-form" onSubmit={submit} noValidate>
        <label htmlFor="cohort-count">Сколько слов</label>
        <input id="cohort-count" type="number" min={1} max={10000} value={count}
          onChange={(event) => setCount(event.target.value)} />
        <button className="primary-button" disabled={busy}>
          {canExpand ? "Добавить слова" : cohort?.count ? "Новая подборка" : "Начать"} <ArrowRight size={17} />
        </button>
      </form>}
    </section>
  );
}
