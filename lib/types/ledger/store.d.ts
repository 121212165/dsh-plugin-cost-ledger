import { parseJsonl, type LedgerRecord, type LedgerEntryInput } from './record.ts';
/**
 * Persistence is one JSONL file per month (`ledger-2026-09.jsonl`) in a plugin
 * owned directory. JSONL wins over the storage seam for now because it needs no
 * extra composition rows (dsh-storage + backend + storage-domain), and a flat
 * file survives profile reinstalls and is readable by anything. The storage
 * route stays a documented future option.
 */
export declare class LedgerStore {
    readonly dataDir: string;
    constructor(dataDir: string | undefined);
    fileFor(at: Date): string;
    append(sessionId: string, entry: LedgerEntryInput): LedgerRecord;
    /** Reads every file in the directory; files outside the expected name pattern
     * are ignored rather than attempted. */
    readAll(): ReturnType<typeof parseJsonl> & {
        records: LedgerRecord[];
    };
    readMonth(month: string): LedgerRecord[];
    writeCsv(path: string, content: string): string;
}
export declare function expandHome(dir: string): string;
//# sourceMappingURL=store.d.ts.map