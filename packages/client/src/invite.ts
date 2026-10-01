// Invite links look like https://host/?room=ABC123

const PARAM = 'room';
const CODE_PATTERN = /^[A-Z0-9]{6}$/;

export function inviteLinkFor(roomId: string): string {
    return `${location.origin}/?${PARAM}=${roomId}`;
}

/** The room code from the current URL, if it looks like a valid one. */
export function readInviteCode(): string | null {
    const code = new URLSearchParams(location.search).get(PARAM)?.trim().toUpperCase();
    return code && CODE_PATTERN.test(code) ? code : null;
}

/** Removes the invite from the address bar without reloading (other params, like ?noanim, stay). */
export function clearInviteCode(): void {
    const params = new URLSearchParams(location.search);
    if (!params.has(PARAM)) return;
    params.delete(PARAM);
    const query = params.toString();
    history.replaceState(null, '', location.pathname + (query ? `?${query}` : '') + location.hash);
}
