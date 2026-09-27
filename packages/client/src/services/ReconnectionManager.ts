/**
 * Keeps the server-issued session token so a refresh or dropped connection resumes the same player.
 *
 * Stored in sessionStorage rather than localStorage: it survives reloads of this tab, while each new
 * tab gets its own identity (which also makes it possible to test multiplayer with several tabs).
 */

const SESSION_TOKEN_KEY = 'ryunix_session_token';

export const reconnectionManager = {
    getSessionToken(): string | null {
        try {
            return sessionStorage.getItem(SESSION_TOKEN_KEY);
        } catch {
            return null;
        }
    },

    saveSessionToken(token: string): void {
        try {
            sessionStorage.setItem(SESSION_TOKEN_KEY, token);
        } catch {
            // Storage unavailable (private mode etc.): identity just won't survive a reload
        }
    },
};
