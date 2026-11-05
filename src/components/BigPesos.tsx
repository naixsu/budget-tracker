import { formatPesos } from '../money'

export function BigPesos({
  centavos,
  className = '',
}: {
  centavos: number
  className?: string
}) {
  const text = formatPesos(centavos)
  const dot = text.lastIndexOf('.')

  return (
    <p
      className={`text-[min(52px,13vw)] leading-none font-extrabold tracking-[-0.04em] tabular-nums ${centavos < 0 ? 'text-negative' : ''} ${className}`}
    >
      {text.slice(0, dot)}
      <span className="text-faint">{text.slice(dot)}</span>
    </p>
  )
}
