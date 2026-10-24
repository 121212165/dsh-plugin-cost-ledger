import type { TokenBuckets } from '../pricing/cost.ts';
/**
 * dsh's `assistant/message.usage` counts are DISJOINT by contract: `inputTokens`
 * is uncached input only, and adapters whose providers fold the cache into a
 * single `prompt_tokens` subtract it before publishing. (Same contract as
 * price-aware's ledger; reasoning tokens are a subset of output everywhere.)
 */
export interface RawUsage {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    reasoningTokens?: number;
}
export declare function toBuckets(usage: RawUsage, inputIncludesCache?: boolean): TokenBuckets;
//# sourceMappingURL=record-helpers.d.ts.map