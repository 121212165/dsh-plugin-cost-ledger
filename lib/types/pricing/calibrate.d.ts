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
    perMillion: {
        input: number;
        output: number;
        cacheRead: number;
    };
}
export declare function calibratePrices(rows: BillingRow[]): CalibratedPriceRow[];
//# sourceMappingURL=calibrate.d.ts.map