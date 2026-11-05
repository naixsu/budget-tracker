/**
 * Sync endpoint for budget-tracker. Setup steps are in the README.
 *
 * @OnlyCurrentDoc Limits the script's access to this spreadsheet only.
 */

const TABLES = {
  accounts: {
    fields: [
      'uuid',
      'name',
      'type',
      'openingBalance',
      'sortOrder',
      'createdAt',
      'updatedAt',
      'isDeleted',
    ],
    numbers: ['openingBalance', 'sortOrder', 'createdAt', 'updatedAt'],
    pesos: (record) => record.openingBalance / 100,
  },
  transactions: {
    fields: [
      'uuid',
      'accountUuid',
      'amount',
      'date',
      'note',
      'transferUuid',
      'createdAt',
      'updatedAt',
      'isDeleted',
    ],
    numbers: ['amount', 'createdAt', 'updatedAt'],
    pesos: (record) => record.amount / 100,
  },
}

// Run once from the editor: creates the tabs and prints the token.
function setup() {
  const props = PropertiesService.getScriptProperties()
  if (!props.getProperty('TOKEN')) {
    props.setProperty('TOKEN', Utilities.getUuid())
  }
  Object.keys(TABLES).forEach(sheet_)
  Logger.log('Token: ' + props.getProperty('TOKEN'))
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const props = PropertiesService.getScriptProperties()
    const token = props.getProperty('TOKEN')
    if (!token || body.token !== token) {
      return json_({ ok: false, error: 'wrong-token' })
    }

    const lock = LockService.getScriptLock()
    lock.waitLock(30000)
    try {
      let seq = Number(props.getProperty('SEQ')) || 0
      // A cursor from a different sheet would skip everything; start over.
      const cursor = Number(body.cursor) <= seq ? Number(body.cursor) || 0 : 0
      const response = { ok: true }

      Object.keys(TABLES).forEach((name) => {
        const table = TABLES[name]
        const sheet = sheet_(name)
        const incoming = Array.isArray(body[name]) ? body[name] : []
        const result = mergeTable_(
          table,
          readRows_(table, sheet),
          incoming,
          cursor,
          seq,
        )
        if (result.isChanged) writeRows_(table, sheet, result.rows)
        seq = result.seq
        response[name] = result.updates
      })

      props.setProperty('SEQ', String(seq))
      response.cursor = seq
      return json_(response)
    } finally {
      lock.releaseLock()
    }
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message) })
  }
}

function normalize_(table, raw) {
  const record = {}
  table.fields.forEach((field) => {
    const value = raw[field]
    if (table.numbers.includes(field)) {
      record[field] = Number(value)
    } else if (field === 'isDeleted') {
      record[field] = value === true || value === 'true'
    } else if (field === 'transferUuid') {
      if (value) record[field] = String(value)
    } else {
      record[field] = value === undefined || value === null ? '' : String(value)
    }
  })
  return record
}

// Kept free of Google services so it can be tested outside Apps Script.
// Every stored change gets the next sequence number; a client asks for
// everything after the last number it saw.
function mergeTable_(table, storedRows, incoming, cursor, seq) {
  const rows = storedRows.slice()
  const index = new Map(rows.map((row, i) => [row.record.uuid, i]))
  let isChanged = false

  incoming.forEach((raw) => {
    if (!raw || typeof raw.uuid !== 'string' || raw.uuid === '') return
    const record = normalize_(table, raw)
    const i = index.get(record.uuid)
    if (i !== undefined && !(record.updatedAt > rows[i].record.updatedAt)) {
      return
    }

    seq += 1
    isChanged = true
    const row = { record, serverSeq: seq }
    if (i === undefined) {
      index.set(record.uuid, rows.length)
      rows.push(row)
    } else {
      rows[i] = row
    }
  })

  const updates = rows
    .filter((row) => row.serverSeq > cursor)
    .map((row) => row.record)
  return { rows, updates, seq, isChanged }
}

function headers_(table) {
  return table.fields.concat(['serverSeq', 'pesos'])
}

function sheet_(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const existing = spreadsheet.getSheetByName(name)
  if (existing) return existing

  const sheet = spreadsheet.insertSheet(name)
  const headers = headers_(TABLES[name])
  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
  sheet.setFrozenRows(1)
  return sheet
}

function readRows_(table, sheet) {
  const headers = headers_(table)
  const lastRow = sheet.getLastRow()
  if (lastRow < 2) return []

  return sheet
    .getRange(2, 1, lastRow - 1, headers.length)
    .getValues()
    .filter((values) => values[0] !== '')
    .map((values) => {
      const raw = {}
      headers.forEach((header, i) => {
        raw[header] = values[i]
      })
      return {
        record: normalize_(table, raw),
        serverSeq: Number(raw.serverSeq) || 0,
      }
    })
}

function writeRows_(table, sheet, rows) {
  const headers = headers_(table)
  const values = rows.map(({ record, serverSeq }) =>
    table.fields
      .map((field) => (record[field] === undefined ? '' : String(record[field])))
      .concat([String(serverSeq), table.pesos(record)]),
  )
  // Plain text everywhere except the pesos column, so Sheets doesn't turn
  // dates into date cells or a note starting with "=" into a formula.
  const formats = rows.map(() =>
    headers.map((_, i) => (i === headers.length - 1 ? '#,##0.00' : '@')),
  )
  const range = sheet.getRange(2, 1, rows.length, headers.length)
  range.setNumberFormats(formats)
  range.setValues(values)
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
