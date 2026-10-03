import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pendingLISOrder, completeLISOrder } from '../src/utils/lisOrderSubmission.ts'

test('lost responses and reloads retain identity; confirmed orders allow repeats', () => {
  const rows = new Map()
  const storage = { getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value), removeItem: key => rows.delete(key) }
  const first = pendingLISOrder('clinic-a-patient-1-GLU', storage)
  assert.equal(pendingLISOrder('clinic-a-patient-1-GLU', storage), first)
  assert.notEqual(pendingLISOrder('clinic-b-patient-1-GLU', storage), first)
  completeLISOrder('clinic-a-patient-1-GLU', storage)
  assert.notEqual(pendingLISOrder('clinic-a-patient-1-GLU', storage), first)
})

test('storage failure prevents an untracked submission', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('Storage blocked') } }
  assert.throws(() => pendingLISOrder('request', storage), /Storage blocked/)
})
