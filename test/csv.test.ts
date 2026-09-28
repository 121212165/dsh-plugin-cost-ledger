import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toCsv } from '../src/ledger/csv.ts';
import type { LedgerRecord } from '../src/ledger/record.ts';

const record: LedgerRecord = {
  v: 1,
  sessionId: 'sess,1', // comma forces quoting
  at: '2026-09-15T02:00:00.000Z',
  turn: 1,
  step: 2,
  modelId: 'deepseek-v4-pro',
  provider: 'deepseek',
  pricedAs: 'deepseek-v4-pro',
  buckets: { uncachedInput: 1000, cacheRead: 90_000, output: 500, cacheWrite: 100 },
  reasoningTokens: 400,
  currency: 'CNY',
  costMicros: 225_000_000,
};

test('the header row comes first and every field lands in its column', () => {
  const csv = toCsv([record]);
  const lines = csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n');
  assert.equal(lines[0], 'timestamp,session_id,model,priced_as,currency,uncached_input,cache_read,cache_write,output,reasoning_tokens,cost_micros,turn,step');
  // quoted fields contain commas, so assert on the raw row rather than a naive split
  const row = lines[1]!;
  assert.ok(row.startsWith('2026-09-15T02:00:00.000Z,"sess,1",deepseek-v4-pro,deepseek-v4-pro,CNY,'));
  assert.ok(row.endsWith('225000000,1,2'));
  assert.ok(row.includes(',1000,90000,100,500,400,')); // uncached, cacheRead, cacheWrite, output, reasoning
});

test('a BOM plus CRLF so Excel opens it without mangling', () => {
  const csv = toCsv([record]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('\r\n'));
});

test('embedded quotes are doubled, not escaped with backslash', () => {
  const csv = toCsv([{ ...record, sessionId: 'say "hi"' }]);
  assert.ok(csv.includes('"say ""hi"""'));
});

test('empty input yields header only', () => {
  const csv = toCsv([]);
  assert.equal(csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n').length, 1);
});
