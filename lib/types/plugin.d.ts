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
export declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
    enabled: Schema<boolean, boolean, "defined">;
    accounting: Schema<"assume-price-aware" | "own", "assume-price-aware" | "own", "defined">;
    dataDir: Schema<string, string, "defined">;
    exportDir: Schema<string, string, "defined">;
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
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
        id: Schema<string, string, "plain">;
        currency: Schema<"CNY" | "EUR" | "USD", "CNY" | "EUR" | "USD", "defined">;
        perMillion: Schema<Schemastery.ObjectS<NoInfer<{
            cacheRead: Schema<number, number, "plain">;
            uncachedInput: Schema<number, number, "plain">;
            output: Schema<number, number, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            cacheRead: Schema<number, number, "plain">;
            uncachedInput: Schema<number, number, "plain">;
            output: Schema<number, number, "plain">;
        }>>, "plain">;
        peakMultiplier: Schema<number, number, "plain">;
        contextTokens: Schema<number, number, "defined">;
        maxOutputTokens: Schema<number, number, "defined">;
        aliases: Schema<string[], string[], "defined">;
        note: Schema<string, string, "defined">;
    }>>[], "defined">;
    holidays: Schema<string[], string[], "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    enabled: Schema<boolean, boolean, "defined">;
    accounting: Schema<"assume-price-aware" | "own", "assume-price-aware" | "own", "defined">;
    dataDir: Schema<string, string, "defined">;
    exportDir: Schema<string, string, "defined">;
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
    } & import("@deepseek-ai/cosmokit").Dict)[], Schemastery.ObjectT<NoInfer<{
        id: Schema<string, string, "plain">;
        currency: Schema<"CNY" | "EUR" | "USD", "CNY" | "EUR" | "USD", "defined">;
        perMillion: Schema<Schemastery.ObjectS<NoInfer<{
            cacheRead: Schema<number, number, "plain">;
            uncachedInput: Schema<number, number, "plain">;
            output: Schema<number, number, "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            cacheRead: Schema<number, number, "plain">;
            uncachedInput: Schema<number, number, "plain">;
            output: Schema<number, number, "plain">;
        }>>, "plain">;
        peakMultiplier: Schema<number, number, "plain">;
        contextTokens: Schema<number, number, "defined">;
        maxOutputTokens: Schema<number, number, "defined">;
        aliases: Schema<string[], string[], "defined">;
        note: Schema<string, string, "defined">;
    }>>[], "defined">;
    holidays: Schema<string[], string[], "defined">;
}>>, "plain">;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=plugin.d.ts.map