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
    at: string;
    turn: number;
    step: number;
    modelId: string;
    provider?: string | undefined;
    /** id of the price row the event was billed against */
    pricedAs: string;
    /** present only when the row was chosen by a low-confidence fuzzy match —
     * the number is an estimate, check the sheet before trusting it */
    matchVia?: string;
    buckets: TokenBuckets;
    reasoningTokens: number;
    currency: string;
    costMicros: Micros;
}
export declare function toRecord(sessionId: string, entry: LedgerEntryInput): LedgerRecord;
export interface LedgerEntryInput {
    at: Date;
    turn: number;
    step: number;
    modelId: string;
    provider?: string | undefined;
    pricedAs: string;
    matchVia?: string;
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
/** A line that cannot be trusted as a record is skipped, never thrown — one bad
 * line must not take the whole history down, and rewriting the file silently
 * would hide the corruption. */
export declare function parseRecordLine(line: string): LedgerRecord | null;
export declare function parseJsonl(content: string): ReadResult;
//# sourceMappingURL=record.d.ts.map