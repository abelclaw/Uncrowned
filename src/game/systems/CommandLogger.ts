export interface CommandLogEntry {
    timestamp: number;
    room: string;
    rawInput: string;
    parsed: boolean;
    verb: string | null;
    subject: string | null;
    target: string | null;
}

const STORAGE_KEY = 'uncrowned-command-log';
const FLUSH_THRESHOLD = 10;

/**
 * Logs player commands to localStorage for analytics.
 * Buffer flushes every 10 entries or on explicit flush().
 */
export class CommandLogger {
    private static instance: CommandLogger;
    private buffer: CommandLogEntry[] = [];

    private constructor() {}

    static getInstance(): CommandLogger {
        if (!CommandLogger.instance) {
            CommandLogger.instance = new CommandLogger();
        }
        return CommandLogger.instance;
    }

    log(entry: CommandLogEntry): void {
        this.buffer.push(entry);
        if (this.buffer.length >= FLUSH_THRESHOLD) {
            this.flush();
        }
    }

    flush(): void {
        if (this.buffer.length === 0) return;
        const existing = this.load();
        existing.push(...this.buffer);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
        this.buffer = [];
    }

    export(): CommandLogEntry[] {
        this.flush();
        return this.load();
    }

    clear(): void {
        this.buffer = [];
        localStorage.removeItem(STORAGE_KEY);
    }

    private load(): CommandLogEntry[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }
}
