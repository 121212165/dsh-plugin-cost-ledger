import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateWithSessions } from '../src/ledger/aggregate.ts';
import type { LedgerRecord } from '../src/ledger/record.ts';

const base = {
  v: 1 as const,
  turn: 1,
  step: 1,
  provider: 'deepseek',
  reasoningTokens: 0,
};

const record = (over: Partial<LedgerRecord>): LedgerRecord =>
  ({
    v: 1,
    sessionId: 's1',
    at: '2026-09-15T02:00:00.000Z',
    modelId: 'deepseek-v4-pro',
    pricedAs: 'deepseek-v4-pro',
    currency: 'CNY',
    costMicros: 1_000,
    buckets: { uncachedInput: 100, cacheRead: 900, output: 50, cacheWrite: 0 },
    ...over,
  }) as LedgerRecord;

test('months, models and days each get their own slice', () => {
  const result = aggregateWithSessions([
    record({}),
    record({ at: '2026-09-16T00:00:00.000Z', modelId: 'deepseek-v4-flash', pricedAs: 'deepseek-v4-flash', costMicros: 300 }),
    record({ at: '2026-10-01T00:00:00.000Z', costMicros: 5_000 }),
  ]);
  assert.equal(result.months.length, 2);
  const sep = result.months[0]!;
  assert.equal(sep.month, '2026-09');
  assert.equal(sep.costMicros, 1_300);
  assert.equal(sep.events, 2);
  assert.equal(sep.byModel[0]!.key, 'deepseek-v4-pro'); // descending by cost
  assert.equal(sep.byDay.length, 2);
  assert.equal(sep.byDay[0]!.key, '2026-09-15');
  assert.equal(result.months[1]!.month, '2026-10');
});

test('sessions are deduplicated per month, not per event', () => {
  const result = aggregateWithSessions([
    record({ sessionId: 'a' }),
    record({ sessionId: 'a', step: 2 }),
    record({ sessionId: 'b' }),
  ]);
  assert.equal(result.months[0]!.sessions, 2);
});

test('currencies are never blended inside one month', () => {
  const result = aggregateWithSessions([record({}), record({ currency: 'USD', costMicros: 7_000 })]);
  const currencies = result.months.map((month) => month.currency).sort();
  assert.deepEqual(currencies, ['CNY', 'USD']);
  assert.equal(result.months.find((m) => m.currency === 'CNY')!.costMicros, 1_000);
  assert.equal(result.months.find((m) => m.currency === 'USD')!.costMicros, 7_000);
});

test('token buckets accumulate and feed the totals', () => {
  const result = aggregateWithSessions([record({}), record({ at: '2026-09-16T00:00:00.000Z' })]);
  const sep = result.months[0]!;
  assert.equal(sep.buckets.cacheRead, 1_800);
  assert.equal(sep.buckets.uncachedInput, 200);
  assert.equal(sep.tokens, (100 + 900 + 50) * 2);
});

test('records crossing the UTC month boundary land in the right bucket', () => {
  const result = aggregateWithSessions([
    record({ at: '2026-09-30T23:59:59.999Z' }),
    record({ at: '2026-10-01T00:00:00.000Z' }),
  ]);
  assert.equal(result.months.length, 2);
});

test('skipped lines are passed through to the report', () => {
  const result = aggregateWithSessions([record({})], 3);
  assert.equal(result.skippedLines, 3);
});

test('base carries v:1 so records validate', () => {
  assert.equal(base.v, 1);
});
