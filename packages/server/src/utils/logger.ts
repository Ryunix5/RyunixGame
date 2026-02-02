/**
 * Structured logging utility
 * Provides consistent logging across the application
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

class Logger {
    private level: LogLevel;
    private enableColors: boolean;

    constructor(level: LogLevel = LogLevel.INFO, enableColors: boolean = true) {
        this.level = level;
        this.enableColors = enableColors;
    }

    private formatMessage(level: string, message: string, meta?: any): string {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level}] ${message}${metaStr}`;
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.level;
    }

    debug(message: string, meta?: any): void {
        if (!this.shouldLog(LogLevel.DEBUG)) return;
        console.debug(this.formatMessage('DEBUG', message, meta));
    }

    info(message: string, meta?: any): void {
        if (!this.shouldLog(LogLevel.INFO)) return;
        console.info(this.formatMessage('INFO', message, meta));
    }

    warn(message: string, meta?: any): void {
        if (!this.shouldLog(LogLevel.WARN)) return;
        console.warn(this.formatMessage('WARN', message, meta));
    }

    error(message: string, error?: Error | any, meta?: any): void {
        if (!this.shouldLog(LogLevel.ERROR)) return;
        const errorInfo = error instanceof Error
            ? { message: error.message, stack: error.stack, ...meta }
            : { error, ...meta };
        console.error(this.formatMessage('ERROR', message, errorInfo));
    }

    setLevel(level: LogLevel): void {
        this.level = level;
    }
}

// Export singleton instance
export const logger = new Logger(
    process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
);

// Export class for testing
export { Logger };
