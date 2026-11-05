import { liveQuery } from 'dexie'
import { db } from '../db/db'
import { sync } from './sync'

let running: Promise<void> | null = null
let isRequestedAgain = false

// One sync at a time; a request during a sync runs once more afterwards.
export function requestSync() {
  if (running) {
    isRequestedAgain = true
    return running
  }
  running = (async () => {
    try {
      do {
        isRequestedAgain = false
        await sync()
      } while (isRequestedAgain)
    } finally {
      running = null
    }
  })()
  return running
}

export function startAutoSync() {
  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = (delay: number) => {
    clearTimeout(timer)
    timer = setTimeout(() => void requestSync(), delay)
  }

  // Emits once on start and again after every local change.
  liveQuery(async () => {
    const [account, transaction] = await Promise.all([
      db.accounts.orderBy('updatedAt').last(),
      db.transactions.orderBy('updatedAt').last(),
    ])
    return Math.max(account?.updatedAt ?? 0, transaction?.updatedAt ?? 0)
  }).subscribe({ next: () => schedule(1500) })

  window.addEventListener('online', () => schedule(0))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedule(0)
  })
}
