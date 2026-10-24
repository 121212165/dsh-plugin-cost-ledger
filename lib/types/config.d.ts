import type { PriceEntry } from './pricing/catalog.ts';
export interface CostLedgerConfig {
    enabled: boolean;
    /** own = record from session events with the bundled price sheet;
     * assume-price-aware = price-aware is mounted and owns accounting, so this
     * plugin only reads what is already in the ledger files. */
    accounting: 'own' | 'assume-price-aware';
    /** directory for the JSONL files; ~ expands to the home directory */
    dataDir?: string;
    /** default export directory for /ledger-export (defaults to the data dir) */
    exportDir?: string;
    prices: PriceEntry[];
    /** Beijing YYYY-MM-DD dates billed at off-peak */
    holidays: string[];
}
export declare const DEFAULT_CONFIG: CostLedgerConfig;
export interface ConfigProblem {
    field: keyof CostLedgerConfig;
    message: string;
}
export declare function validateConfig(config: Partial<CostLedgerConfig>): ConfigProblem[];
//# sourceMappingURL=config.d.ts.map