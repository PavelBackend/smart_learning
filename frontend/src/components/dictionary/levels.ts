export const levelIntervals = ["сегодня", "через 1 день", "через 3 дня", "через 7 дней", "через 14 дней", "через 30 дней", "через 60 дней"];

export const levelName = (stage: number) => stage === 0 ? "Новое" : stage === 6 ? "Усвоено" : `Уровень ${stage + 1}`;

export const levelClass = (stage: number) => `level-${Math.max(0, Math.min(6, stage))}`;
