/** Wire-level assembly tests for cost-ledger: the real apply() against a mock
 * context, driving real usage events through the session/event listener into a
 * real temp ledger. First assembly coverage for this plugin (family audit:
 * all P0/P1 lived in plugin.ts with zero tests).
 * @module test/plugin.test */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { makeHarness, type Harness } from './harness.ts';

async function mounted(config: Record<string, unknown> = {}): Promise<Harness> {
  const harness = makeHarness();
  await harness.apply(config);
  return harness;
}

const usage = { inputTokens: 1_000, outputTokens: 500, cacheReadTokens: 2_000, reasoningTokens: 100 };

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

test('invalid config fails loud naming cost-ledger; disabled mounts nothing', async () => {
  const bad = makeHarness();
  await assert.rejects(bad.apply({ accounting: 'bogus' }), /cost-ledger 配置无效/);

  const off = makeHarness();
  await off.apply({ enabled: false });
  assert.equal(off.commands.length, 0);
  assert.equal(off.tools.length, 0);
});

test('apply wires two commands, the ledger_query tool, and the session/event listener', async () => {
  const harness = await mounted();
  assert.deepEqual(
    harness.commands.map((command) => command.name).sort(),
    ['ledger', 'ledger-export'],
  );
  assert.equal(harness.tool('ledger_query').name, 'ledger_query');
  assert.ok(harness.listeners.some((listener) => listener.event === 'session/event'));
});

test('a real usage event lands in the ledger and shows up in /ledger and ledger_query', async () => {
  const harness = await mounted();
  harness.emitUsage('session-abc123', 'deepseek-flash', usage);

  const report = (await harness.command('ledger').handler({})).text;
  assert.ok(report.includes('deepseek-flash'), report);
  assert.match(report, /[¥$€]/); // some currency figure rendered

  const query = await harness.tool('ledger_query').execute({});
  assert.ok(query.includes('deepseek-flash'));
});

test('accounting: assume-price-aware registers no listener (price-aware owns the events)', async () => {
  const harness = await mounted({ accounting: 'assume-price-aware' });
  assert.equal(harness.listeners.length, 0);
  // with no listener there is nothing to emit into — the ledger stays empty
  const report = (await harness.command('ledger').handler({})).text;
  assert.ok(!report.includes('deepseek-flash'));
});

test('unpriced models are dropped with the ledger staying loadable', async () => {
  const harness = await mounted();
  harness.emitUsage('session-abc123', 'totally-unknown-model', usage);
  const report = (await harness.command('ledger').handler({})).text;
  assert.ok(!report.includes('totally-unknown-model'));
});

test('/ledger-export writes a real CSV for the month and rejects bad months', async () => {
  const harness = await mounted();
  harness.emitUsage('session-abc123', 'deepseek-flash', usage);

  const month = currentMonth();
  const result = await harness.command('ledger-export').handler({ rawInput: month });
  assert.ok(result.text.includes('已导出'), result.text);
  const csvPath = /-> (.+\.csv)$/.exec(result.text)![1]!;
  assert.ok(existsSync(csvPath), csvPath);
  const csv = readFileSync(csvPath, 'utf8');
  assert.ok(csv.includes('deepseek-flash'), csv);

  const badMonth = await harness.command('ledger-export').handler({ rawInput: '2026-13' });
  assert.equal(badMonth.kind, 'error');

  const empty = await harness.command('ledger-export').handler({ rawInput: '1999-01' });
  assert.equal(empty.kind, 'error');
  assert.ok(empty.text.includes('没有台账记录'));
});

test('a listener append failure does not break the loop (bad usage tolerated)', async () => {
  const harness = await mounted();
  // garbage usage must not throw out of the listener
  harness.emitUsage('session-abc123', 'deepseek-flash', { inputTokens: Number.NaN });
  const report = (await harness.command('ledger').handler({})).text;
  assert.equal(typeof report, 'string');
});
