export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG',
}

export class Logger {
    private prefix: string;

    constructor(prefix: string = 'Checker') {
        this.prefix = prefix;
    }

    private format(level: LogLevel, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${this.prefix}] [${level}]: ${message}`;
    }

    public info(message: string): void {
        console.log(this.format(LogLevel.INFO, message));
    }

    public warn(message: string): void {
        console.warn(this.format(LogLevel.WARN, message));
    }

    public error(message: string, error?: unknown): void {
        console.error(this.format(LogLevel.ERROR, message), error ?? '');
    }

    public debug(message: string): void {
        if (process.env.DEBUG) {
            console.debug(this.format(LogLevel.DEBUG, message));
        }
    }
}

export const logger = new Logger();
