export type Task<T> = () => Promise<T>;

export class TaskQueue {
    private queue: Array<() => Promise<void>> = [];
    private running = 0;
    private concurrency: number;

    constructor(concurrency = 5) {
        this.concurrency = concurrency;
    }

    add<T>(task: Task<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.processNext();
        });
    }

    private async processNext(): Promise<void> {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }

        const nextTask = this.queue.shift();
        if (!nextTask) return;

        this.running++;
        try {
            await nextTask();
        } finally {
            this.running--;
            this.processNext();
        }
    }

    size(): number {
        return this.queue.length;
    }

    isIdle(): boolean {
        return this.running === 0 && this.queue.length === 0;
    }
}
