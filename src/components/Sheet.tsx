import {
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
  type ReactNode,
  type TransitionEvent,
} from 'react'

interface Props {
  title: string
  onClose: () => void
  onSubmit: () => void | Promise<void>
  children: ReactNode
}

const closeDistance = 120
const closeVelocity = 0.5 // px per ms

export function Sheet({ title, onClose, onSubmit, children }: Props) {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const dragStart = useRef<{ y: number; time: number } | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void onSubmit()
  }

  function handlePointerDown(event: PointerEvent) {
    dragStart.current = { y: event.clientY, time: event.timeStamp }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return
    const distance = event.clientY - dragStart.current.y
    // Capture only once it is clearly a drag, so taps still reach Cancel.
    if (!isDragging && distance > 4) {
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsDragging(true)
    }
    if (isDragging) setDragY(Math.max(0, distance))
  }

  function handlePointerUp(event: PointerEvent) {
    if (!dragStart.current) return
    const distance = event.clientY - dragStart.current.y
    const velocity = distance / (event.timeStamp - dragStart.current.time)
    dragStart.current = null
    if (!isDragging) return

    setIsDragging(false)
    if (distance > closeDistance || velocity > closeVelocity) {
      setIsClosing(true)
    } else {
      setDragY(0)
    }
  }

  function handleTransitionEnd(event: TransitionEvent) {
    if (
      isClosing &&
      event.target === event.currentTarget &&
      event.propertyName === 'transform'
    ) {
      onClose()
    }
  }

  return (
    <div
      className={`fixed inset-0 z-10 flex items-end bg-overlay transition-opacity duration-200 ${isClosing ? 'opacity-0' : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) setIsClosing(true)
      }}
    >
      <form
        onSubmit={handleSubmit}
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: isClosing ? 'translateY(100%)' : `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
        }}
        className="mx-auto max-h-[92dvh] w-full max-w-xl animate-sheet-up overflow-y-auto rounded-t-[20px] bg-sheet px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      >
        <div
          className="touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
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
              onClick={() => setIsClosing(true)}
            >
              Cancel
            </button>
          </header>
        </div>
        {children}
      </form>
    </div>
  )
}
