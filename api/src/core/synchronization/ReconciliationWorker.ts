import { guildStateManager } from "../state/GuildStateManager.js";
import { syncManager } from "./SyncManager.js";

export class ReconciliationWorker {
    private timer: NodeJS.Timeout | null = null;
    private readonly intervalMs: number = 30000;
    private isRunning: boolean = false;

    public start(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(() => {
            void this.reconcile();
        }, this.intervalMs);
    }

    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    public async reconcile(): Promise<string[]> {
        if (this.isRunning) {
            return [];
        }
        this.isRunning = true;
        const reconnectedGuilds: string[] = [];

        try {
            const allMetadata = guildStateManager.getAllGuildMetadata();
            for (const meta of allMetadata) {
                if (meta.status === "STALE" || meta.status === "FAILED") {
                    reconnectedGuilds.push(meta.guildId);
                    syncManager.startSync(meta.guildId);
                }
            }
        } finally {
            this.isRunning = false;
        }

        return reconnectedGuilds;
    }
}

export const reconciliationWorker = new ReconciliationWorker();
