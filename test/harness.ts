/** Assembly-layer harness for cost-ledger: a scripted mock dsh context that the
 * real apply() wires against. Captures command/tool registrations, the provided
 * `cost-ledger` service and the session/event listener so tests can drive real
 * usage events into the ledger over a real temp directory. The mock itself
 * lives in @dsh-family/kit; this file adds cost-ledger's event shape.
 * @module test/harness */

import { applyOnce, createMockCtx, tempDir, type Listener } from '@dsh-family/kit/kit/test-harness';

export interface CapturedCommand {
  name: string;
  description: string;
  handler: (args: { rawInput?: string }) => { kind: string; text: string } | Promise<{ kind: string; text: string }>;
}

export interface CapturedTool {
  name: string;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export type CapturedListener = Listener;

export interface Harness {
  commands: CapturedCommand[];
  tools: CapturedTool[];
  listeners: CapturedListener[];
  /** Services handed to cordis via `ctx.provide(name, value)`. */
  provided: Record<string, unknown>;
  dataDir: string;
  apply(config: Record<string, unknown>): Promise<void>;
  command(name: string): CapturedCommand;
  tool(name: string): CapturedTool;
  /** Feed one assistant/message usage event into the real listener. */
  emitUsage(sessionId: string, model: string, usage: Record<string, number>, turn?: number): void;
}

export function makeHarness(): Harness {
  const mock = createMockCtx<CapturedCommand, CapturedTool, never>();
  const dataDir = tempDir('cost-ledger-wire-');

  // apply once per harness — a second call would double-register.
  // Schema defaults (accounting: 'own' etc.) only apply through the host —
  // a direct apply() call gets the plain object, so restate the defaults.
  let pending: Record<string, unknown> = {};
  let mounted = false;
  const applied = applyOnce(() =>
    import('../src/plugin.ts').then(({ apply }) =>
      apply(mock.ctx as never, { enabled: true, accounting: 'own', dataDir, ...pending } as never),
    ),
  );

  return {
    commands: mock.commands,
    tools: mock.tools,
    listeners: mock.listeners,
    provided: mock.provided,
    dataDir,
    apply(config: Record<string, unknown>) {
      if (!mounted) {
        mounted = true;
        pending = config;
      }
      return applied();
    },
    command: mock.command,
    tool: mock.tool,
    emitUsage(sessionId: string, model: string, usage: Record<string, number>, turn = 1): void {
      const callback = mock.listener('session/event').callback as unknown as (
        session: unknown,
        event: unknown,
      ) => void;
      callback(
        { id: sessionId },
        {
          type: 'assistant/message',
          data: {
            turn,
            step: 0,
            usage,
            message: { source: { provider: 'deepseek', model } },
          },
        },
      );
    },
  };
}
