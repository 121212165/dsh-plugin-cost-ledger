# dsh-plugin-cost-ledger

DeepSeek Harness (dsh) 插件：把每一次有价目的模型调用记进持久台账，出月度汇总、CSV 导出，并让 agent 能回答"这个月花了多少钱"。

price-aware（[dsh-plugin-price-aware](https://github.com/121212165/dsh-plugin-price-aware)）解决了"现在烧多快、要不要拦"；本插件解决"月度账本"：数据落盘、跨会话存活、可导出可对账。

## 功能

- **持久台账**：`accounting: own` 时，插件监听 `session/event` 的 `assistant/message` usage 事件，用内置价目表（DeepSeek 官方价，含高峰/错峰、缓存价）计价后逐条追加到 `dataDir` 下按月分文件的 JSONL（`ledger-2026-09.jsonl`）。会话结束、dsh 重启，账都在。
- **`/ledger`**：本月汇总卡——总额、调用次数、会话数、token 总量与缓存命中率、按模型分布（带占比条）、按日分布、与上月对比箭头。多币种逐块渲染，从不混算。
- **`/ledger-export [YYYY-MM]`**：把某月台账导出为 CSV（BOM + CRLF，Excel 直开），写到 `exportDir`（默认 `dataDir`）。
- **`ledger_query` 模型工具**：agent 被问花费时自己查台账。
- **损坏容错**：崩溃留下的半行 JSON 被跳过并计数，文件永不静默改写；`/ledger` 输出里会提示"N 行损坏"。

## 安装
> 从源码安装需要先构建：`npm install` 会经 `prepare` 脚本自动产出 `lib/`（`npm run build` 也可手动触发）；npm 安装则无需此步。


```sh
# 把本目录放进 profile 的 node_modules（或 npm install 后 dsh plugin add 指向它），
# 再在 profile 的 cordis.patch.yml 里加入 cordis.patch.yml 的 insert 行。
```

最小配置（全部可省略，见下方逐项说明）：

```yaml
- insert:
    - id: cost-ledger
      name: dsh-plugin-cost-ledger
      config:
        enabled: true
        accounting: own
```

## 配置

| 字段 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 关掉后插件不挂任何东西 |
| `accounting` | `own` | `own`：自己从 session 事件记账；`assume-price-aware`：price-aware 已挂载并负责记账，本插件只读台账文件做报表 |
| `dataDir` | `~/.dsh/cost-ledger` | JSONL 台账目录，`~` 会展开 |
| `exportDir` | `dataDir` | CSV 导出目录 |
| `currency` | `auto` | 记录跟随价目行的币种；此项只影响兜底显示 |
| `prices` | `[]` | 中转/自定价目，形状与 price-aware.prices 完全一致 |
| `holidays` | `[]` | 按错峰计价的北京时间日期（YYYY-MM-DD） |
| `reportMonths` | `3` | 报告向回看几个月 |

## 数据 schema（JSONL 每行）

```json
{"v":1,"sessionId":"…","at":"2026-09-15T02:30:00.000Z","turn":3,"step":1,
 "modelId":"deepseek-v4-pro","provider":"deepseek","pricedAs":"deepseek-v4-pro",
 "buckets":{"uncachedInput":1000,"cacheRead":90000,"output":500,"cacheWrite":0},
 "reasoningTokens":400,"currency":"CNY","costMicros":225000000}
```

`v` 是 schema 版本；读入时校验，不认识的行跳过并计数。金额单位是 micro（1e-6 币种单位），与 price-aware 的 `money.ts` 同一约定。

## 与 price-aware 共存

两个插件都挂载时，把本插件设为 `accounting: assume-price-aware`，只做持久化报表，不重复记账（注意：该模式下记录仍由本插件的读路径聚合，price-aware 需要把自己的 ledger 写入同一 dataDir 的功能暂未提供前，assume 模式实际读到的是本插件 own 模式或历史留下的文件——**当前实现里 assume-price-aware 等价于"只报表不记新账"**）。`own` 模式与 price-aware 并行记账不会互相干扰，只是各算各的。

## 设计取舍

- **JSONL 而不是 storage seam**：官方 `ctx.storageDomain` 需要 profile 同时挂 `dsh-storage` + backend + `storage-domain` 三行，对插件是重组装依赖；按月分文件的 JSONL 零依赖、可手改、可异地备份。storage 路线列为未来选项。
- **定价核心复制而非依赖**：`src/pricing/` 与 `money.ts` 从 price-aware 复制（MIT，同作者），两个插件保持独立可安装，不产生运行时耦合。
- **未知模型丢事件不记账**：价表里没有的模型事件被跳过并打 debug 日志——错账比少账更糟。

## 验证状态

- `tsc --noEmit` 通过；`node --test` 30 个测试全绿（记账解析、容错、月聚合、跨月边界、多币种隔离、CSV 转义、store 读写、报告渲染、配置校验）。
- **未在运行中的 dsh 里 live mount 验证**。事件面（`agent/request`、`session/event`、`session/disposed`）与 price-aware 使用并验证过的完全一致，但 `commands`/`tools` 的实际注册结果需要在真实 dsh 里确认。

## 已知局限

- 台账文件暂时手装手清（无 compaction/归档命令）。
- `assume-price-aware` 模式目前只是"只报表"，不会替 price-aware 落盘。
- 导出 CSV 不含会话标题（host 侧拿不到友好会话名，只有 sessionId）。
