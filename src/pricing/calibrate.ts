/** Calibrate real prices from the relay's own billing logs (new-api one-api.db).
 *
 * Byte-level twin of dsh-plugin-quota's `meter.ts#calibratePrices` — the family
 * has no shared package (separate repos cannot import each other), so the
 * function lives duplicated on purpose and **the quota version is authoritative**:
 * fix bugs there first, then mirror the diff here. Quota computes the same
 * numbers for its own display; cost-ledger keeps a copy so both plugins can
 * reason about actually-billed $/M without a dependency.
 */
import type { Currency } from '../money.ts';

/** One billing-log row, as new-api writes it: flat micro-quota for the whole
 * call, no cache split. */
export interface BillingRow {
  model: string;
  quota: number;
  tokens: number;
}

/** Flattened price row shaped like quota's — deliberately NOT cost-ledger's
 * PriceEntry: calibration has no cache-split or peak-hour information, and a
 * fake split would be worse than none. */
export interface CalibratedPriceRow {
  match: string;
  currency: Currency;
  perMillion: { input: number; output: number; cacheRead: number };
}

export function calibratePrices(rows: BillingRow[]): CalibratedPriceRow[] {
  const buckets = new Map<string, { billed: number; tokens: number; calls: number }>();
  for (const row of rows) {
    if (!row.model || !Number.isFinite(row.quota) || row.quota <= 0 || !Number.isFinite(row.tokens) || row.tokens <= 0) continue;
    const bucket = buckets.get(row.model) ?? { billed: 0, tokens: 0, calls: 0 };
    bucket.billed += row.quota;
    bucket.tokens += row.tokens;
    bucket.calls += 1;
    buckets.set(row.model, bucket);
  }
  const prices: CalibratedPriceRow[] = [];
  for (const [model, bucket] of buckets) {
    if (bucket.tokens < 1000) continue; // not enough data to be meaningful
    const usdPerMillion = (bucket.billed / bucket.tokens) * 1e6 / 500_000;
    if (!Number.isFinite(usdPerMillion) || usdPerMillion <= 0) continue;
    const rounded = Math.round(usdPerMillion * 100) / 100;
    prices.push({ match: model, currency: 'USD', perMillion: { input: rounded, output: rounded, cacheRead: rounded } });
  }
  return prices.sort((a, b) => a.match.localeCompare(b.match));
}
