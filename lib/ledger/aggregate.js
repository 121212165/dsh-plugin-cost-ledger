import { sumMicros } from '../money.js';
import { emptyBuckets, mergeBuckets, totalTokens } from '../pricing/cost.js';
/**
 * Aggregation groups by month, then slices per model and per day. Currencies
 * are never summed together: a mixed-currency month produces one aggregate per
 * currency, because a blended total would silently misprice one of them.
 */
export function aggregate(records, skippedLines = 0) {
    const months = new Map();
    const sessionsByBucket = new Map();
    for (const record of records) {
        if (!record.at || typeof record.at !== 'string')
            continue;
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
        sessionsByBucket.get(bucket).add(record.sessionId);
        sliceOf(bucket.byModel, record.modelId, record, true);
        sliceOf(bucket.byDay, record.at.slice(0, 10), record, false);
    }
    const out = [];
    for (const byCurrency of months.values()) {
        for (const bucket of byCurrency.values()) {
            bucket.sessions = sessionsByBucket.get(bucket).size;
            out.push(bucket);
        }
    }
    out.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : a.currency.localeCompare(b.currency)));
    return { months: out, skippedLines };
}
/** Convenience wrapper kept for callers that do not track the skipped count separately. */
export function aggregateWithSessions(records, skippedLines = 0) {
    return aggregate(records, skippedLines);
}
function sliceOf(slices, key, record, sortNeeded) {
    let slice = slices.find((candidate) => candidate.key === key);
    if (!slice) {
        slice = { key, costMicros: 0, tokens: 0, events: 0, buckets: emptyBuckets() };
        slices.push(slice);
    }
    slice.costMicros = sumMicros(slice.costMicros, record.costMicros);
    slice.tokens += totalTokens(record.buckets);
    slice.events++;
    slice.buckets = mergeBuckets(slice.buckets, record.buckets);
    if (sortNeeded)
        slices.sort((a, b) => b.costMicros - a.costMicros);
}
//# sourceMappingURL=aggregate.js.map