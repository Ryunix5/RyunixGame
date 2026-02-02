import { Logger, LogLevel } from '../logger';

describe('Logger', () => {
    let consoleDebugSpy: jest.SpyInstance;
    let consoleInfoSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleDebugSpy.mockRestore();
        consoleInfoSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('should log debug messages when level is DEBUG', () => {
        const logger = new Logger(LogLevel.DEBUG);
        logger.debug('Test debug message');
        expect(consoleDebugSpy).toHaveBeenCalledWith(
            expect.stringContaining('[DEBUG] Test debug message')
        );
    });

    it('should not log debug messages when level is INFO', () => {
        const logger = new Logger(LogLevel.INFO);
        logger.debug('Test debug message');
        expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when level is INFO', () => {
        const logger = new Logger(LogLevel.INFO);
        logger.info('Test info message');
        expect(consoleInfoSpy).toHaveBeenCalledWith(
            expect.stringContaining('[INFO] Test info message')
        );
    });

    it('should log warnings', () => {
        const logger = new Logger(LogLevel.WARN);
        logger.warn('Test warning');
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[WARN] Test warning')
        );
    });

    it('should log errors with metadata', () => {
        const logger = new Logger(LogLevel.ERROR);
        const error = new Error('Test error');
        logger.error('Error occurred', error);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[ERROR] Error occurred')
        );
    });

    it('should allow changing log level', () => {
        const logger = new Logger(LogLevel.ERROR);
        logger.info('Should not log');
        expect(consoleInfoSpy).not.toHaveBeenCalled();

        logger.setLevel(LogLevel.INFO);
        logger.info('Should log');
        expect(consoleInfoSpy).toHaveBeenCalled();
    });
});
