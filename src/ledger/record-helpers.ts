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

export function toBuckets(usage: RawUsage, inputIncludesCache = false): TokenBuckets {
  const cacheRead = Math.max(0, usage.cacheReadTokens ?? 0);
  const rawInput = Math.max(0, usage.inputTokens ?? 0);
  return {
    uncachedInput: inputIncludesCache ? Math.max(0, rawInput - cacheRead) : rawInput,
    cacheRead,
    output: Math.max(0, usage.outputTokens ?? 0),
    cacheWrite: Math.max(0, usage.cacheWriteTokens ?? 0),
  };
}
