import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../constants';

/**
 * Rate limiting middleware
 * Protects against abuse and DDoS attacks
 */

/**
 * General API rate limiter
 * Limits requests to API endpoints
 */
export const apiLimiter = rateLimit({
    windowMs: RATE_LIMITS.API_WINDOW_MS,
    max: RATE_LIMITS.API_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive endpoints
 * Used for login, registration, etc.
 */
export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many attempts from this IP, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Socket connection rate limiter
 * Prevents connection spam
 * 
 * Note: Socket.io rate limiting needs to be implemented differently
 * This is a reference for potential HTTP upgrade limiting
 */
export const socketConnectionLimiter = rateLimit({
    windowMs: RATE_LIMITS.SOCKET_WINDOW_MS,
    max: RATE_LIMITS.SOCKET_MAX_CONNECTIONS,
    message: 'Too many connection attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed requests
});
