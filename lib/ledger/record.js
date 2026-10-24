export function toRecord(sessionId, entry) {
    return {
        v: 1,
        sessionId,
        at: entry.at.toISOString(),
        turn: entry.turn,
        step: entry.step,
        modelId: entry.modelId,
        provider: entry.provider,
        pricedAs: entry.pricedAs,
        ...(entry.matchVia ? { matchVia: entry.matchVia } : {}),
        buckets: entry.buckets,
        reasoningTokens: entry.reasoningTokens,
        currency: entry.currency,
        costMicros: entry.costMicros,
    };
}
const VALID_BUCKET_KEYS = ['uncachedInput', 'output', 'cacheRead', 'cacheWrite'];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** A line that cannot be trusted as a record is skipped, never thrown — one bad
 * line must not take the whole history down, and rewriting the file silently
 * would hide the corruption. */
export function parseRecordLine(line) {
    const text = line.trim();
    if (!text)
        return null;
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        return null;
    }
    if (!isRecord(value))
        return null;
    if (value.v !== 1)
        return null;
    if (typeof value.sessionId !== 'string' || typeof value.at !== 'string')
        return null;
    if (Number.isNaN(Date.parse(value.at)))
        return null;
    if (typeof value.modelId !== 'string' || typeof value.pricedAs !== 'string' || typeof value.currency !== 'string')
        return null;
    if (typeof value.costMicros !== 'number' || !Number.isFinite(value.costMicros) || value.costMicros < 0)
        return null;
    if (!isRecord(value.buckets))
        return null;
    for (const key of VALID_BUCKET_KEYS) {
        const n = value.buckets[key];
        if (n !== undefined && (typeof n !== 'number' || !Number.isFinite(n) || n < 0))
            return null;
    }
    return value;
}
export function parseJsonl(content) {
    let skipped = 0;
    const records = [];
    for (const line of content.split(/\r?\n/)) {
        const record = parseRecordLine(line);
        if (record)
            records.push(record);
        else if (line.trim())
            skipped++;
    }
    return { records, skipped };
}
//# sourceMappingURL=record.js.map