import type { Micros } from '../money.ts';
import type { TokenBuckets } from '../pricing/cost.ts';

/**
 * One priced model call, persisted as a JSONL line. The file is the contract:
 * schema version first, so a future field rename can be detected on read
 * instead of silently mis-aggregating an old file.
 */
export interface LedgerRecord {
  v: 1;
  sessionId: string;
  at: string; // ISO timestamp
  turn: number;
  step: number;
  modelId: string;
  provider?: string;
  /** id of the price row the event was billed against */
  pricedAs: string;
  buckets: TokenBuckets;
  reasoningTokens: number;
  currency: string;
  costMicros: Micros;
}

export function toRecord(sessionId: string, entry: LedgerEntryInput): LedgerRecord {
  return {
    v: 1,
    sessionId,
    at: entry.at.toISOString(),
    turn: entry.turn,
    step: entry.step,
    modelId: entry.modelId,
    provider: entry.provider,
    pricedAs: entry.pricedAs,
    buckets: entry.buckets,
    reasoningTokens: entry.reasoningTokens,
    currency: entry.currency,
    costMicros: entry.costMicros,
  };
}

export interface LedgerEntryInput {
  at: Date;
  turn: number;
  step: number;
  modelId: string;
  provider?: string;
  pricedAs: string;
  reasoningTokens: number;
  buckets: TokenBuckets;
  currency: string;
  costMicros: Micros;
}

export interface ReadResult {
  records: LedgerRecord[];
  /** lines that failed to parse or failed validation; the file keeps them */
  skipped: number;
}

const VALID_BUCKET_KEYS = ['uncachedInput', 'output', 'cacheRead', 'cacheWrite'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A line that cannot be trusted as a record is skipped, never thrown — one bad
 * line must not take the whole history down, and rewriting the file silently
 * would hide the corruption. */
export function parseRecordLine(line: string): LedgerRecord | null {
  const text = line.trim();
  if (!text) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  if (value.v !== 1) return null;
  if (typeof value.sessionId !== 'string' || typeof value.at !== 'string') return null;
  if (Number.isNaN(Date.parse(value.at))) return null;
  if (typeof value.modelId !== 'string' || typeof value.pricedAs !== 'string' || typeof value.currency !== 'string') return null;
  if (typeof value.costMicros !== 'number' || !Number.isFinite(value.costMicros) || value.costMicros < 0) return null;
  if (!isRecord(value.buckets)) return null;
  for (const key of VALID_BUCKET_KEYS) {
    const n = value.buckets[key];
    if (n !== undefined && (typeof n !== 'number' || !Number.isFinite(n) || n < 0)) return null;
  }
  return value as unknown as LedgerRecord;
}

export function parseJsonl(content: string): ReadResult {
  let skipped = 0;
  const records: LedgerRecord[] = [];
  for (const line of content.split(/\r?\n/)) {
    const record = parseRecordLine(line);
    if (record) records.push(record);
    else if (line.trim()) skipped++;
  }
  return { records, skipped };
}
