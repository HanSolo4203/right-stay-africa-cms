import { createHash, timingSafeEqual } from 'crypto';

const TOKEN_SALT = 'right-stay-cleaning-live-v1';

export function getCleaningLiveToken(): string {
  const explicit = process.env.CLEANING_LIVE_TOKEN?.trim();
  if (explicit) return explicit;

  const syncSecret = process.env.SYNC_SECRET?.trim();
  if (!syncSecret) {
    throw new Error('CLEANING_LIVE_TOKEN or SYNC_SECRET must be configured for live cleaning links');
  }

  return createHash('sha256')
    .update(`${TOKEN_SALT}:${syncSecret}`)
    .digest('hex')
    .slice(0, 32);
}

export function isValidCleaningLiveToken(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  try {
    const expected = getCleaningLiveToken();
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
