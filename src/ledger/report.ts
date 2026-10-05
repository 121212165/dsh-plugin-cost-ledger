import { toMajor, type Currency } from '../money.ts';
import type { Slice } from './aggregate.ts';
import type { MonthAggregate } from './aggregate.ts';
import type { LedgerAggregate } from './aggregate.ts';

const SYMBOL: Record<string, string> = { CNY: '¥', USD: '$', EUR: '€' };

function money(micros: number, currency: string): string {
  const symbol = SYMBOL[currency] ?? `${currency} `;
  return `${symbol}${toMajor(micros).toFixed(4)}`;
}

function microsText(micros: number): string {
  return toMajor(micros).toFixed(4);
}

function bar(share: number, width = 20): string {
  const filled = Math.round(Math.max(0, Math.min(1, share)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function sliceLines(slices: Slice[], total: number, limit: number, label: (slice: Slice) => string): string[] {
  return slices.slice(0, limit).map((slice) => {
    const share = total > 0 ? slice.costMicros / total : 0;
    return `  ${label(slice).padEnd(24)} ${microsText(slice.costMicros)}  ${bar(share)} ${Math.round(share * 100)}%`;
  });
}

export function renderMonth(month: MonthAggregate): string {
  const lines = [
    `${month.month}（${month.currency}）：${money(month.costMicros, month.currency)} · ${month.events} 次调用 · ${month.sessions} 个会话 · ${Math.round(month.tokens / 1000)}k tokens（缓存命中 ${(month.buckets.cacheRead > 0 ? month.buckets.cacheRead / Math.max(1, month.buckets.cacheRead + month.buckets.uncachedInput) : 0) * 100}%）`,
  ];
  if (month.byModel.length) {
    lines.push('按模型:');
    lines.push(...sliceLines(month.byModel, month.costMicros, 8, (s) => s.key));
  }
  if (month.byDay.length > 1) {
    lines.push('按日:');
    lines.push(...sliceLines(month.byDay, month.costMicros, 31, (s) => s.key.slice(5)));
  }
  return lines.join('\n');
}

/** /ledger 的输出：本月汇总 + 与上月的对比。多币种时逐块渲染，绝不混算。 */
export function renderLedgerReport(aggregate: LedgerAggregate, now: Date): string {
  if (!aggregate.months.length) return '台账还是空的。记下第一笔花费后这里会出月度汇总。';
  const thisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const blocks: string[] = [];
  for (const currency of new Set(aggregate.months.map((month) => month.currency))) {
    const months = aggregate.months.filter((month) => month.currency === currency);
    const current = months.find((month) => month.month === thisMonth);
    const previous = months.filter((month) => month.month < thisMonth).at(-1);
    const currentBlock = current
      ? renderMonth(current)
      : `${thisMonth}（${currency}）：本月还没有记录`;
    if (previous && current) {
      const delta = current.costMicros - previous.costMicros;
      const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
      blocks.push(
        `${currentBlock}\n对比上月: ${arrow} ${money(Math.abs(delta), currency)}（上月 ${money(previous.costMicros, currency)}）\n${monthOverMonth(current.costMicros, previous.costMicros)}`,
      );
    } else {
      blocks.push(currentBlock);
    }
  }
  if (aggregate.skippedLines > 0) {
    blocks.push(`⚠ 台账文件里有 ${aggregate.skippedLines} 行损坏被跳过（文件未改动，可手工修复）`);
  }
  return blocks.join('\n\n');
}

/** 环比结论：把差值翻译成一句人话。阈值钉死在测试里：±10% 内算持平，
 * ±10-30% 算涨/落，超过 ±30% 点名"明显"并提示看用量结构。 */
export function monthOverMonth(current: number, previous: number): string {
  if (!Number.isFinite(previous) || previous <= 0) return current > 0 ? '环比结论: 上月没有基数，无从谈起' : '';
  const pct = Math.round((current / previous - 1) * 100);
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→';
  let verdict = '基本持平';
  if (pct >= 30) verdict = '明显上涨——看看是不是用量结构变了';
  else if (pct >= 10) verdict = '在上涨，留意趋势';
  else if (pct <= -30) verdict = '明显下降';
  else if (pct <= -10) verdict = '在回落';
  return `环比结论: ${arrow} ${Math.abs(pct)}% —— ${verdict}`;
}
