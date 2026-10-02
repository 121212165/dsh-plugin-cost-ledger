/**
 * dsh wiring for the cost-ledger plugin.
 *
 * Accounting reuses price-aware's pure pricing core (copied, not imported — the
 * two plugins must stay independently installable). Every decision about a
 * number lives in ledger/ and pricing/; this file only moves events and renders text.
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
// type-only: these packages augment cordis' Context with the services used below
import type {} from '@deepseek-ai/dsh-commands';
import type {} from '@deepseek-ai/dsh-tools';
import { join } from 'node:path';

import { DEFAULT_CONFIG, validateConfig, type CostLedgerConfig } from './config.ts';
import { toBuckets, type RawUsage } from './ledger/record-helpers.ts';
import { LedgerStore, expandHome } from './ledger/store.ts';
import { aggregateWithSessions } from './ledger/aggregate.ts';
import { toCsv } from './ledger/csv.ts';
import { renderLedgerReport } from './ledger/report.ts';
import { DEEPSEEK_CATALOG, mergeCatalog, type PriceCatalog, type PriceEntry } from './pricing/catalog.ts';
import { costOf } from './pricing/cost.ts';
import { resolveModel } from './pricing/resolve.ts';

export const name = 'cost-ledger';
/**
 * Service names are the strings each service passes to cordis' `Service`
 * constructor — `commands` and `tools`, not the package names. A name that
 * resolves to no implementation makes cordis mark the plugin inactive.
 */
export const inject = ['commands', 'llm', 'sessions', 'tools'];

export interface Config extends CostLedgerConfig {}

export const Config = Schema.object({
  enabled: Schema.boolean().default(DEFAULT_CONFIG.enabled),
  accounting: Schema.union([Schema.const('own'), Schema.const('assume-price-aware')]).default('own'),
  dataDir: Schema.string().default(''),
  exportDir: Schema.string().default(''),
  prices: Schema.array(
    Schema.object({
      id: Schema.string(),
      currency: Schema.union([Schema.const('CNY'), Schema.const('USD'), Schema.const('EUR')]).default('CNY'),
      perMillion: Schema.object({
        cacheRead: Schema.number(),
        uncachedInput: Schema.number(),
        output: Schema.number(),
      }),
      peakMultiplier: Schema.number(),
      contextTokens: Schema.natural().default(1_000_000),
      maxOutputTokens: Schema.natural().default(256_000),
      aliases: Schema.array(Schema.string()).default([]),
      note: Schema.string().default(''),
    }),
  ).default([]),
  holidays: Schema.array(Schema.string()).default([]),
});

export function apply(ctx: Context, config: Config): void {
  const problems = validateConfig(config);
  if (problems.length) {
    throw new Error(`cost-ledger 配置无效 -> ${problems.map((p) => `${String(p.field)}: ${p.message}`).join('; ')}`);
  }
  const log = ctx.logger('cost-ledger');
  if (!config.enabled) return void log.info('disabled by config');

  const catalog: PriceCatalog = mergeCatalog(DEEPSEEK_CATALOG, config.prices as PriceEntry[]);
  const rules = { holidays: config.holidays };
  const store = new LedgerStore(config.dataDir);
  const exportDir = config.exportDir ? expandHome(config.exportDir) : store.dataDir;

  if (config.accounting === 'own') {
    ctx.on('session/event', (session, event) => {
      if (event.type !== 'assistant/message') return;
      const usage = event.data.usage as RawUsage | undefined;
      if (!usage) return;
      const sessionId = String((session as { id?: unknown }).id ?? 'session');
      // The assistant message's own source carries the provider/model pair that
      // actually served this turn. The agent/request waterfall payload is
      // {turn, step, signal} with no agent reference, so a map keyed off it
      // cannot be correlated back to a session — read it from the event instead.
      const source = (event.data as { message?: { source?: { provider?: string; model?: string } } }).message?.source;
      const model = { id: source?.model ?? 'unknown', provider: source?.provider };
      const resolution = resolveModel(model.id, catalog, { provider: model.provider });
      if (resolution.kind !== 'known') {
        log.debug(`unpriced event dropped (model ${model.id} not in sheet) — ledger stays complete for priced models`);
        return;
      }
      const buckets = toBuckets(usage);
      const at = new Date();
      const cost = costOf(buckets, resolution.entry, { at, rules });
      try {
        store.append(sessionId, {
          at,
          turn: event.data.turn,
          step: event.data.step,
          modelId: model.id,
          provider: model.provider,
          pricedAs: resolution.entry.id,
          ...(resolution.confidence < 0.9 ? { matchVia: resolution.via } : {}),
          reasoningTokens: Math.max(0, usage.reasoningTokens ?? 0),
          buckets,
          currency: cost.currency,
          costMicros: cost.micros,
        });
      } catch (error) {
        // a failed append must not break the agent loop; the gap shows up in recon
        log.warn(`ledger append failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  const report = (): string => {
    const all = store.readAll();
    return renderLedgerReport(aggregateWithSessions(all.records, all.skipped), new Date());
  };

  const csvMonth = (month: string): string => toCsv(store.readMonth(month));

  ctx.commands.register({
    name: 'ledger',
    description: '本月花费台账：总额、按模型/按日分布、对比上月',
    handler: () => ({ kind: 'success', text: report() }),
  });

  ctx.commands.register({
    name: 'ledger-export',
    description: '导出某个月的台账 CSV：/ledger-export 2026-09（缺省当月）',
    input: { hint: '[YYYY-MM]' },
    handler: async ({ rawInput }) => {
      const argument = String(rawInput ?? '').trim() || currentMonth();
      if (!/^\d{4}-\d{2}$/.test(argument)) {
        return { kind: 'error', text: `月份格式是 YYYY-MM，收到: ${argument}` };
      }
      const records = store.readMonth(argument);
      if (!records.length) return { kind: 'error', text: `${argument} 没有台账记录` };
      const file = join(exportDir, `cost-ledger-${argument}.csv`);
      store.writeCsv(file, csvMonth(argument));
      return { kind: 'success', text: `已导出 ${records.length} 条记录 -> ${file}` };
    },
  });

  ctx.tools.register(
    defineTool({
      name: 'ledger_query',
      description: '查询花费台账（本月汇总、按模型/按日分布）。用户问"这个月花了多少钱"时用这个。',
      parameters: {},
      output: {
        schema: { type: 'string' } as const,
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute() {
        return report();
      },
    }),
  );

  log.info(`mounted · accounting=${config.accounting} · dataDir=${store.dataDir}`);
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}
