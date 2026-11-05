import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useId, useState } from 'react'
import { Hint, Label } from '../components/form'
import { formatDay, toDateString } from '../dates'
import { db } from '../db/db'
import { requestSync } from './autoSync'
import { connectSync, disconnectSync, isValidSyncUrl } from './sync'

const setupUrl = 'https://github.com/naixsu/budget-tracker#google-sheet-sync'

function describeSyncedAt(syncedAt: number, now: number) {
  const minutes = Math.floor((now - syncedAt) / 60_000)
  if (minutes < 1) return 'Synced just now'
  if (minutes < 60) return `Synced ${minutes} min ago`

  const date = new Date(syncedAt)
  const day = formatDay(toDateString(date))
  const time = date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `Synced ${day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : day} at ${time}`
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function SyncSection() {
  const urlId = useId()
  const tokenId = useId()
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const now = useNow(30_000)
  const meta = useLiveQuery(async () => {
    const rows = await db.meta.toArray()
    return new Map(rows.map((row) => [row.key, row.value]))
  })

  if (!meta) return null

  const isConnected = typeof meta.get('syncUrl') === 'string'
  const lastSyncedAt = meta.get('lastSyncedAt')
  const syncError = meta.get('syncError')
  const isUrlValid = isValidSyncUrl(url)

  async function runSync() {
    setIsSyncing(true)
    await requestSync()
    setIsSyncing(false)
  }

  async function handleConnect() {
    await connectSync({ url, token })
    setUrl('')
    setToken('')
    await runSync()
  }

  async function handleDisconnect() {
    if (
      !confirm(
        'Stop syncing? Your data stays on this phone and in the Google Sheet.',
      )
    ) {
      return
    }
    await disconnectSync()
  }

  let status = 'Not synced yet'
  if (isSyncing) status = 'Syncing…'
  else if (typeof syncError === 'string') status = syncError
  else if (typeof lastSyncedAt === 'number') {
    status = describeSyncedAt(lastSyncedAt, now)
  }

  return (
    <section className="mt-4">
      <h2 className="text-[13px] font-medium text-muted">Google Sheet sync</h2>

      {isConnected ? (
        <>
          <p
            role="status"
            className={`mt-1 text-[17px] font-medium ${!isSyncing && typeof syncError === 'string' ? 'text-negative' : ''}`}
          >
            {status}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="h-11 rounded-full bg-surface px-5 text-[15px] font-medium disabled:opacity-40"
              disabled={isSyncing}
              onClick={runSync}
            >
              Sync now
            </button>
            <button
              type="button"
              className="h-11 rounded-full bg-surface px-5 text-[15px] font-medium"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-[17px] font-medium">Not connected</p>
          <p className="mt-1 text-[15px] text-muted">
            Keeps a copy of everything in your own Google Sheet.{' '}
            <a
              href={setupUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent underline underline-offset-2"
            >
              Setup steps
            </a>
          </p>

          <Label htmlFor={urlId}>Web app URL</Label>
          <input
            id={urlId}
            type="url"
            className="w-full border-b-2 border-line bg-transparent py-2 text-[15px] font-medium outline-none focus:border-ink"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {url.trim() !== '' && !isUrlValid && (
            <Hint isError>
              Paste the URL from Deploy, the one ending in /exec.
            </Hint>
          )}

          <Label htmlFor={tokenId}>Token</Label>
          <input
            id={tokenId}
            className="w-full border-b-2 border-line bg-transparent py-2 text-[15px] font-medium outline-none focus:border-ink"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />

          <button
            type="button"
            className="mt-6 h-11 rounded-full bg-surface px-5 text-[15px] font-medium disabled:opacity-40"
            disabled={!isUrlValid || token.trim() === ''}
            onClick={handleConnect}
          >
            Connect
          </button>
        </>
      )}
    </section>
  )
}
