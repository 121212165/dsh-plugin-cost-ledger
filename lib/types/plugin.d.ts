/**
 * dsh wiring for the cost-ledger plugin.
 *
 * Accounting reuses price-aware's pure pricing core (copied, not imported — the
 * two plugins must stay independently installable). Every decision about a
 * number lives in ledger/ and pricing/; this file only moves events and renders text.
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { type CostLedgerConfig } from './config.ts';
export declare const name = "cost-ledger";
/**
 * Service names are the strings each service passes to cordis' `Service`
 * constructor — `commands` and `tools`, not the package names. A name that
 * resolves to no implementation makes cordis mark the plugin inactive.
 */
/**
 * Injects `commands`/`llm`/`sessions`/`tools`; provides the merged price
 * catalog to siblings via cordis `provide` — a profile that also mounts
 * price-aware resolves its unknown models against this sheet without extra
 * configuration (single direction, per plan 2.3).
 */
export declare const inject: string[];
export declare const provide: string[];
export interface Config extends CostLedgerConfig {
}
export declare const Config: Schema<Schemastery.ObjectS<{
    enabled: Schema<boolean, boolean>;
    accounting: Schema<"assume-price-aware" | "own", "assume-price-aware" | "own">;
    dataDir: Schema<string, string>;
    exportDir: Schema<string, string>;
    prices: Schema<({
        id?: string | null;
        currency?: "CNY" | "EUR" | "USD" | null;
        perMillion?: ({
            cacheRead?: number | null;
            uncachedInput?: number | null;
            output?: number | null;
        } & import("@deepseek-ai/cosmokit").Dict) | null;
        peakMultiplier?: number | null;
        contextTokens?: number | null;
        maxOutputTokens?: number | null;
        aliases?: string[] | null;
        note?: string | null;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<{
        id: Schema<string, string>;
        currency: Schema<"CNY" | "EUR" | "USD", "CNY" | "EUR" | "USD">;
        perMillion: Schema<Schemastery.ObjectS<{
            cacheRead: Schema<number, number>;
            uncachedInput: Schema<number, number>;
            output: Schema<number, number>;
        }>, Schemastery.ObjectT<{
            cacheRead: Schema<number, number>;
            uncachedInput: Schema<number, number>;
            output: Schema<number, number>;
        }>>;
        peakMultiplier: Schema<number, number>;
        contextTokens: Schema<number, number>;
        maxOutputTokens: Schema<number, number>;
        aliases: Schema<string[], string[]>;
        note: Schema<string, string>;
    }>[]>;
    holidays: Schema<string[], string[]>;
}>, Schemastery.ObjectT<{
    enabled: Schema<boolean, boolean>;
    accounting: Schema<"assume-price-aware" | "own", "assume-price-aware" | "own">;
    dataDir: Schema<string, string>;
    exportDir: Schema<string, string>;
    prices: Schema<({
        id?: string | null;
        currency?: "CNY" | "EUR" | "USD" | null;
        perMillion?: ({
            cacheRead?: number | null;
            uncachedInput?: number | null;
            output?: number | null;
        } & import("@deepseek-ai/cosmokit").Dict) | null;
        peakMultiplier?: number | null;
        contextTokens?: number | null;
        maxOutputTokens?: number | null;
        aliases?: string[] | null;
        note?: string | null;
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<{
        id: Schema<string, string>;
        currency: Schema<"CNY" | "EUR" | "USD", "CNY" | "EUR" | "USD">;
        perMillion: Schema<Schemastery.ObjectS<{
            cacheRead: Schema<number, number>;
            uncachedInput: Schema<number, number>;
            output: Schema<number, number>;
        }>, Schemastery.ObjectT<{
            cacheRead: Schema<number, number>;
            uncachedInput: Schema<number, number>;
            output: Schema<number, number>;
        }>>;
        peakMultiplier: Schema<number, number>;
        contextTokens: Schema<number, number>;
        maxOutputTokens: Schema<number, number>;
        aliases: Schema<string[], string[]>;
        note: Schema<string, string>;
    }>[]>;
    holidays: Schema<string[], string[]>;
}>>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=plugin.d.ts.map