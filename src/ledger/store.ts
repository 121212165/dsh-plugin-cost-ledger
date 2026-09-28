import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseJsonl, toRecord, type LedgerRecord, type LedgerEntryInput } from './record.ts';

/**
 * Persistence is one JSONL file per month (`ledger-2026-09.jsonl`) in a plugin
 * owned directory. JSONL wins over the storage seam for now because it needs no
 * extra composition rows (dsh-storage + backend + storage-domain), and a flat
 * file survives profile reinstalls and is readable by anything. The storage
 * route stays a documented future option.
 */
export class LedgerStore {
  readonly dataDir: string;
  #now: () => Date;

  constructor(dataDir: string | undefined, now: () => Date = () => new Date()) {
    this.dataDir = dataDir ? expandHome(dataDir) : join(homedir(), '.dsh', 'cost-ledger');
    this.#now = now;
  }

  fileFor(at: Date): string {
    const month = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`;
    return join(this.dataDir, `ledger-${month}.jsonl`);
  }

  append(sessionId: string, entry: LedgerEntryInput): LedgerRecord {
    const record = toRecord(sessionId, entry);
    mkdirSync(this.dataDir, { recursive: true });
    appendFileSync(this.fileFor(entry.at), `${JSON.stringify(record)}\n`, 'utf8');
    return record;
  }

  /** Reads every file in the directory; files outside the expected name pattern
   * are ignored rather than attempted. */
  readAll(): ReturnType<typeof parseJsonl> & { records: LedgerRecord[] } {
    const records: LedgerRecord[] = [];
    let skipped = 0;
    if (!existsSync(this.dataDir)) return { records, skipped };
    for (const name of readdirSorted(this.dataDir)) {
      if (!/^ledger-\d{4}-\d{2}\.jsonl$/.test(name)) continue;
      const result = parseJsonl(readFileSync(join(this.dataDir, name), 'utf8'));
      records.push(...result.records);
      skipped += result.skipped;
    }
    return { records, skipped };
  }

  readMonth(month: string): LedgerRecord[] {
    if (!/^\d{4}-\d{2}$/.test(month)) return [];
    const file = join(this.dataDir, `ledger-${month}.jsonl`);
    if (!existsSync(file)) return [];
    return parseJsonl(readFileSync(file, 'utf8')).records;
  }

  writeCsv(path: string, content: string): string {
    mkdirSync(dirnameOf(path), { recursive: true });
    writeFileSync(path, content, 'utf8');
    return path;
  }
}

export function expandHome(dir: string): string {
  return dir.startsWith('~') ? join(homedir(), dir.slice(1)) : dir;
}

function dirnameOf(path: string): string {
  const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return index === -1 ? '.' : path.slice(0, index);
}

function readdirSorted(dir: string): string[] {
  // 13 is not a month: a stray or hand-created file with an impossible month is
  // ignored rather than read, so its garbage lines never pollute the report
  return readdirSync(dir).filter((name) => {
    const match = /^ledger-(\d{4})-(\d{2})\.jsonl$/.exec(name);
    if (!match) return false;
    const month = Number(match[2]);
    return month >= 1 && month <= 12;
  }).sort();
}
