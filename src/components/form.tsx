import type { ReactNode } from 'react'

export function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string
  children: ReactNode
}) {
  const className = 'mt-8 mb-1 block text-[13px] font-medium text-muted'
  return htmlFor ? (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ) : (
    <p className={className}>{children}</p>
  )
}

export function Hint({
  isError = false,
  children,
}: {
  isError?: boolean
  children: ReactNode
}) {
  return (
    <p
      className={`mt-2 text-[13px] ${isError ? 'text-negative' : 'text-muted'}`}
    >
      {children}
    </p>
  )
}

export function AmountInput({
  id,
  value,
  onChange,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}) {
  return (
    <div className="flex items-baseline border-b-2 border-line focus-within:border-ink">
      <span className="text-[32px] font-extrabold text-faint">₱</span>
      <input
        id={id}
        className="w-full bg-transparent py-2 pl-1 text-[32px] font-extrabold tabular-nums outline-none placeholder:text-faint"
        placeholder="0.00"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
      />
    </div>
  )
}

export function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className={`h-11 rounded-full px-5 text-[15px] font-medium ${option.value === value ? 'bg-ink text-page' : 'bg-surface'}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function SubmitButton({
  disabled,
  children,
}: {
  disabled: boolean
  children: ReactNode
}) {
  return (
    <button
      type="submit"
      className="mt-10 h-14 w-full rounded-full bg-accent text-[17px] font-medium text-on-accent disabled:opacity-40"
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function DeleteButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="mt-2 h-12 w-full text-[15px] font-medium text-negative"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
