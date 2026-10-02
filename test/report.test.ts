import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateWithSessions } from '../src/ledger/aggregate.ts';
import { renderLedgerReport, renderMonth } from '../src/ledger/report.ts';
import { validateConfig } from '../src/config.ts';
import type { LedgerRecord } from '../src/ledger/record.ts';

const record = (over: Partial<LedgerRecord>): LedgerRecord =>
  ({
    v: 1,
    sessionId: 's1',
    at: '2026-09-15T02:00:00.000Z',
    modelId: 'deepseek-v4-pro',
    pricedAs: 'deepseek-v4-pro',
    currency: 'CNY',
    costMicros: 1_000,
    turn: 1,
    step: 1,
    reasoningTokens: 0,
    buckets: { uncachedInput: 100, cacheRead: 900, output: 50, cacheWrite: 0 },
    ...over,
  }) as LedgerRecord;

const NOW_UTC = new Date('2026-09-28T12:00:00.000Z');

test('the report shows this month and the delta against last month', () => {
  const aggregate = aggregateWithSessions([
    record({}),
    record({ costMicros: 4_000 }),
    record({ at: '2026-08-20T02:00:00.000Z', costMicros: 10_000 }),
  ]);
  const text = renderLedgerReport(aggregate, NOW_UTC);
  assert.ok(text.includes('2026-09'));
  assert.ok(text.includes('对比上月'));
  assert.ok(text.includes('↓')); // 5_000 < 10_000
  assert.ok(text.includes('¥')); // CNY symbol
});

test('an empty ledger says so instead of printing an empty month', () => {
  const text = renderLedgerReport(aggregateWithSessions([]), NOW_UTC);
  assert.ok(text.includes('台账还是空的'));
});

test('no history means no delta line, just the month block', () => {
  const text = renderLedgerReport(aggregateWithSessions([record({})]), NOW_UTC);
  assert.ok(!text.includes('对比上月'));
});

test('corrupted-line counts surface as a warning, never silently', () => {
  const aggregate = aggregateWithSessions([record({})], 2);
  const text = renderLedgerReport(aggregate, NOW_UTC);
  assert.ok(text.includes('2 行损坏'));
});

test('mixed currencies render as separate blocks', () => {
  const aggregate = aggregateWithSessions([record({}), record({ currency: 'USD', costMicros: 2_000 })]);
  const text = renderLedgerReport(aggregate, NOW_UTC);
  assert.ok(text.includes('$'));
  assert.ok(text.includes('¥'));
});

test('renderMonth shows model and day breakdowns with share bars', () => {
  const aggregate = aggregateWithSessions([
    record({}),
    record({ modelId: 'deepseek-v4-flash', pricedAs: 'deepseek-v4-flash', costMicros: 300 }),
    record({ at: '2026-09-16T00:00:00.000Z' }),
  ]);
  const text = renderMonth(aggregate.months[0]!);
  assert.ok(text.includes('deepseek-v4-pro'));
  assert.ok(text.includes('deepseek-v4-flash'));
  assert.ok(text.includes('按模型'));
  assert.ok(text.includes('按日'));
  assert.ok(text.includes('█'));
});

test('config validation catches a bad accounting mode, price rows and holiday format', () => {
  assert.equal(validateConfig({ accounting: 'own' }).length, 0);
  const problems = validateConfig({
    accounting: 'yolo' as never,
    prices: [
      { perMillion: {} } as never,
      { id: 'mystery', perMillion: { uncachedInput: -1, output: 2, cacheRead: 3 } } as never,
    ],
    holidays: ['2026-9-1'],
  });
  assert.equal(problems.length, 4);
  assert.ok(problems.some((p) => p.field === 'accounting'));
  assert.ok(problems.some((p) => p.field === 'prices' && p.message.includes('prices[0] 缺少 id')));
  assert.ok(problems.some((p) => p.field === 'prices' && p.message.includes('prices[1] (mystery)')));
  assert.ok(problems.some((p) => p.field === 'holidays'));
});
