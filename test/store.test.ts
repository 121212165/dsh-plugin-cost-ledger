import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LedgerStore } from '../src/ledger/store.ts';
import type { LedgerEntryInput } from '../src/ledger/record.ts';

const entry = (at: string): LedgerEntryInput => ({
  at: new Date(at),
  turn: 1,
  step: 1,
  modelId: 'deepseek-v4-pro',
  pricedAs: 'deepseek-v4-pro',
  reasoningTokens: 0,
  buckets: { uncachedInput: 1000, cacheRead: 0, output: 500, cacheWrite: 0 },
  currency: 'CNY',
  costMicros: 1_000_000,
});

function tempStore(now = () => new Date()): { store: LedgerStore; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'cost-ledger-'));
  return { store: new LedgerStore(dir, now), dir };
}

test('appends land in one file per month and read back intact', () => {
  const { store, dir } = tempStore();
  store.append('s1', entry('2026-09-15T02:00:00.000Z'));
  store.append('s1', entry('2026-09-20T02:00:00.000Z'));
  store.append('s2', entry('2026-10-02T02:00:00.000Z'));
  assert.ok(existsSync(join(dir, 'ledger-2026-09.jsonl')));
  assert.ok(existsSync(join(dir, 'ledger-2026-10.jsonl')));
  assert.equal(store.readMonth('2026-09').length, 2);
  assert.equal(store.readMonth('2026-10').length, 1);
  const all = store.readAll();
  assert.equal(all.records.length, 3);
  assert.equal(all.skipped, 0);
  rmSync(dir, { recursive: true, force: true });
});

test('a torn line written by a crash is skipped on read, not repaired silently', () => {
  const { store, dir } = tempStore();
  store.append('s1', entry('2026-09-15T02:00:00.000Z'));
  const file = join(dir, 'ledger-2026-09.jsonl');
  writeFileSync(file, readFileSync(file, 'utf8') + '{"v":1,"sessionId":"torn\n', 'utf8');
  const all = store.readAll();
  assert.equal(all.records.length, 1);
  assert.equal(all.skipped, 1);
  rmSync(dir, { recursive: true, force: true });
});

test('files that do not match the ledger naming scheme are ignored', () => {
  const { store, dir } = tempStore();
  writeFileSync(join(dir, 'notes.jsonl'), 'hello\n', 'utf8');
  writeFileSync(join(dir, 'ledger-2026-13.jsonl'), 'not a real month\n', 'utf8');
  const all = store.readAll();
  assert.deepEqual(all, { records: [], skipped: 0 });
  rmSync(dir, { recursive: true, force: true });
});

test('a missing data directory reads as empty and is created on first append', () => {
  const dir = join(tmpdir(), `cost-ledger-missing-${Date.now()}`);
  const store = new LedgerStore(dir);
  assert.deepEqual(store.readAll(), { records: [], skipped: 0 });
  store.append('s1', entry('2026-09-15T02:00:00.000Z'));
  assert.ok(existsSync(dir));
  rmSync(dir, { recursive: true, force: true });
});

test('a ~ data dir expands to the home directory', () => {
  const store = new LedgerStore('~/.dsh/cost-ledger-test');
  assert.ok(store.dataDir.includes('.dsh'));
  assert.ok(!store.dataDir.startsWith('~'));
});

test('writeCsv creates the export even when the target directory does not exist', () => {
  const { store, dir } = tempStore();
  const target = join(dir, 'exports', 'deep', 'out.csv');
  store.writeCsv(target, 'a,b\r\n');
  assert.ok(existsSync(target));
  rmSync(dir, { recursive: true, force: true });
});

test('readMonth rejects a malformed month instead of reading arbitrary paths', () => {
  const { store } = tempStore();
  assert.deepEqual(store.readMonth('../../etc'), []);
  assert.deepEqual(store.readMonth('2026-9'), []);
  rmSync(store.dataDir, { recursive: true, force: true });
});
