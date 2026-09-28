import type { LedgerRecord } from './record.ts';

const HEADER = [
  'timestamp',
  'session_id',
  'model',
  'priced_as',
  'currency',
  'uncached_input',
  'cache_read',
  'cache_write',
  'output',
  'reasoning_tokens',
  'cost_micros',
  'turn',
  'step',
] as const;

function csvField(value: string): string {
  // only quotes, commas, newlines and the leading BOM-zero-width space need quoting;
  // anything else goes through verbatim so spreadsheets see plain numbers
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(records: LedgerRecord[]): string {
  const rows = [HEADER.join(',')];
  for (const record of records) {
    const buckets = record.buckets;
    rows.push(
      [
        record.at,
        record.sessionId,
        record.modelId,
        record.pricedAs,
        record.currency,
        String(buckets.uncachedInput ?? 0),
        String(buckets.cacheRead ?? 0),
        String(buckets.cacheWrite ?? 0),
        String(buckets.output ?? 0),
        String(record.reasoningTokens ?? 0),
        String(record.costMicros),
        String(record.turn),
        String(record.step),
      ]
        .map(csvField)
        .join(','),
    );
  }
  // CRLF + UTF-8 BOM so Excel opens the file without mangling it
  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}
