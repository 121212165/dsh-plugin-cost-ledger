import { mkdirSync, readFileSync, appendFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFileAtomic } from '@dsh-family/kit';
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

  constructor(dataDir: string | undefined) {
    this.dataDir = dataDir ? expandHome(dataDir) : join(homedir(), '.dsh', 'cost-ledger');
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
    writeFileAtomic(path, content);
    return path;
  }
}

export function expandHome(dir: string): string {
  return dir.startsWith('~') ? join(homedir(), dir.slice(1)) : dir;
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
