/** The byte-level twin of quota's calibratePrices must behave identically: same
 * buckets, same noise rejection, same $/M math. Fix bugs in quota first, then
 * mirror the diff here.
 * @module test/calibrate */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calibratePrices } from '../src/pricing/calibrate.ts';

test('calibratePrices derives real $/M from billing logs and ignores noise', () => {
  const rows = [
    { model: 'deepseek-chat', quota: 500_000, tokens: 1_000_000 }, // exactly $1/M
    { model: 'deepseek-chat', quota: 250_000, tokens: 500_000 }, // same price, averages out
    { model: 'gpt-x', quota: 100, tokens: 100 }, // too little data: skipped
    { model: '', quota: 5_000_000, tokens: 1_000_000 }, // no model: skipped
    { model: 'junk', quota: -1, tokens: 1_000 }, // bad numbers: skipped
    { model: 'junk', quota: Number.NaN, tokens: 1_000 },
  ];
  const prices = calibratePrices(rows);
  assert.deepEqual(prices.map((row) => row.match), ['deepseek-chat']);
  assert.equal(prices[0]!.perMillion.input, 1);
  assert.equal(prices[0]!.currency, 'USD');
});
