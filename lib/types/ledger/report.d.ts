import type { MonthAggregate } from './aggregate.ts';
import type { LedgerAggregate } from './aggregate.ts';
export declare function renderMonth(month: MonthAggregate): string;
/** /ledger 的输出：本月汇总 + 与上月的对比。多币种时逐块渲染，绝不混算。 */
export declare function renderLedgerReport(aggregate: LedgerAggregate, now: Date): string;
/** 环比结论：把差值翻译成一句人话。阈值钉死在测试里：±10% 内算持平，
 * ±10-30% 算涨/落，超过 ±30% 点名"明显"并提示看用量结构。 */
export declare function monthOverMonth(current: number, previous: number): string;
//# sourceMappingURL=report.d.ts.map