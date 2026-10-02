/** Assembly-layer harness for cost-ledger: a scripted mock dsh context that the
 * real apply() wires against. Captures command/tool registrations and the
 * session/event listener so tests can drive real usage events into the ledger
 * over a real temp directory. Methodology: dsh-auto-review's mountHarness
 * (222★), node:test port by dsh-plugin-task-forge.
 * @module test/harness */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after } from 'node:test';

export interface CapturedCommand {
  name: string;
  description: string;
  handler: (args: { rawInput?: string }) => { kind: string; text: string } | Promise<{ kind: string; text: string }>;
}

export interface CapturedTool {
  name: string;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export interface CapturedListener {
  event: string;
  callback: (session: unknown, event: unknown) => void;
}

export interface Harness {
  commands: CapturedCommand[];
  tools: CapturedTool[];
  listeners: CapturedListener[];
  dataDir: string;
  apply(config: Record<string, unknown>): Promise<void>;
  command(name: string): CapturedCommand;
  tool(name: string): CapturedTool;
  /** Feed one assistant/message usage event into the real listener. */
  emitUsage(sessionId: string, model: string, usage: Record<string, number>, turn?: number): void;
}

export function makeHarness(): Harness {
  const commands: CapturedCommand[] = [];
  const tools: CapturedTool[] = [];
  const listeners: CapturedListener[] = [];

  const ctx = {
    logger(_name: string) {
      return { info() {}, warn() {}, debug() {} };
    },
    on(event: string, callback: (session: unknown, event: unknown) => void) {
      listeners.push({ event, callback });
    },
    commands: {
      register(definition: CapturedCommand) {
        commands.push(definition);
      },
    },
    tools: {
      register(definition: CapturedTool) {
        tools.push(definition);
      },
    },
  };

  const dataDir = mkdtempSync(join(tmpdir(), 'cost-ledger-wire-'));
  after(() => rmSync(dataDir, { recursive: true, force: true }));

  // apply once per harness — a second call would double-register.
  let applied: Promise<void> | null = null;

  const harness: Harness = {
    commands,
    tools,
    listeners,
    dataDir,
    apply(config: Record<string, unknown>) {
      // Schema defaults (accounting: 'own' etc.) only apply through the host —
      // a direct apply() call gets the plain object, so restate the defaults.
      applied ??= import('../src/plugin.ts').then(({ apply }) => apply(ctx as never, { enabled: true, accounting: 'own', dataDir, ...config } as never));
      return applied;
    },
    command(name: string): CapturedCommand {
      const found = commands.find((candidate) => candidate.name === name);
      if (!found) throw new Error(`command ${name} was never registered`);
      return found;
    },
    tool(name: string): CapturedTool {
      const found = tools.find((candidate) => candidate.name === name);
      if (!found) throw new Error(`tool ${name} was never registered`);
      return found;
    },
    emitUsage(sessionId: string, model: string, usage: Record<string, number>, turn = 1): void {
      const listener = listeners.find((candidate) => candidate.event === 'session/event');
      if (!listener) throw new Error('session/event listener was never registered');
      listener.callback(
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
  return harness;
}
