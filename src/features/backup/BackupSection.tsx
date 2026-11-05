import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ChangeEvent } from 'react'
import { formatDay, toDateString } from '../../dates'
import { db } from '../../db/db'
import { requestSync } from '../../sync/autoSync'
import { resetPush } from '../../sync/sync'
import { exportBackup, parseBackup, restoreBackup } from './backup'

type Status = { message: string; isError: boolean } | null

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function BackupSection() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>(null)
  const lastExported = useLiveQuery(() => db.meta.get('lastExportedAt'))

  async function handleExport() {
    setStatus(null)
    try {
      await exportBackup()
    } catch {
      setStatus({ message: "Couldn't create the backup.", isError: true })
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setStatus(null)
    try {
      const counts = await restoreBackup(parseBackup(await file.text()))
      if (counts.accounts + counts.transactions > 0) {
        await resetPush()
        void requestSync()
      }
      setStatus({
        message:
          counts.accounts + counts.transactions === 0
            ? 'Nothing to restore. Everything in that backup is already here.'
            : `Restored ${plural(counts.accounts, 'account')} and ${plural(counts.transactions, 'transaction')}.`,
        isError: false,
      })
    } catch (error) {
      setStatus({
        message:
          error instanceof Error ? error.message : "Couldn't read that file.",
        isError: true,
      })
    }
  }

  const lastExportedAt =
    typeof lastExported?.value === 'number' ? lastExported.value : null

  return (
    <section className="mt-10">
      <h2 className="text-[13px] font-medium text-muted">Backup</h2>
      <p className="mt-1 text-[17px] font-medium">
        {lastExportedAt === null
          ? 'Never backed up'
          : `Last backup: ${formatDay(toDateString(new Date(lastExportedAt)))}`}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="h-11 rounded-full bg-surface px-5 text-[15px] font-medium"
          onClick={handleExport}
        >
          Export
        </button>
        <button
          type="button"
          className="h-11 rounded-full bg-surface px-5 text-[15px] font-medium"
          onClick={() => fileInput.current?.click()}
        >
          Restore
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {status && (
        <p
          role="status"
          className={`mt-3 text-[15px] ${status.isError ? 'text-negative' : 'text-muted'}`}
        >
          {status.message}
        </p>
      )}
    </section>
  )
}
