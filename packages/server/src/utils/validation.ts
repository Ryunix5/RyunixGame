import validator from 'validator';
import { ROOM_CONFIG, VALIDATION } from '../constants';

/**
 * Input validation utilities
 * Validates and sanitizes user input
 */

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Validates a player name
 * @param name - Player name to validate
 * @returns Sanitized name
 * @throws ValidationError if invalid
 */
export function validatePlayerName(name: string): string {
    if (!name || typeof name !== 'string') {
        throw new ValidationError('Player name is required');
    }

    // Trim whitespace
    const trimmed = name.trim();

    // Check length
    if (trimmed.length < ROOM_CONFIG.MIN_NAME_LENGTH) {
        throw new ValidationError('Player name is too short');
    }

    if (trimmed.length > ROOM_CONFIG.MAX_NAME_LENGTH) {
        throw new ValidationError(
            `Player name must be ${ROOM_CONFIG.MAX_NAME_LENGTH} characters or less`
        );
    }

    // Check pattern (alphanumeric, spaces, and basic punctuation)
    if (!VALIDATION.NAME_PATTERN.test(trimmed)) {
        throw new ValidationError(
            'Player name contains invalid characters. Only letters, numbers, spaces, and basic punctuation allowed.'
        );
    }

    // Escape HTML to prevent XSS
    return validator.escape(trimmed);
}

/**
 * Validates a room code
 * @param code - Room code to validate
 * @returns Uppercase sanitized room code
 * @throws ValidationError if invalid
 */
export function validateRoomCode(code: string): string {
    if (!code || typeof code !== 'string') {
        throw new ValidationError('Room code is required');
    }

    const upperCode = code.toUpperCase().trim();

    if (!VALIDATION.ROOM_CODE_PATTERN.test(upperCode)) {
        throw new ValidationError(
            `Room code must be exactly ${ROOM_CONFIG.ROOM_CODE_LENGTH} alphanumeric characters`
        );
    }

    return upperCode;
}

/**
 * Validates a chat message
 * @param message - Chat message to validate
 * @returns Sanitized message
 * @throws ValidationError if invalid
 */
export function validateChatMessage(message: string): string {
    if (!message || typeof message !== 'string') {
        throw new ValidationError('Message cannot be empty');
    }

    const trimmed = message.trim();

    if (trimmed.length === 0) {
        throw new ValidationError('Message cannot be empty');
    }

    // Import CHAT_CONFIG dynamically to avoid circular dependency issues
    const maxLength = 500; // From CHAT_CONFIG.MAX_MESSAGE_LENGTH

    if (trimmed.length > maxLength) {
        throw new ValidationError(`Message must be ${maxLength} characters or less`);
    }

    // Escape HTML to prevent XSS
    return validator.escape(trimmed);
}

/**
 * Validates a game ID
 * @param gameId - Game ID to validate
 * @returns Sanitized game ID
 * @throws ValidationError if invalid
 */
export function validateGameId(gameId: string): string {
    if (!gameId || typeof gameId !== 'string') {
        throw new ValidationError('Game ID is required');
    }

    const trimmed = gameId.trim();

    // Game IDs should be kebab-case
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
        throw new ValidationError('Invalid game ID format');
    }

    return trimmed;
}

/**
 * Safely validates input and returns error message instead of throwing
 * @param validator - Validation function
 * @param value - Value to validate
 * @returns Object with valid flag and result or error
 */
export function safeValidate<T>(
    validator: (value: T) => T,
    value: T
): { valid: true; data: T } | { valid: false; error: string } {
    try {
        const data = validator(value);
        return { valid: true, data };
    } catch (error) {
        if (error instanceof ValidationError) {
            return { valid: false, error: error.message };
        }
        return { valid: false, error: 'Validation failed' };
    }
}
