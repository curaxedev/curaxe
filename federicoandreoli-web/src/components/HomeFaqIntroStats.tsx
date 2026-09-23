export type HomeFaqIntroStat = {
  figure: string
  caption: string
}

type HomeFaqIntroStatsProps = {
  items: HomeFaqIntroStat[]
}

export function HomeFaqIntroStats({ items }: HomeFaqIntroStatsProps) {
  return (
    <ul className="home-faq__stats" aria-label="Numeri utili">
      {items.map((item) => (
        <li key={`${item.figure}-${item.caption}`} className="home-faq__stat">
          <span className="home-faq__stat-figure">{item.figure}</span>
          <span className="home-faq__stat-caption">{item.caption}</span>
        </li>
      ))}
    </ul>
  )
}
