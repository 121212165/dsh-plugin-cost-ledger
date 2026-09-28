import { sumMicros, type Micros } from '../money.ts';
import { emptyBuckets, mergeBuckets, totalTokens, type TokenBuckets } from '../pricing/cost.ts';
import type { LedgerRecord } from './record.ts';

export interface Slice {
  key: string;
  costMicros: Micros;
  tokens: number;
  events: number;
  buckets: TokenBuckets;
}

export interface MonthAggregate {
  /** YYYY-MM */
  month: string;
  currency: string;
  costMicros: Micros;
  tokens: number;
  events: number;
  sessions: number;
  buckets: TokenBuckets;
  byModel: Slice[]; // descending by cost
  byDay: Slice[]; // in encounter order
}

export interface LedgerAggregate {
  months: MonthAggregate[]; // ascending by month, then currency
  skippedLines: number;
}

/**
 * Aggregation groups by month, then slices per model and per day. Currencies
 * are never summed together: a mixed-currency month produces one aggregate per
 * currency, because a blended total would silently misprice one of them.
 */
export function aggregate(records: LedgerRecord[], skippedLines = 0): LedgerAggregate {
  const months = new Map<string, Map<string, MonthAggregate>>();
  const sessionsByBucket = new Map<MonthAggregate, Set<string>>();
  for (const record of records) {
    if (!record.at || typeof record.at !== 'string') continue;
    const month = record.at.slice(0, 7);
    const currency = record.currency || 'unknown';
    let byCurrency = months.get(month);
    if (!byCurrency) {
      byCurrency = new Map();
      months.set(month, byCurrency);
    }
    let bucket = byCurrency.get(currency);
    if (!bucket) {
      bucket = {
        month,
        currency,
        costMicros: 0,
        tokens: 0,
        events: 0,
        sessions: 0,
        buckets: emptyBuckets(),
        byModel: [],
        byDay: [],
      };
      byCurrency.set(currency, bucket);
      sessionsByBucket.set(bucket, new Set());
    }
    bucket.costMicros = sumMicros(bucket.costMicros, record.costMicros);
    bucket.buckets = mergeBuckets(bucket.buckets, record.buckets);
    bucket.tokens += totalTokens(record.buckets);
    bucket.events++;
    sessionsByBucket.get(bucket)!.add(record.sessionId);
    sliceOf(bucket.byModel, record.modelId, record, true);
    sliceOf(bucket.byDay, record.at.slice(0, 10), record, false);
  }
  const out: MonthAggregate[] = [];
  for (const byCurrency of months.values()) {
    for (const bucket of byCurrency.values()) {
      bucket.sessions = sessionsByBucket.get(bucket)!.size;
      out.push(bucket);
    }
  }
  out.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : a.currency.localeCompare(b.currency)));
  return { months: out, skippedLines };
}

/** Convenience wrapper kept for callers that do not track the skipped count separately. */
export function aggregateWithSessions(records: LedgerRecord[], skippedLines = 0): LedgerAggregate {
  return aggregate(records, skippedLines);
}

function sliceOf(slices: Slice[], key: string, record: LedgerRecord, sortNeeded: boolean): void {
  let slice = slices.find((candidate) => candidate.key === key);
  if (!slice) {
    slice = { key, costMicros: 0, tokens: 0, events: 0, buckets: emptyBuckets() };
    slices.push(slice);
  }
  slice.costMicros = sumMicros(slice.costMicros, record.costMicros);
  slice.tokens += totalTokens(record.buckets);
  slice.events++;
  slice.buckets = mergeBuckets(slice.buckets, record.buckets);
  if (sortNeeded) slices.sort((a, b) => b.costMicros - a.costMicros);
}
