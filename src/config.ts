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

export const DEFAULT_CONFIG: CostLedgerConfig = {
  enabled: true,
  accounting: 'own',
  prices: [],
  holidays: [],
};

export interface ConfigProblem {
  field: keyof CostLedgerConfig;
  message: string;
}

export function validateConfig(config: Partial<CostLedgerConfig>): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  if (config.accounting && !['own', 'assume-price-aware'].includes(config.accounting)) {
    problems.push({ field: 'accounting', message: `accounting 需为 own|assume-price-aware，收到 ${config.accounting}` });
  }
  for (const [index, entry] of (config.prices ?? []).entries()) {
    if (!entry?.id) {
      problems.push({ field: 'prices', message: `prices[${index}] 缺少 id` });
      continue;
    }
    const perMillion = entry.perMillion ?? ({} as PriceEntry['perMillion']);
    for (const key of ['uncachedInput', 'output', 'cacheRead'] as const) {
      const value = perMillion[key];
      if (value === undefined || !Number.isFinite(value) || value < 0) {
        problems.push({ field: 'prices', message: `prices[${index}] (${entry.id}) 的 ${key} 需是 ≥0 的有限数` });
      }
    }
  }
  for (const day of config.holidays ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      problems.push({ field: 'holidays', message: `holidays 里的 ${day} 不是 YYYY-MM-DD` });
    }
  }
  return problems;
}
