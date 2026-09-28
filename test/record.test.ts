import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseJsonl, parseRecordLine, toRecord, type LedgerEntryInput } from '../src/ledger/record.ts';
import { emptyBuckets } from '../src/pricing/cost.ts';

const entry: LedgerEntryInput = {
  at: new Date('2026-09-15T02:30:00.000Z'),
  turn: 3,
  step: 1,
  modelId: 'deepseek-v4-pro',
  provider: 'deepseek',
  pricedAs: 'deepseek-v4-pro',
  reasoningTokens: 400,
  buckets: { uncachedInput: 1000, cacheRead: 90_000, output: 500, cacheWrite: 0 },
  currency: 'CNY',
  costMicros: 225_000_000,
};

test('a record round-trips through JSONL with a schema version', () => {
  const record = toRecord('sess-1', entry);
  assert.equal(record.v, 1);
  const parsed = parseRecordLine(JSON.stringify(record));
  assert.deepEqual(parsed, record);
});

test('torn writes and garbage lines are skipped, not fatal', () => {
  const good = JSON.stringify(toRecord('sess-1', entry));
  const result = parseJsonl(`\n${good}\n{"v":1,"sessionId":\nnot json at all\n{"v":2,"sessionId":"future-schema"}\n`);
  assert.equal(result.records.length, 1);
  assert.equal(result.skipped, 4 - 1);
});

test('a record with a negative or non-finite number is rejected', () => {
  const bad = { ...toRecord('s', entry), costMicros: Number.NaN };
  assert.equal(parseRecordLine(JSON.stringify(bad)), null);
  const negative = parseRecordLine(JSON.stringify(toRecord('s', entry)).replace('"costMicros":225000000', '"costMicros":-1'));
  assert.equal(negative, null);
});

test('blank lines cost nothing and count as nothing', () => {
  const result = parseJsonl('   \n\t\n');
  assert.deepEqual(result, { records: [], skipped: 0 });
});

test('buckets default to zero for missing cacheWrite', () => {
  const record = toRecord('s', { ...entry, buckets: emptyBuckets() });
  assert.equal(record.buckets.cacheWrite, 0);
});
