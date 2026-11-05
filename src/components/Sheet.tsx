import type { FormEvent, ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  onSubmit: () => void | Promise<void>
  children: ReactNode
}

export function Sheet({ title, onClose, onSubmit, children }: Props) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void onSubmit()
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-end bg-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-h-[92dvh] w-full max-w-xl animate-sheet-up overflow-y-auto rounded-t-[20px] bg-sheet px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      >
        <div
          className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-line"
          aria-hidden="true"
        />
        <header className="flex h-14 items-center justify-between">
          <h2 className="text-[24px] font-extrabold tracking-[-0.02em]">
            {title}
          </h2>
          <button
            type="button"
            className="h-11 text-[15px] font-medium"
            onClick={onClose}
          >
            Cancel
          </button>
        </header>
        {children}
      </form>
    </div>
  )
}
