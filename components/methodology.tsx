const FACTORS = [
  { title: 'Сила хука', text: 'Насколько быстро в первые 1–2 секунды считывается обещание результата.' },
  { title: 'Темп', text: 'Частота смены визуальных событий, удерживающая внимание до конца.' },
  { title: 'Вовлечённость', text: 'Соотношение реакций и репостов к просмотрам — сигнал, что зрителю хочется делиться.' },
  { title: 'Соответствие формата', text: 'Подходит ли механика короткому вертикальному видео.' },
  { title: 'Новизна', text: 'Насколько подача отличается от уже привычных вариантов.' },
]

export function Methodology() {
  return (
    <article className="mx-auto max-w-[720px] py-4">
      <h1 className="text-3xl font-bold tracking-tight text-balance">Как мы оцениваем ролики</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Оценка потенциала — это ориентир по формату, а не прогноз охвата. Мы разбираем ролик по
        нескольким наблюдаемым факторам и переводим их в одно число от 0 до 100, чтобы вам было проще
        решить, стоит ли разбирать механику для своего контента.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Что входит в оценку</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {FACTORS.map((f) => (
            <li key={f.title} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-[14px] font-semibold">{f.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Как читать результат</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <TierCard tone="success" range="75–100" label="Высокий потенциал" note="Формат стоит разобрать и протестировать." />
          <TierCard tone="warning" range="55–74" label="Средний потенциал" note="Механика рабочая, но требует доработки." />
          <TierCard tone="danger" range="0–54" label="Низкий потенциал" note="Слабая база для повторения в текущем виде." />
        </div>
      </section>

      <p className="mt-8 rounded-xl border border-border bg-muted/50 p-4 text-[13px] leading-relaxed text-muted-foreground">
        Важно: высокий потенциал — это рекомендация исследовать формат, а не гарантия, что
        адаптированный ролик попадёт в рекомендации. Оценка не заменяет собственный тест.
      </p>
    </article>
  )
}

function TierCard({
  tone,
  range,
  label,
  note,
}: {
  tone: 'success' | 'warning' | 'danger'
  range: string
  label: string
  note: string
}) {
  const border =
    tone === 'success'
      ? 'border-l-success'
      : tone === 'warning'
        ? 'border-l-warning'
        : 'border-l-danger'
  const text =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-danger'
  return (
    <div className={`rounded-xl border border-l-4 bg-surface p-4 ${border}`}>
      <p className="text-2xl font-bold tabular-nums">{range}</p>
      <p className={`mt-1 text-[13px] font-semibold ${text}`}>{label}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{note}</p>
    </div>
  )
}
