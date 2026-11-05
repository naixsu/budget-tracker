import Dexie, { type EntityTable } from 'dexie'

export type AccountType = 'bank' | 'ewallet' | 'cash'

export interface Account {
  uuid: string
  name: string
  type: AccountType
  openingBalance: number
  sortOrder: number
  createdAt: number
  updatedAt: number
  isDeleted: boolean
}

export interface Transaction {
  uuid: string
  accountUuid: string
  amount: number
  date: string
  note: string
  transferUuid?: string
  createdAt: number
  updatedAt: number
  isDeleted: boolean
}

export interface Meta {
  key: string
  value: unknown
}

export const db = new Dexie('budget') as Dexie & {
  accounts: EntityTable<Account, 'uuid'>
  transactions: EntityTable<Transaction, 'uuid'>
  meta: EntityTable<Meta, 'key'>
}

db.version(1).stores({
  accounts: 'uuid, sortOrder, updatedAt',
  transactions: 'uuid, accountUuid, date, transferUuid, updatedAt',
  meta: 'key',
})
