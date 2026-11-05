import { db } from '../db/db'
import { isAccount, isRecord, isTransaction, mergeRecords } from '../db/records'

export interface SyncSettings {
  url: string
  token: string
}

const metaKeys = [
  'syncUrl',
  'syncToken',
  'lastPushedAt',
  'serverCursor',
  'lastSyncedAt',
  'syncError',
]

async function getMeta<T>(key: string) {
  return (await db.meta.get(key))?.value as T | undefined
}

export function isValidSyncUrl(url: string) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(
    url.trim(),
  )
}

export async function connectSync({ url, token }: SyncSettings) {
  await db.meta.bulkDelete(metaKeys)
  await db.meta.bulkPut([
    { key: 'syncUrl', value: url.trim() },
    { key: 'syncToken', value: token.trim() },
  ])
}

export async function disconnectSync() {
  await db.meta.bulkDelete(metaKeys)
}

// Makes the next sync send everything, e.g. after a restore brought back
// records that are older than the last push.
export async function resetPush() {
  await db.meta.delete('lastPushedAt')
}

function parseResponse(data: unknown) {
  if (isRecord(data) && data.ok === false) {
    throw new Error(
      data.error === 'wrong-token'
        ? "The token doesn't match the one in your sheet."
        : `The sheet reported an error: ${String(data.error)}`,
    )
  }
  if (
    !isRecord(data) ||
    data.ok !== true ||
    !Number.isInteger(data.cursor) ||
    !Array.isArray(data.accounts) ||
    !Array.isArray(data.transactions) ||
    !data.accounts.every(isAccount) ||
    !data.transactions.every(isTransaction)
  ) {
    throw new Error('The sheet sent back something unexpected.')
  }
  return {
    cursor: data.cursor as number,
    accounts: data.accounts,
    transactions: data.transactions,
  }
}

async function send(settings: SyncSettings, payload: object) {
  let response: Response
  try {
    response = await fetch(settings.url, {
      method: 'POST',
      // text/plain skips the CORS preflight, which Apps Script can't answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: settings.token, ...payload }),
    })
  } catch {
    throw new Error("Couldn't reach the sheet. Check your connection.")
  }

  // A wrong URL or a deployment not open to "Anyone" returns a Google
  // sign-in page instead of JSON.
  const text = await response.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error(
      "The sheet didn't answer. Check the URL and that the script is deployed for Anyone.",
    )
  }
}

export async function sync() {
  const [url, token] = await Promise.all([
    getMeta<string>('syncUrl'),
    getMeta<string>('syncToken'),
  ])
  if (!url || !token) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const pushStartedAt = Date.now()
  const lastPushedAt = (await getMeta<number>('lastPushedAt')) ?? 0
  const cursor = (await getMeta<number>('serverCursor')) ?? 0

  try {
    const [accounts, transactions] = await Promise.all([
      db.accounts.where('updatedAt').above(lastPushedAt).toArray(),
      db.transactions.where('updatedAt').above(lastPushedAt).toArray(),
    ])
    const result = parseResponse(
      await send({ url, token }, { cursor, accounts, transactions }),
    )

    // Disconnected while the request was in flight.
    if ((await getMeta<string>('syncUrl')) !== url) return

    await mergeRecords(result.accounts, result.transactions)
    await db.meta.bulkPut([
      { key: 'lastPushedAt', value: pushStartedAt },
      { key: 'serverCursor', value: result.cursor },
      { key: 'lastSyncedAt', value: Date.now() },
    ])
    await db.meta.delete('syncError')
  } catch (error) {
    await db.meta.put({
      key: 'syncError',
      value: error instanceof Error ? error.message : 'Sync failed.',
    })
  }
}
