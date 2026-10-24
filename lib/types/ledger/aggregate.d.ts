import { type Micros } from '../money.ts';
import { type TokenBuckets } from '../pricing/cost.ts';
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
    byModel: Slice[];
    byDay: Slice[];
}
export interface LedgerAggregate {
    months: MonthAggregate[];
    skippedLines: number;
}
/**
 * Aggregation groups by month, then slices per model and per day. Currencies
 * are never summed together: a mixed-currency month produces one aggregate per
 * currency, because a blended total would silently misprice one of them.
 */
export declare function aggregate(records: LedgerRecord[], skippedLines?: number): LedgerAggregate;
/** Convenience wrapper kept for callers that do not track the skipped count separately. */
export declare function aggregateWithSessions(records: LedgerRecord[], skippedLines?: number): LedgerAggregate;
//# sourceMappingURL=aggregate.d.ts.map